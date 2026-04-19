from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.butler_ops import ButlerOpsService, butler_tools_dispatcher
from app.services.finance_engine import FinanceEngine
from app.services.agent import run_agent
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import uuid
import json
import os
import re
import urllib.request
import urllib.error
from app.core.config import settings

from app.api.deps import get_current_user, get_current_user_optional
from app.models.ledger import UserExt
from app.models.butler import UserButlerProfile

logger = logging.getLogger(__name__)

router = APIRouter()


def _enforce_self(user_id: int, current_user: UserExt) -> None:
    if current_user.user_type in ["admin", "kol"]:
        return
    if int(user_id) != int(current_user.customer_id):
        raise HTTPException(status_code=403, detail="Forbidden")

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: int
    history: List[ChatMessage]
    user_key: Optional[str] = None

class MinimaxChatRequest(BaseModel):
    user_id: Any = None
    messages: Any = []
    context: Any = None
    butler_name: Any = "0Buck Butler"


class AddressPayload(BaseModel):
    name: str
    phone: str
    country: str
    address1: str
    address2: Optional[str] = ""
    city: str
    state: str
    zip: str
    isDefault: Optional[bool] = False


class ProfileSyncPayload(BaseModel):
    active_persona_id: Optional[str] = None
    ui_settings: Optional[Dict[str, Any]] = None


ACTION_WHITELIST = {
    "SET_THEME",
    "SET_LANGUAGE",
    "SET_PERSONA",
    "SET_NOTIFICATIONS",
    "NAVIGATE",
    "CLEAR_LOCAL_CACHE",
}

GUEST_LOGIN_PROMPT_ZH = (
    "👋 欢迎来到 0Buck AI 管家！\n\n"
    "您似乎还未登录。为了给您提供专属的个性化服务、记住您的专属称呼（比如“嘟嘟”😊），并支持查询订单和物流等高级功能，"
    "**请先点击页面右上角的「头像」登录您的 0Buck 账号**。\n\n"
    "*(如果您是从飞书等第三方聊天软件过来进行账号绑定的，请在登录后直接把您的 6 位验证码发送给我哦！)*"
)


def _action_message(action: str, value: str, is_guest: bool) -> str:
    if action == "SET_THEME":
        if str(value).lower() == "dark":
            return "✅ 已为您切换到暗色模式。"
        return "✅ 已为您切换到亮色模式。"
    if action == "NAVIGATE":
        mapping = {
            "orders": "✅ 已为您打开订单中心。",
            "checkout": "✅ 已为您打开支付页面。请在页面中手动确认并完成支付。",
            "reward_history": "✅ 已为您打开签到返现页面。请按页面流程手动完成操作。",
            "address": "✅ 已打开收货地址管理。登录后可为您自动同步和持久化地址变更。" if is_guest else "✅ 已为您打开收货地址管理。",
            "settings": "✅ 已为您打开设置页面。",
            "wallet": "✅ 已为您打开钱包页面。",
        }
        return mapping.get(str(value), "✅ 已为您打开对应页面。")
    if action == "CLEAR_LOCAL_CACHE":
        return "✅ 已为您清理本机缓存。登录后我可以继续帮您同步更多设置。"
    if action == "SET_PERSONA":
        return "✅ 已为您切换管家风格。"
    if action == "SET_LANGUAGE":
        return f"✅ 已为您切换回答语种偏好为：{value}。"
    if action == "SET_NOTIFICATIONS":
        return "✅ 已为您更新通知设置。"
    return "✅ 已为您执行操作。"


def _render_in_language(text_zh: str, language_code: Optional[str]) -> str:
    lang = (language_code or "").strip().lower()
    if not lang or lang.startswith("zh"):
        return text_zh
    # Fast fallback for no-network scenarios.
    fallback_en = "Action completed."
    try:
        translated = _gemini_rest_generate_text(
            system_prompt=(
                "Translate the following Chinese text to the target language.\n"
                "Return translated text only, no explanation.\n"
                f"Target language code: {lang}"
            ),
            user_text=text_zh,
        )
        if translated:
            return translated
    except Exception:
        pass
    return fallback_en if text_zh.startswith("✅") else "Please sign in to continue."


def _render_for_user_text(text_zh: str, user_text: str, language_code: Optional[str]) -> str:
    lang = (language_code or "").strip().lower()
    if lang:
        return _render_in_language(text_zh, lang)
    # If language code not available, ask model to mirror user's language directly.
    translated = _gemini_rest_generate_text(
        system_prompt=(
            "Translate assistant text to the SAME language as the user text. "
            "Return translated text only."
        ),
        user_text=f"USER_TEXT: {user_text}\nASSISTANT_TEXT: {text_zh}",
    )
    return translated or text_zh


async def _infer_system_action_from_ai(user_text: str) -> Optional[Dict[str, str]]:
    if not user_text or not user_text.strip():
        return None
    system_prompt = (
        "You are a multilingual intent-to-action parser.\n"
        "Given user text in ANY language, infer ONE safest UI/system action.\n"
        "Output strict JSON only: {\"action\":\"...\",\"value\":\"...\",\"confidence\":0-1}.\n"
        "Allowed actions:\n"
        "- SET_THEME: dark|light\n"
        "- SET_LANGUAGE: IETF language tag or language name\n"
        "- SET_PERSONA: default|cute_loli|rigorous_expert|friendly_butler\n"
        "- SET_NOTIFICATIONS: true|false\n"
        "- NAVIGATE: orders|checkout|reward_history|address|settings|wallet\n"
        "- CLEAR_LOCAL_CACHE: true\n"
        "If no clear actionable intent, output {\"action\":\"NONE\",\"value\":\"\",\"confidence\":0}.\n"
        "Never invent payment/refund execution; use NAVIGATE for sensitive flows."
    )
    try:
        raw = _gemini_rest_generate_text(system_prompt=system_prompt, user_text=user_text)
        if not raw:
            return None
        if "{" in raw and "}" in raw:
            raw = raw[raw.find("{"): raw.rfind("}") + 1]
        parsed = json.loads(raw)
        action = str(parsed.get("action", "")).strip().upper()
        value = str(parsed.get("value", "")).strip()
        confidence = float(parsed.get("confidence", 0) or 0)
        if action == "NONE" or action not in ACTION_WHITELIST:
            return None
        if confidence < 0.4:
            return None
        if action == "SET_THEME":
            value = value.lower()
            if value not in {"dark", "light"}:
                return None
        if action == "SET_NOTIFICATIONS":
            value = value.lower()
            if value not in {"true", "false"}:
                return None
        if action == "CLEAR_LOCAL_CACHE":
            value = "true"
        return {"action": action, "value": value}
    except Exception as e:
        logger.warning("AI action inference failed: %r", e)
        return None


async def _infer_system_action_via_agent(user_text: str) -> Optional[Dict[str, str]]:
    if not user_text or not user_text.strip():
        return None
    parser_prompt = (
        "Return STRICT JSON only: {\"action\":\"...\",\"value\":\"...\",\"confidence\":0-1}.\n"
        "Infer from user's intent in ANY language.\n"
        "Allowed actions: SET_THEME(dark|light), SET_LANGUAGE(<lang code>), SET_PERSONA(default|cute_loli|rigorous_expert|friendly_butler), "
        "SET_NOTIFICATIONS(true|false), NAVIGATE(orders|checkout|reward_history|address|settings|wallet), CLEAR_LOCAL_CACHE(true).\n"
        "If no clear actionable intent return {\"action\":\"NONE\",\"value\":\"\",\"confidence\":0}.\n"
        f"USER: {user_text}"
    )
    try:
        parsed_resp = await run_agent(content=parser_prompt, user_id=0, session_id="semantic_action_parser")
        raw = (parsed_resp.get("content") or "").strip()
        if "{" in raw and "}" in raw:
            raw = raw[raw.find("{"): raw.rfind("}") + 1]
        obj = json.loads(raw)
        action = str(obj.get("action", "")).strip().upper()
        value = str(obj.get("value", "")).strip()
        confidence = float(obj.get("confidence", 0) or 0)
        if action == "NONE" or action not in ACTION_WHITELIST or confidence < 0.55:
            return None
        return {"action": action, "value": value}
    except Exception as e:
        logger.warning("Agent semantic action parser failed: %r", e)
        return None


async def _infer_reply_language(user_text: str) -> Optional[str]:
    if not user_text or not user_text.strip():
        return None
    try:
        raw = _gemini_rest_generate_text(
            system_prompt=(
                "Detect the user's primary language from input text.\n"
                "Return JSON only: {\"language\":\"<ietf-or-short-code>\",\"confidence\":0-1}.\n"
                "Examples: zh, en, es, fr, de, ja, ko, ar, ru, pt, hi."
            ),
            user_text=user_text,
        )
        if not raw:
            return None
        if "{" in raw and "}" in raw:
            raw = raw[raw.find("{"): raw.rfind("}") + 1]
        try:
            parsed = json.loads(raw)
            lang = str(parsed.get("language", "")).strip()
            conf = float(parsed.get("confidence", 0) or 0)
            if lang and conf >= 0.5:
                return lang
        except Exception:
            pass
        # Fallback: ask for language code only (no JSON contract).
        plain = _gemini_rest_generate_text(
            system_prompt=(
                "Detect user's language. Return ONLY language code, e.g. zh, en, es, ar, fr, de, ja, ko, ru, pt, hi."
            ),
            user_text=user_text,
        ).strip().lower()
        if plain:
            # keep first token-like code
            import re
            m = re.search(r"[a-z]{2,3}(?:-[a-z]{2})?", plain)
            if m:
                return m.group(0)
        return None
    except Exception:
        return None


def _gemini_rest_generate_text(system_prompt: str, user_text: str) -> str:
    import urllib.request
    import json
    api_key = os.getenv("OPENROUTER_API_KEY") or getattr(settings, "OPENROUTER_API_KEY", None) or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return ""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    body = {
        "model": "google/gemini-2.5-flash",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ],
        "temperature": 0
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            choices = payload.get("choices") or []
            if not choices:
                return ""
            content = choices[0].get("message", {}).get("content")
            return str(content).strip() if content is not None else ""
    except Exception as e:
        logger.warning(f"OpenRouter REST request failed: {e}")
        return ""


async def _infer_reply_language_via_agent(user_text: str) -> Optional[str]:
    if not user_text or not user_text.strip():
        return None
    prompt = (
        "Detect user's primary input language. Return STRICT JSON only: "
        "{\"language\":\"<ietf-or-short-code>\",\"confidence\":0-1}.\n"
        f"USER: {user_text}"
    )
    try:
        parsed_resp = await run_agent(content=prompt, user_id=0, session_id="semantic_lang_parser")
        raw = (parsed_resp.get("content") or "").strip()
        if "{" in raw and "}" in raw:
            raw = raw[raw.find("{"): raw.rfind("}") + 1]
        obj = json.loads(raw)
        lang = str(obj.get("language", "")).strip()
        conf = float(obj.get("confidence", 0) or 0)
        if not lang or conf < 0.5:
            return None
        return lang
    except Exception as e:
        logger.warning("Agent language parser failed: %r", e)
        return None


def _fallback_action_from_text(user_text: str) -> Optional[Dict[str, str]]:
    lowered = (user_text or "").lower()
    if any(k in lowered for k in ["暗色", "深色", "dark"]):
        return {"action": "SET_THEME", "value": "dark"}
    if any(k in lowered for k in ["亮色", "浅色", "light"]):
        return {"action": "SET_THEME", "value": "light"}
    if any(k in lowered for k in ["订单", "order"]):
        return {"action": "NAVIGATE", "value": "orders"}
    if any(k in lowered for k in ["支付", "付款", "结算", "pay", "checkout"]):
        return {"action": "NAVIGATE", "value": "checkout"}
    if any(k in lowered for k in ["退款", "退货", "refund"]):
        return {"action": "NAVIGATE", "value": "orders"}
    if any(k in lowered for k in ["签到", "返现", "checkin", "cashback"]):
        return {"action": "NAVIGATE", "value": "reward_history"}
    if any(k in lowered for k in ["地址", "address", "shipping"]):
        return {"action": "NAVIGATE", "value": "address"}
    if any(k in lowered for k in ["清缓存", "清除缓存", "clear cache"]):
        return {"action": "CLEAR_LOCAL_CACHE", "value": "true"}
    return None


def _bridge_translate_to_english(user_text: str) -> str:
    if not user_text:
        return ""
    translated = _gemini_rest_generate_text(
        system_prompt=(
            "Translate user's text to concise English intent phrase. "
            "Return only translated text."
        ),
        user_text=user_text,
    )
    return translated or ""


def _extract_labeled_value(text: str, labels: List[str]) -> Optional[str]:
    import re
    for label in labels:
        pattern = rf"(?:{re.escape(label)})\s*[:：]?\s*([^\n,，;；]+)"
        m = re.search(pattern, text, flags=re.IGNORECASE)
        if m and m.group(1).strip():
            return m.group(1).strip()
    return None


def _parse_address_from_text(text: str) -> Optional[Dict[str, Any]]:
    import re
    if not text:
        return None
    lowered = text.lower()
    if "地址" not in text and "address" not in lowered:
        return None

    name = _extract_labeled_value(text, ["姓名", "收件人", "name"])
    phone = _extract_labeled_value(text, ["电话", "手机号", "手机", "phone"])
    country = _extract_labeled_value(text, ["国家", "country"]) or "CN"
    state = _extract_labeled_value(text, ["省", "州", "state", "province"])
    city = _extract_labeled_value(text, ["市", "城市", "city"])
    zip_code = _extract_labeled_value(text, ["邮编", "zip", "postal"])
    address1 = _extract_labeled_value(text, ["详细地址", "地址", "address"])
    address2 = _extract_labeled_value(text, ["地址2", "补充地址", "address2"]) or ""
    is_default = ("默认" in text and any(k in text for k in ["设为", "设置", "改为"])) or "set default" in lowered

    required = [name, phone, state, city, zip_code, address1]
    if all(required):
        return {
            "name": name,
            "phone": phone,
            "country": country,
            "address1": address1,
            "address2": address2,
            "city": city,
            "state": state,
            "zip": zip_code,
            "isDefault": bool(is_default),
        }

    # Fallback: support natural-language address input without strict labels.
    phone_match = re.search(r"(?:(?:\+?\d{1,3}[- ]?)?\d{11})", text)
    if not phone and phone_match:
        phone = phone_match.group(0).strip()
    zip_match = re.search(r"\b\d{6}\b|\b\d{5}\b", text)
    if not zip_code and zip_match:
        zip_code = zip_match.group(0).strip()

    if not name:
        name = _extract_labeled_value(text, ["联系人", "收货人"]) or _extract_labeled_value(text, ["给", "for"])

    if not state:
        state_match = re.search(r"(北京市|天津市|上海市|重庆市|[^省\s，,]+省|[^自治区\s，,]+自治区)", text)
        if state_match:
            state = state_match.group(1)
    if not city:
        city_match = re.search(r"([^市\s，,]+市)", text)
        if city_match:
            city = city_match.group(1)

    # Municipality fallback (CN): "上海浦东..." style without explicit city/state labels.
    if ("上海" in text or "北京" in text or "天津" in text or "重庆" in text) and (not state or not city):
        if "上海" in text:
            state = state or "上海市"
            city = city or "上海市"
        elif "北京" in text:
            state = state or "北京市"
            city = city or "北京市"
        elif "天津" in text:
            state = state or "天津市"
            city = city or "天津市"
        elif "重庆" in text:
            state = state or "重庆市"
            city = city or "重庆市"

    if not address1:
        addr_match = re.search(r"(?:地址(?:改成|为|是)?|送到|寄到)\s*[:：]?\s*(.+)", text)
        if addr_match:
            raw_addr = addr_match.group(1).strip(" 。")
            # Remove trailing labeled fields captured in free-form sentence.
            raw_addr = re.split(r"[，,]\s*(?:收件人|姓名|电话|手机号|手机|邮编|zip|postal)\b", raw_addr, maxsplit=1, flags=re.IGNORECASE)[0]
            address1 = raw_addr.strip()

    required_fallback = [name, phone, state, city, zip_code, address1]
    if all(required_fallback):
        return {
            "name": name,
            "phone": phone,
            "country": country,
            "address1": address1,
            "address2": address2,
            "city": city,
            "state": state,
            "zip": zip_code,
            "isDefault": bool(is_default),
        }
    return None

@router.post("/chat")
async def proxy_butler_chat(
    request: MinimaxChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[UserExt] = Depends(get_current_user_optional),
):
    """
    v5.7.37: Allow Guest chat to prompt login for binding.
    """
    try:
        # Extract the actual message content
        if not request.messages:
            return {
                "id": f"msg_err_{datetime.now().timestamp()}",
                "role": "assistant",
                "content": "⚠️ 您似乎没有输入任何内容呢。",
                "type": "text"
            }
            
        # Try object access, fallback to dict access
        try:
            last_msg = request.messages[-1].content
        except AttributeError:
            last_msg = request.messages[-1]["content"]

        if not current_user:
            # Guest path must return fast and never depend on external LLM availability.
            guest_lang = "zh" if re.search(r"[\u4e00-\u9fff]", last_msg or "") else "en"
            inferred_action = _fallback_action_from_text(last_msg)
            if inferred_action:
                msg_zh = _action_message(inferred_action["action"], inferred_action["value"], True)
                msg = _render_for_user_text(msg_zh, last_msg, guest_lang)
                return {
                    "id": f"msg_guest_action_{datetime.now().timestamp()}",
                    "choices": [
                        {
                            "message": {
                                "content": msg,
                                "role": "assistant"
                            }
                        }
                    ],
                    "attachments": [
                        {
                            "type": "0B_SYSTEM_ACTION",
                            "action": inferred_action["action"],
                            "payload": {"value": inferred_action["value"]},
                            "requires_confirmation": False
                        }
                    ],
                    "model": "system-guest",
                    "base_resp": {
                        "status_code": 0,
                        "status_msg": "ok"
                    }
                }
            return {
                "id": f"msg_err_{datetime.now().timestamp()}",
                "choices": [
                    {
                        "message": {
                            "content": _render_for_user_text(GUEST_LOGIN_PROMPT_ZH, last_msg, guest_lang),
                            "role": "assistant"
                        }
                    }
                ],
                "model": "system-guest",
                "base_resp": {
                    "status_code": 0,
                    "status_msg": "ok"
                }
            }

        user_id = int(current_user.customer_id)
        
        # Use a consistent session ID for the user's web chat
        session_id = f"web_{user_id}"

        # AI semantic fast-path for safe system actions (multilingual).
        if last_msg:
            parsed_address_preview = _parse_address_from_text(last_msg)
            quick_action = None if parsed_address_preview else await _infer_system_action_from_ai(last_msg)
            if not quick_action and not parsed_address_preview:
                quick_action = await _infer_system_action_via_agent(last_msg)
            if not quick_action and not parsed_address_preview:
                bridged = _bridge_translate_to_english(last_msg)
                if bridged:
                    quick_action = await _infer_system_action_from_ai(bridged) or await _infer_system_action_via_agent(bridged)
            if not quick_action and not parsed_address_preview:
                quick_action = _fallback_action_from_text(last_msg)
            if quick_action:
                quick_msg_zh = _action_message(quick_action["action"], quick_action["value"], False)
                quick_lang = await _infer_reply_language(last_msg)
                if not quick_lang:
                    quick_lang = await _infer_reply_language_via_agent(last_msg)
                quick_msg = _render_in_language(quick_msg_zh, quick_lang)
                return {
                    "id": f"msg_quick_{datetime.now().timestamp()}",
                    "choices": [
                        {
                            "message": {
                                "content": quick_msg,
                                "role": "assistant"
                            }
                        }
                    ],
                    "attachments": [
                        {
                            "type": "0B_SYSTEM_ACTION",
                            "action": quick_action["action"],
                            "payload": {"value": quick_action["value"]},
                            "requires_confirmation": False
                        }
                    ],
                    "model": "system-action",
                    "base_resp": {
                        "status_code": 0,
                        "status_msg": "ok"
                    }
                }
        
        # v5.7.36: Check for Verification Code Binding (Relaxed matching)
        if last_msg:
            # Extract any sequence of exactly 6 alphanumeric characters
            matches = re.findall(r'\b[A-Za-z0-9]{6}\b', last_msg)
            
            for potential_code in matches:
                code_str = potential_code.upper()
                from app.models.butler import BindingCode, UserIMBinding
                
                binding_code = db.query(BindingCode).filter(
                    BindingCode.code == code_str,
                    BindingCode.expires_at > datetime.now()
                ).first()
                
                if binding_code:
                    # Check if already bound
                    existing_binding = db.query(UserIMBinding).filter_by(
                        platform=binding_code.platform,
                        platform_uid=binding_code.platform_uid
                    ).first()
                    
                    if existing_binding:
                        existing_binding.user_id = user_id
                        existing_binding.is_active = True
                    else:
                        new_binding = UserIMBinding(
                            user_id=user_id,
                            platform=binding_code.platform,
                            platform_uid=binding_code.platform_uid,
                            is_active=True
                        )
                        db.add(new_binding)
                    
                    # Delete the used code
                    db.delete(binding_code)
                    db.commit()
                    
                    success_content = (
                        f"✅ 绑定成功！您的 {binding_code.platform.capitalize()} 账号已关联到本平台。\n\n"
                        "绑定后，我能为您提供以下专属服务：\n"
                        "1. 提供更精准的个性化服务和推荐\n"
                        "2. 记住您的偏好和专属称呼\n"
                        "3. 允许您在聊天中直接进行订单、物流等关键信息查询\n\n"
                        "您可以直接在聊天软件中与我对话了！\n\n"
                        "*(如需解除绑定，只需在聊天软件中对我发送「**解绑**」即可)*"
                    )
                    
                    # Best-effort IM push: do not block binding success, but keep failures observable.
                    try:
                        from app.api.im_gateway import send_rich_message
                        await send_rich_message(
                            platform=binding_code.platform,
                            uid=binding_code.platform_uid,
                            text=success_content,
                            title="0Buck AI Brain",
                            link_url=None,
                            lang="zh"
                        )
                    except Exception as e:
                        logger.exception(
                            "Failed to push binding success notification to IM platform=%s uid=%s: %s",
                            binding_code.platform,
                            binding_code.platform_uid,
                            str(e),
                        )
                    
                    return {
                        "id": f"msg_bind_{datetime.now().timestamp()}",
                        "choices": [
                            {
                                "message": {
                                    "content": success_content,
                                    "role": "assistant"
                                }
                            }
                        ],
                        "model": "system-binding",
                        "base_resp": {
                            "status_code": 0,
                            "status_msg": "ok"
                        }
                    }

            # Direct address upsert via chat (structured text) for logged-in users.
            parsed_address = _parse_address_from_text(last_msg)
            if parsed_address:
                profile = _load_or_create_profile(db, user_id)
                addresses = list(profile.personality.get("shipping_addresses", []))
                new_addr = {
                    "id": uuid.uuid4().hex[:10],
                    "name": parsed_address["name"].strip(),
                    "phone": parsed_address["phone"].strip(),
                    "country": parsed_address["country"].strip(),
                    "address1": parsed_address["address1"].strip(),
                    "address2": parsed_address.get("address2", "").strip(),
                    "city": parsed_address["city"].strip(),
                    "state": parsed_address["state"].strip(),
                    "zip": parsed_address["zip"].strip(),
                    "isDefault": bool(parsed_address.get("isDefault")) or len(addresses) == 0,
                    "updatedAt": datetime.now().isoformat(),
                }
                if new_addr["isDefault"]:
                    for item in addresses:
                        item["isDefault"] = False
                addresses.insert(0, new_addr)
                personality = dict(profile.personality or {})
                personality["shipping_addresses"] = addresses
                profile.personality = personality
                db.commit()

                return {
                    "id": f"msg_addr_{datetime.now().timestamp()}",
                    "choices": [
                        {
                            "message": {
                                "content": "✅ 已根据您的聊天内容保存收货地址，并已为您打开地址管理。",
                                "role": "assistant"
                            }
                        }
                    ],
                    "attachments": [
                        {
                            "type": "0B_SYSTEM_ACTION",
                            "action": "NAVIGATE",
                            "payload": {"value": "address"},
                            "requires_confirmation": False
                        }
                    ],
                    "model": "system-address",
                    "base_resp": {
                        "status_code": 0,
                        "status_msg": "ok"
                    }
                }
        
        # Auto-follow user's language for reply (works even for non-preconfigured UI locales).
        reply_lang = await _infer_reply_language(last_msg)
        if not reply_lang:
            reply_lang = await _infer_reply_language_via_agent(last_msg)
        content_for_ai = last_msg
        if reply_lang:
            content_for_ai = (
                f"[SYSTEM_INSTRUCTION] Respond in language: {reply_lang}. "
                f"Keep language consistent unless user asks to switch.\n"
                f"[USER_MESSAGE] {last_msg}"
            )

            # Persist language preference for logged-in users.
            try:
                profile = _load_or_create_profile(db, user_id)
                personality = dict(profile.personality or {})
                ui_settings = personality.get("ui_settings") if isinstance(personality.get("ui_settings"), dict) else {}
                ui_settings["response_language"] = reply_lang
                personality["ui_settings"] = ui_settings
                profile.personality = personality
                db.commit()
            except Exception:
                db.rollback()

        # Run the unified AI brain with failover protection
        response = await run_agent(content=content_for_ai, user_id=user_id, session_id=session_id)
        
        # v5.7.12: Restore MiniMax-compatible format for frontend
        return {
            "id": response.get("id"),
            "choices": [
                {
                    "message": {
                        "content": response["content"],
                        "role": "assistant"
                    }
                }
            ],
            "attachments": response.get("attachments", []),
            "model": response.get("model_name", "gemini-2.5-flash"),
            "base_resp": {
                "status_code": 0,
                "status_msg": "ok"
            }
        }
        
    except Exception as e:
        logger.error(f"🚨 CRITICAL API FAILURE: {str(e)}")
        # Ultimate fallback: Never return a 500, always a polite 200 with error content
        error_msg = "⚠️ 0Buck 智脑正在进行神经网络自愈，请稍等片刻后再与我交谈。我一直都在。"
        # Make the fallback message more helpful if it's an API Key issue that bubbled up
        if "api key" in str(e).lower() or "api_key" in str(e).lower():
            error_msg = "⚠️ 0Buck 智脑连接异常 (API Key 无效或未配置)。请联系系统管理员或在个人设置中配置您自己的大模型 Key。"
        elif "quota" in str(e).lower() or "429" in str(e).lower():
            error_msg = "⚠️ 0Buck 智脑额度已耗尽。请联系系统管理员充值或在个人设置中配置您自己的大模型 Key。"
        elif "user location is not supported" in str(e).lower() or "failedprecondition" in str(e).lower():
            error_msg = "⚠️ 抱歉，当前网络环境/IP 地区被大模型提供商（Google Gemini）限制访问。请尝试开启全局代理或更换节点后重试。"
        elif "minimax" in str(e).lower() or "minimax" in (settings.GEMINI_API_KEY or "").lower():
            # specific handling if the user explicitly switches to a different provider in the UI
            error_msg = f"⚠️ 0Buck 智脑遇到了服务商的连接问题: {str(e)}"
            
        return {
            "id": f"msg_panic_{datetime.now().timestamp()}",
            "choices": [
                {
                    "message": {
                        "content": error_msg,
                        "role": "assistant"
                    }
                }
            ],
            "base_resp": {
                "status_code": 0,
                "status_msg": "panic_recovery"
            }
        }

@router.get("/profile/{user_id}")
async def get_butler_profile(user_id: int, db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    """Fetch AI Butler profile and affinity score."""
    _enforce_self(user_id, current_user)
    ops = ButlerOpsService(db)
    profile = ops.get_reward_status(user_id)
    return profile

@router.post("/settings/{user_id}")
async def update_butler_settings(user_id: int, data: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    """Update Butler name, personality, or BYOK settings."""
    _enforce_self(user_id, current_user)
    ops = ButlerOpsService(db)
    success = ops.update_account_settings(user_id, data)
    return {"status": "success" if success else "failed"}

@router.post("/points/redeem/{user_id}")
async def redeem_renewal(user_id: int, order_id: str = Body(...), phase_id: int = Body(...), db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    """Redeem 3000 points for a renewal card."""
    _enforce_self(user_id, current_user)
    finance = FinanceEngine(db)
    success, message = finance.redeem_renewal_card(user_id, order_id, phase_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

@router.post("/checkin/{user_id}")
async def process_checkin(user_id: int, plan_id: str = Body(...), db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    """Process a daily check-in."""
    _enforce_self(user_id, current_user)
    from app.services.rewards import RewardsService
    rewards = RewardsService(db)
    result = rewards.process_checkin(user_id, plan_id)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/tools/call/{user_id}")
async def call_butler_tool(user_id: int, tool_name: str = Body(...), args: Dict[str, Any] = Body(...), db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    """Execute a Butler tool (Search, Order tracking, etc.)."""
    _enforce_self(user_id, current_user)
    result = await butler_tools_dispatcher(tool_name, user_id, args, db)
    return {"status": "success", "result": result}


@router.post("/profile/sync")
async def sync_profile_settings(
    payload: ProfileSyncPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    user_id = int(current_user.customer_id)
    profile = _load_or_create_profile(db, user_id)

    if payload.active_persona_id:
        profile.active_persona_id = payload.active_persona_id

    if payload.ui_settings and isinstance(payload.ui_settings, dict):
        personality = dict(profile.personality or {})
        current_ui = personality.get("ui_settings") if isinstance(personality.get("ui_settings"), dict) else {}
        current_ui.update(payload.ui_settings)
        personality["ui_settings"] = current_ui
        profile.personality = personality

        # Keep important scalar settings in dedicated columns when possible.
        if current_ui.get("currency"):
            profile.preferred_currency = str(current_ui.get("currency"))

    db.commit()
    return {
        "status": "success",
        "profile": {
            "active_persona_id": profile.active_persona_id,
            "ui_settings": (profile.personality or {}).get("ui_settings", {}),
        },
    }


def _load_or_create_profile(db: Session, user_id: int) -> UserButlerProfile:
    profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
    if not profile:
        profile = UserButlerProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    if not profile.personality or not isinstance(profile.personality, dict):
        profile.personality = {}
    if "shipping_addresses" not in profile.personality or not isinstance(profile.personality.get("shipping_addresses"), list):
        profile.personality["shipping_addresses"] = []
    return profile


@router.get("/addresses")
async def list_addresses(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    user_id = int(current_user.customer_id)
    profile = _load_or_create_profile(db, user_id)
    db.commit()
    return {"status": "success", "addresses": profile.personality.get("shipping_addresses", [])}


@router.post("/addresses")
async def create_address(
    payload: AddressPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    user_id = int(current_user.customer_id)
    profile = _load_or_create_profile(db, user_id)
    addresses = list(profile.personality.get("shipping_addresses", []))

    addr = {
        "id": uuid.uuid4().hex[:10],
        "name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "country": payload.country.strip(),
        "address1": payload.address1.strip(),
        "address2": (payload.address2 or "").strip(),
        "city": payload.city.strip(),
        "state": payload.state.strip(),
        "zip": payload.zip.strip(),
        "isDefault": bool(payload.isDefault) or len(addresses) == 0,
        "updatedAt": datetime.now().isoformat(),
    }

    if addr["isDefault"]:
        for item in addresses:
            item["isDefault"] = False
    addresses.insert(0, addr)
    personality = dict(profile.personality or {})
    personality["shipping_addresses"] = addresses
    profile.personality = personality
    db.commit()
    return {"status": "success", "address": addr, "addresses": addresses}


@router.put("/addresses/{address_id}")
async def update_address(
    address_id: str,
    payload: AddressPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    user_id = int(current_user.customer_id)
    profile = _load_or_create_profile(db, user_id)
    addresses = list(profile.personality.get("shipping_addresses", []))
    target = None
    for item in addresses:
        if item.get("id") == address_id:
            target = item
            break
    if not target:
        raise HTTPException(status_code=404, detail="Address not found")

    target.update({
        "name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "country": payload.country.strip(),
        "address1": payload.address1.strip(),
        "address2": (payload.address2 or "").strip(),
        "city": payload.city.strip(),
        "state": payload.state.strip(),
        "zip": payload.zip.strip(),
        "isDefault": bool(payload.isDefault),
        "updatedAt": datetime.now().isoformat(),
    })
    if target["isDefault"]:
        for item in addresses:
            if item.get("id") != address_id:
                item["isDefault"] = False
    personality = dict(profile.personality or {})
    personality["shipping_addresses"] = addresses
    profile.personality = personality
    db.commit()
    return {"status": "success", "address": target, "addresses": addresses}


@router.delete("/addresses/{address_id}")
async def delete_address(
    address_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    user_id = int(current_user.customer_id)
    profile = _load_or_create_profile(db, user_id)
    addresses = list(profile.personality.get("shipping_addresses", []))
    next_addresses = [item for item in addresses if item.get("id") != address_id]
    if len(next_addresses) == len(addresses):
        raise HTTPException(status_code=404, detail="Address not found")
    if next_addresses and not any(item.get("isDefault") for item in next_addresses):
        next_addresses[0]["isDefault"] = True
    personality = dict(profile.personality or {})
    personality["shipping_addresses"] = next_addresses
    profile.personality = personality
    db.commit()
    return {"status": "success", "addresses": next_addresses}


@router.post("/addresses/{address_id}/default")
async def set_default_address(
    address_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    user_id = int(current_user.customer_id)
    profile = _load_or_create_profile(db, user_id)
    addresses = list(profile.personality.get("shipping_addresses", []))
    found = False
    for item in addresses:
        is_target = item.get("id") == address_id
        item["isDefault"] = is_target
        if is_target:
            item["updatedAt"] = datetime.now().isoformat()
            found = True
    if not found:
        raise HTTPException(status_code=404, detail="Address not found")
    personality = dict(profile.personality or {})
    personality["shipping_addresses"] = addresses
    profile.personality = personality
    db.commit()
    return {"status": "success", "addresses": addresses}

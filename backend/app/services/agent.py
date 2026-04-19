import os
from dotenv import load_dotenv

# Ensure .env is explicitly loaded and overrides shell env vars
load_dotenv(override=True)

from datetime import datetime
import logging
import asyncio
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from app.services.tools import product_search, web_search, supply_library_search, get_order_status, search_coupons, update_butler_settings, trigger_wishing_well, ui_system_action
from app.services.reward_engine import RewardEngine
from app.services.config_service import ConfigService
from app.services.butler_service import ButlerService
from app.services.reflection_service import run_butler_learning
from app.services.feature_flags_service import FeatureFlagService
from app.core.celery_app import celery_app
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.butler import UserButlerProfile
from app.core.security import decrypt_api_key
from app.services.semantic_cache import semantic_cache_service
import random
import time

logger = logging.getLogger(__name__)

# --- Quota-Aware Routing: In-Memory Cooldown Blacklist ---
# In a multi-worker environment, Redis is preferred. Here we use an in-memory dict 
# as a lightweight fallback for cooling down keys that hit 429 Rate Limits.
_KEY_COOLDOWN_BLACKLIST: Dict[str, float] = {}
COOLDOWN_SECONDS = 60.0

def update_exhaustion_metric(total_keys: int):
    """Update Prometheus metric and trigger critical alert if exhaustion > 80%"""
    try:
        from app.main import AI_KEY_EXHAUSTION_RATE
        
        # Clean up expired keys before counting
        current_time = time.time()
        expired_keys = [k for k, v in _KEY_COOLDOWN_BLACKLIST.items() if current_time >= v]
        for k in expired_keys:
            del _KEY_COOLDOWN_BLACKLIST[k]
            
        if total_keys <= 0:
            AI_KEY_EXHAUSTION_RATE.set(0)
            return
            
        blacklisted_count = len(_KEY_COOLDOWN_BLACKLIST)
        rate = float(blacklisted_count) / float(total_keys)
        AI_KEY_EXHAUSTION_RATE.set(rate)
        
        if rate >= 0.8:
            logger.critical(f"[CRITICAL ALERT] AI Key Pool is {rate*100:.1f}% exhausted! ({blacklisted_count}/{total_keys} keys in cooldown). System is at high risk of failure.")
    except Exception as e:
        logger.error(f"Failed to update key exhaustion metric: {e}")

# Define the state of the agent
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    intent: Optional[str]
    confidence: Optional[float]
    query_params: Dict[str, Any]
    search_results: List[Dict[str, Any]]
    order_info: Optional[Dict[str, Any]]
    next_node: str
    locale: Optional[str] # "en", "zh-CN", "es", etc.
    currency: Optional[str] # "USD", "CNY", "EUR", etc.
    user_id: Optional[int]
    is_byok: bool # v3.1: True if using user's own key

# Define the tools
tools = [product_search, web_search, supply_library_search, get_order_status, search_coupons, update_butler_settings, trigger_wishing_well, ui_system_action]
tool_node = ToolNode(tools)


def resolve_user_ai_key(stored_key: Optional[str]) -> Optional[str]:
    if not stored_key:
        return None
    decrypted = decrypt_api_key(stored_key)
    if decrypted:
        return decrypted
    if stored_key.startswith("AIza") or stored_key.startswith("sk-"):
        return stored_key
    return None

def get_dynamic_llm(user_id: int, db: SessionLocal, task_type: str = "chat"):
    """
    v3.3 Dynamic LLM Initialization with OpenRouter Routing.
    Priority: User's BYOK Key > System OpenRouter Key.
    Routing (Economic & Free priority): 
      - 'chat' / 'simple' -> google/gemini-2.0-flash-lite-preview-02-05:free
      - 'reasoning' / 'finance' / 'complex' -> google/gemini-2.0-pro-exp-02-05:free
    """
    config_service = ConfigService(db)
    profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
    
    # Determine target model based on task type (OpenRouter models)
    target_model = "google/gemini-2.5-flash" # Very cheap, capable
    if task_type in ["reasoning", "finance", "complex"]:
        target_model = "anthropic/claude-3.5-sonnet" # Top tier for complex tasks
        
    user_key = resolve_user_ai_key(profile.ai_api_key if profile else None)
    if user_key:
        if user_key.startswith("sk-or-"):
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=target_model,
                api_key=user_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0
            ), True
        elif user_key.startswith("sk-"):
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="abab6.5s-chat",
                api_key=user_key,
                base_url=os.getenv("OPENAI_API_BASE", "https://api.minimax.chat/v1"),
                temperature=0
            ), True
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=user_key,
            temperature=0
        ), True
    
    # Use System Key (Subsidy) - Prefer OPENROUTER
    system_key = config_service.get_api_key("OPENROUTER_API_KEY")
    if not system_key:
        system_key = config_service.get_api_key("MINIMAX_API_KEY") or config_service.get_api_key("GEMINI_API_KEY")
        
    if not system_key:
        from dotenv import load_dotenv
        load_dotenv(override=True)
        system_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("MINIMAX_API_KEY") or os.getenv("GEMINI_API_KEY")
        
    if not system_key or len(system_key) < 10:
        logger.error("No valid system API_KEY found.")
        system_key = "dummy_key_to_prevent_crash"
    
    if system_key.startswith("sk-or-"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=target_model,
            api_key=system_key,
            base_url="https://openrouter.ai/api/v1",
            temperature=0
        ), False
    elif system_key.startswith("sk-"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model="abab6.5s-chat",
            api_key=system_key,
            base_url=os.getenv("OPENAI_API_BASE", "https://api.minimax.chat/v1"),
            temperature=0
        ), False

    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=system_key,
        temperature=0
    ), False

# Define the Supervisor/Router node
async def supervisor(state: AgentState):
    """
    v3.2 Persona OS Supervisor:
    1. Assemble 3-Layer Prompt (Enforcement + Strategy + Surface)
    2. Route to tools or respond directly with Failover Support.
    """
    user_id = state.get("user_id")
    
    db = SessionLocal()
    try:
        butler_service = ButlerService(db)
        last_user_msg = ""
        for m in reversed(state["messages"]):
            if m.type == "human":
                last_user_msg = m.content
                break

        system_prompt = await butler_service.assemble_persona_prompt(user_id, last_user_msg)
        
        if last_user_msg:
            c2m_guidance = await butler_service.get_c2m_guidance_prompt(user_id, last_user_msg)
            system_prompt += f"\n\n{c2m_guidance}"
        
        locale = state.get("locale", "en")
        currency = state.get("currency", "USD")
        system_prompt += f"\n\n### Current Context\n- Locale: {locale}\n- Currency: {currency}\n- Response Language: CRITICAL: You MUST respond in the EXACT SAME LANGUAGE as the user's last message. If the user speaks Chinese, you MUST reply in Chinese. If the user speaks English, you MUST reply in English."

        config_service = ConfigService(db)
        flags = FeatureFlagService(config_service)

        model_tier = ["google/gemini-2.5-flash"]
        
        # Dynamic Routing based on intent/task complexity
        is_complex = False
        if last_user_msg:
            complex_keywords = ["refund", "money", "order", "status", "why", "explain", "退款", "钱", "订单", "为什么", "解释"]
            if any(kw in last_user_msg.lower() for kw in complex_keywords):
                is_complex = True
                
        if is_complex and flags.enabled("ff.ai.enable_pro_routing", subject=str(user_id), default=True):
            model_tier = ["anthropic/claude-3.5-sonnet", "google/gemini-2.5-flash"] # Try Pro first for complex tasks
        elif flags.enabled("ff.ai.enable_pro_fallback", subject=str(user_id), default=True):
            model_tier.append("anthropic/claude-3.5-sonnet") # Flash first, fallback to Pro
            
        last_error = None
        profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
        user_api_key = resolve_user_ai_key(profile.ai_api_key if profile else None)
        
        # --- API Key Pool Logic ---
        # If user has BYOK, use it exclusively. Otherwise, pick randomly from the system key pool.
        api_keys_to_try = []
        if user_api_key:
            api_keys_to_try = [user_api_key]
        else:
            raw_pool = config_service.get_api_key("OPENROUTER_API_KEY") or config_service.get_api_key("MINIMAX_API_KEY") or config_service.get_api_key("GEMINI_API_KEYS") or config_service.get_api_key("GEMINI_API_KEY") or config_service.get_api_key("GOOGLE_API_KEY")
            if not raw_pool:
                from dotenv import load_dotenv
                load_dotenv()
                raw_pool = os.getenv("OPENROUTER_API_KEY") or os.getenv("MINIMAX_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                
            if raw_pool:
                # Support comma-separated keys for pooling
                api_keys_to_try = [k.strip() for k in raw_pool.split(",") if k.strip()]
                import random
                random.shuffle(api_keys_to_try) # Randomize/Round-robin effect
            else:
                api_keys_to_try = [""] # Fallback to empty to trigger standard auth error

        success = False
        for model_name in model_tier:
            if success: break
            
            for api_key in api_keys_to_try:
                # Check cooldown blacklist
                if api_key in _KEY_COOLDOWN_BLACKLIST:
                    if time.time() < _KEY_COOLDOWN_BLACKLIST[api_key]:
                        logger.info(f"⏭️ Skipping key {api_key[-4:] if api_key else 'None'} as it is in cooldown.")
                        continue
                    else:
                        # Cooldown expired, remove from blacklist
                        del _KEY_COOLDOWN_BLACKLIST[api_key]
                        update_exhaustion_metric(len(api_keys_to_try))
                        
                try:
                    # Implement simple Exponential Backoff for 429
                    max_retries = 2
                    for attempt in range(max_retries):
                        try:
                            # v5.7.38: Temporary strict override to ensure .env key is used if api_key is somehow empty
                            if not api_key or len(api_key) < 10:
                                from dotenv import load_dotenv
                                load_dotenv(override=True) # Force load .env over shell
                                api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                                
                            if not api_key:
                                raise Exception("API Key not found in any environment variable or database.")
                                
                            if api_key.startswith("sk-or-"):
                                from langchain_openai import ChatOpenAI
                                llm = ChatOpenAI(
                                    model=model_name,
                                    api_key=api_key,
                                    base_url="https://openrouter.ai/api/v1",
                                    temperature=0
                                )
                            elif api_key.startswith("sk-"):
                                from langchain_openai import ChatOpenAI
                                minimax_base_url = os.getenv("OPENAI_API_BASE", "https://api.minimax.chat/v1")
                                llm = ChatOpenAI(
                                    model="abab6.5s-chat",
                                    api_key=api_key,
                                    base_url=minimax_base_url,
                                    temperature=0
                                )
                            else:
                                llm = ChatGoogleGenerativeAI(
                                    model="gemini-2.0-flash" if "flash" in model_name else "gemini-2.0-pro-exp-02-05",
                                    google_api_key=api_key,
                                    temperature=0
                                )
                                
                            llm_with_tools = llm.bind_tools(tools)
                            messages = [SystemMessage(content=system_prompt)] + state["messages"]
                            response = await llm_with_tools.ainvoke(messages)
                            
                            # If we reached here, it succeeded!
                            logger.info(f"✅ AI Success using model: {model_name}, pool_index: {api_keys_to_try.index(api_key)}")
                            
                            # Tag the response with the model used for usage tracking
                            response.response_metadata = response.response_metadata or {}
                            response.response_metadata["model_used"] = model_name
                            success = True
                            break # Break retry loop
                            
                        except Exception as inner_e:
                            error_msg = str(inner_e).lower()
                            if "429" in error_msg or "too many requests" in error_msg or "quota" in error_msg:
                                if attempt < max_retries - 1:
                                    logger.warning(f"⚠️ 429 Rate Limit on model {model_name}. Retrying in {2 ** attempt}s...")
                                    await asyncio.sleep(2 ** attempt)
                                    continue
                                else:
                                    # Exhausted retries, put key in cooldown blacklist
                                    if api_key and not user_api_key: # Don't blacklist BYOK
                                        _KEY_COOLDOWN_BLACKLIST[api_key] = time.time() + COOLDOWN_SECONDS
                                        logger.error(f"🚫 Key ending in {api_key[-4:] if api_key else 'None'} hit 429 too many times. Put in cooldown for {COOLDOWN_SECONDS}s.")
                                        # Update metric after blacklisting
                                        update_exhaustion_metric(len(api_keys_to_try))
                                    raise inner_e # Re-raise if not 429 or out of retries
                            elif "api_key_invalid" in error_msg or "api key not found" in error_msg:
                                # v5.7.38: Explicitly catch API Key invalid errors so they don't get swallowed as standard retries
                                logger.error(f"🚨 API Key Invalid Error for key ending in {api_key[-4:] if api_key else 'None'}: {str(inner_e)}")
                                raise Exception(f"API_KEY_ERROR: {str(inner_e)}")
                            else:
                                # Not a 429, don't retry this specific key
                                raise inner_e
                            
                    if success:
                        break # Break key loop
                        
                except Exception as e:
                    last_error = e
                    logger.warning(f"⚠️ Model {model_name} with key ending in {api_key[-4:] if api_key else 'None'} failed: {str(e)}. Trying next key/model...")
                    # Fast fail if it's an API Key error instead of pointlessly iterating over all models with a broken key
                    if "api_key_error" in str(e).lower() or "api key not found" in str(e).lower():
                         break # Break key loop, let the outer fallback handle it
                    continue
                    
        if not success:
            # All models and all keys failed
            logger.error(f"❌ AI Agent Execution Error (Final Fallback): {str(last_error)}")
            # Instead of returning a message here that LangGraph might swallow or misinterpret
            # Raise an explicit exception so the outer `process_chat` try/except catches it
            raise Exception(f"API_KEY_ERROR: {str(last_error)}")

    finally:
        db.close()
    
    # --- v3.5.0 AI Safety Sandbox: Enforce user_id in tool calls ---
    if response.tool_calls:
        new_tool_calls = []
        for tc in response.tool_calls:
            # If the tool takes a user_id, overwrite it with the verified user_id from state
            if "user_id" in tc["args"]:
                tc["args"]["user_id"] = user_id
            # Special case for tools that SHOULD have user_id but the LLM forgot or hallucinated
            # We can't easily check the tool signature here without importing them, 
            # but we know which tools in tools.py need user_id.
            if tc["name"] in ["get_order_status", "search_coupons", "update_butler_settings", "trigger_wishing_well"]:
                tc["args"]["user_id"] = user_id
            new_tool_calls.append(tc)
        
        # Create a new response with the modified tool calls
        from langchain_core.messages import AIMessage
        safe_response = AIMessage(
            content=response.content,
            tool_calls=new_tool_calls,
            id=response.id
        )
        return {"messages": [safe_response], "next_node": "tools"}
    
    return {"messages": [response], "next_node": END}

# Define the Output Formatter node
async def output_formatter(state: AgentState):
    """
    Format the final response into structured JSON for the Next.js frontend.
    """
    last_message = state["messages"][-1]
    
    # If the last message is from a tool, we need to generate a final response
    if last_message.type == "tool":
        system_prompt = (
            "You are the 0buck Output Formatter. Take the search results or order info "
            "and format them into a user-friendly response. "
            "If you found products, summarize them and indicate you are showing them. "
            "Always include a 'type' field in your structured output."
        )
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        # Use dynamic fallback instead of hardcoded llm
        try:
            from app.services.agent import get_dynamic_llm
            from app.db.session import SessionLocal
            db = SessionLocal()
            try:
                fallback_llm, _ = get_dynamic_llm(user_id=state.get("user_id", 0), db=db)
                
                # Check if it's a Minimax LLM and we need to pass a system prompt differently
                # Minimax via ChatOpenAI often requires system prompt to be in a certain format or handles bind_tools differently,
                # but for simple output formatting, ainvoke with [SystemMessage, ...] is usually fine.
                response = await fallback_llm.ainvoke(messages)
                return {"messages": [response]}
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Output Formatter LLM error: {e}")
            from langchain_core.messages import AIMessage
            return {"messages": [AIMessage(content="✅ 操作已完成！(The action was completed successfully)")]}
    
    return {}

# Build the graph
def create_agent_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("supervisor", supervisor)
    workflow.add_node("tools", tool_node)
    
    # Set entry point
    workflow.set_entry_point("supervisor")
    
    # Add edges
    workflow.add_conditional_edges(
        "supervisor",
        lambda x: x["next_node"],
        {
            "tools": "tools",
            END: END
        }
    )
    
    workflow.add_edge("tools", "supervisor")
    
    # Compile with memory for state persistence
    return workflow.compile(checkpointer=MemorySaver())

# Instantiate the graph
agent_executor = create_agent_graph()

from app.services.shield_service import ShieldService
from app.models.butler import AIUsageStats

async def run_agent(content: str, user_id: int, session_id: str = "default"):
    """
    v3.2 Enhanced Agent Execution Loop:
    1. Apply Shield Proxy (Zone 2) for data isolation.
    2. Execute Agent with 3-Layer Persona OS.
    3. Track Token Economics in ai_usage_stats.
    4. Trigger Async Reflection for Persona Evolution.
    """
    db = SessionLocal()
    try:
        shield = ShieldService(db)
        rewards = RewardEngine(db)
        
        # 1. Dynamic LLM Selection
        llm, is_byok = get_dynamic_llm(user_id, db)
        
        # 2. Prepare Initial State (v3.2: Context includes locale/currency)
        profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
        initial_state = {
            "messages": [HumanMessage(content=content)],
            "query_params": {},
            "search_results": [],
            "user_id": user_id,
            "is_byok": is_byok,
            "locale": profile.detected_country if profile else "en",
            "currency": profile.preferred_currency if profile else "USD",
            "next_node": "supervisor"
        }
        
        config = {"configurable": {"thread_id": session_id}}
        
        # 2.5 Semantic Cache Check (Only for non-BYOK, simple text-only queries to save costs)
        # Action-oriented intents should bypass cache to avoid "text says done but action missing".
        lowered_content = content.lower()
        is_complex = any(kw in lowered_content for kw in ["refund", "money", "order", "status", "为什么", "退款", "订单"])
        is_action_intent = any(
            kw in lowered_content
            for kw in [
                "theme", "light", "dark", "language", "currency", "notification", "navigate", "settings",
                "亮色", "暗色", "主题", "语言", "货币", "通知", "切换", "设置", "去到", "打开"
            ]
        )
        
        if not is_byok and not is_complex and not is_action_intent:
            cached = await semantic_cache_service.get_cache(query=content, threshold=0.95, max_age_seconds=600)
            if cached and cached.get("response"):
                logger.info(f"⚡ Semantic Cache Hit for user {user_id} (Score: {cached['score']:.4f}). Returning cached response.")
                return {
                    "id": f"msg_cache_{datetime.now().timestamp()}",
                    "role": "assistant",
                    "content": cached["response"],
                    "type": "text",
                    "is_byok": is_byok,
                    "attachments": []
                }
        
        # 3. Run the LangGraph Agent
        try:
            # v5.7.3: Added explicit timeout to prevent hanging
            final_state = await asyncio.wait_for(
                agent_executor.ainvoke(initial_state, config=config),
                timeout=45.0
            )
        except asyncio.TimeoutError:
            logger.error(f"❌ AI Agent Timeout for session {session_id}")
            return {
                "id": f"msg_err_{datetime.now().timestamp()}",
                "role": "assistant",
                "content": "⚠️ 抱歉，0Buck 智脑响应超时，请稍后再试。",
                "type": "text",
                "is_byok": is_byok
            }
        except Exception as e:
            import traceback
            logger.error(f"❌ AI Agent Execution Error (Final Fallback): {str(e)}\n{traceback.format_exc()}")
            # Bubble up specific errors like location restriction or quota
            error_str = str(e).lower()
            if "user location is not supported" in error_str or "failedprecondition" in error_str:
                raise e
            elif "quota" in error_str or "429" in error_str:
                raise e
            elif "api key" in error_str or "api_key" in error_str:
                error_msg = "⚠️ 0Buck 智脑连接异常 (API Key 无效或未配置)。请联系系统管理员或在个人设置中配置您自己的大模型 Key。"
            elif "minimax" in error_str or "minimax" in settings.GEMINI_API_KEY.lower():
                raise e
            else:
                error_msg = "⚠️ 0Buck 智脑正在进行深度进化，暂时无法处理该请求。请尝试更换问题或稍后再试，我会一直守护您的生意。"
                
            return {
                "id": f"msg_panic_{datetime.now().timestamp()}",
                "role": "assistant",
                "content": error_msg,
                "type": "text",
                "is_byok": is_byok
            }

        last_msg = final_state["messages"][-1]
        
        # 3.5. Extract System Actions from Tool Messages
        attachments = []
        for m in reversed(final_state["messages"]):
            if m.type == "human":
                break
            if m.type == "tool":
                try:
                    import json
                    parsed = json.loads(m.content)
                    if "__system_action__" in parsed:
                        attachments.append(parsed["__system_action__"])
                except Exception:
                    pass

        # Safety fallback:
        # If the model responds with a clear settings intent but fails to emit a tool action,
        # synthesize deterministic system actions to keep "say == do".
        if not attachments:
            lowered = content.lower()
            has_switch_verb = any(kw in lowered for kw in ["switch", "set", "turn", "use", "go to", "open", "enable", "disable", "切换", "设置", "改成", "换成", "启用", "开启", "关闭", "去", "打开"])

            # 1) Theme
            has_theme_keyword = any(kw in lowered for kw in ["theme", "light", "dark", "亮色", "暗色", "浅色", "深色", "主题"])
            if has_theme_keyword and has_switch_verb:
                if any(kw in lowered for kw in ["light", "亮色", "浅色"]):
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "SET_THEME",
                        "payload": {"value": "light"},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized fallback SET_THEME=light for user=%s", user_id)
                elif any(kw in lowered for kw in ["dark", "暗色", "深色"]):
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "SET_THEME",
                        "payload": {"value": "dark"},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized fallback SET_THEME=dark for user=%s", user_id)

            # 2) Language
            has_language_keyword = any(kw in lowered for kw in ["language", "lang", "语言", "中文", "英文", "english", "chinese"])
            if not attachments and has_language_keyword and has_switch_verb:
                language_value = None
                if any(kw in lowered for kw in ["中文", "chinese", "zh", "zh-cn"]):
                    language_value = "zh"
                elif any(kw in lowered for kw in ["英文", "english", "en"]):
                    language_value = "en"
                if language_value:
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "SET_LANGUAGE",
                        "payload": {"value": language_value},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized fallback SET_LANGUAGE=%s for user=%s", language_value, user_id)

            # 3) Currency
            has_currency_keyword = any(kw in lowered for kw in ["currency", "货币", "usd", "cny", "eur", "gbp", "jpy"])
            if not attachments and has_currency_keyword and has_switch_verb:
                currency_value = None
                for code in ["usd", "cny", "eur", "gbp", "jpy"]:
                    if code in lowered:
                        currency_value = code.upper()
                        break
                if currency_value:
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "SET_CURRENCY",
                        "payload": {"value": currency_value},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized fallback SET_CURRENCY=%s for user=%s", currency_value, user_id)

            # 4) Notifications
            has_notification_keyword = any(kw in lowered for kw in ["notification", "通知", "提醒"])
            if not attachments and has_notification_keyword and has_switch_verb:
                notify_value = None
                if any(kw in lowered for kw in ["enable", "on", "打开", "开启", "启用"]):
                    notify_value = "true"
                elif any(kw in lowered for kw in ["disable", "off", "关闭", "禁用"]):
                    notify_value = "false"
                if notify_value is not None:
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "SET_NOTIFICATIONS",
                        "payload": {"value": notify_value},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized fallback SET_NOTIFICATIONS=%s for user=%s", notify_value, user_id)

            # 4.5) Clear Local Cache
            has_cache_keyword = any(kw in lowered for kw in ["clear cache", "cache", "缓存", "清缓存", "清除缓存", "清理缓存"])
            if not attachments and has_cache_keyword and has_switch_verb:
                attachments.append({
                    "type": "0B_SYSTEM_ACTION",
                    "action": "CLEAR_LOCAL_CACHE",
                    "payload": {"value": "true"},
                    "requires_confirmation": False
                })
                logger.info("🛟 Synthesized fallback CLEAR_LOCAL_CACHE for user=%s", user_id)

            # 5) Sensitive flows: open relevant page directly even without explicit "open".
            if not attachments:
                if any(kw in lowered for kw in ["支付", "付款", "结算", "pay", "checkout"]):
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "NAVIGATE",
                        "payload": {"value": "checkout"},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized sensitive NAVIGATE=checkout for user=%s", user_id)
                elif any(kw in lowered for kw in ["退款", "退货", "refund", "cancel order", "取消订单"]):
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "NAVIGATE",
                        "payload": {"value": "orders"},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized sensitive NAVIGATE=orders for user=%s", user_id)
                elif any(kw in lowered for kw in ["签到", "返现", "checkin", "cashback"]):
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "NAVIGATE",
                        "payload": {"value": "reward_history"},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized sensitive NAVIGATE=reward_history for user=%s", user_id)

            # 6) Navigate (common drawers only)
            has_navigation_keyword = any(kw in lowered for kw in ["go to", "open", "navigate", "进入", "去", "打开"])
            if not attachments and has_navigation_keyword:
                nav_map = {
                    "订单": "orders",
                    "order": "orders",
                    "物流": "orders",
                    "收货地址": "address",
                    "地址": "address",
                    "address": "address",
                    "shipping": "address",
                    "签到": "reward_history",
                    "checkin": "reward_history",
                    "返现": "reward_history",
                    "cashback": "reward_history",
                    "支付": "checkout",
                    "付款": "checkout",
                    "结算": "checkout",
                    "pay": "checkout",
                    "checkout": "checkout",
                    "退款": "orders",
                    "退货": "orders",
                    "refund": "orders",
                    "设置": "settings",
                    "setting": "settings",
                    "钱包": "wallet",
                    "wallet": "wallet",
                    "提现": "withdraw",
                    "withdraw": "withdraw"
                }
                target = None
                for kw, value in nav_map.items():
                    if kw in lowered:
                        target = value
                        break
                if target:
                    attachments.append({
                        "type": "0B_SYSTEM_ACTION",
                        "action": "NAVIGATE",
                        "payload": {"value": target},
                        "requires_confirmation": False
                    })
                    logger.info("🛟 Synthesized fallback NAVIGATE=%s for user=%s", target, user_id)
        
        # 4. Token Economics & Usage Tracking (v3.2)
        if hasattr(last_msg, "response_metadata"):
            usage = last_msg.response_metadata.get("token_usage", {})
            tokens_in = usage.get("prompt_tokens", 0)
            tokens_out = usage.get("completion_tokens", 0)
            model_used = last_msg.response_metadata.get("model_used", "gemini-2.5-flash")
            
            # Log to ai_usage_stats
            usage_stat = AIUsageStats(
                user_id=user_id,
                task_type="chat",
                model_name=model_used, # Use actual model
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                cost_usd=(tokens_in * 0.0000035) + (tokens_out * 0.0000105), # Est. Pro pricing
                session_id=session_id
            )
            db.add(usage_stat)
            
            # Track for BYOK Rewards (v3.1)
            if is_byok and (tokens_in + tokens_out) > 0:
                rewards.track_token_usage(user_id, tokens_in + tokens_out, "pro")
        
        db.commit()
        
        # 5. Trigger Async Reflection (v3.2 Evolution) & Update Semantic Cache
        if not is_byok and not is_complex and not attachments:
            # Cache the successful plain-text response
            asyncio.create_task(semantic_cache_service.set_cache(query=content, response=last_msg.content))
            
        # v5.7.3: Use a fresh session for the background learning task to avoid 'Session closed' errors
        history_dicts = []
        for m in final_state["messages"]:
            role = "assistant" if m.type == "ai" else "user"
            history_dicts.append({"role": role, "content": m.content})
        
        async def background_learning():
            new_db = SessionLocal()
            try:
                await run_butler_learning(history_dicts, user_id, new_db)
            finally:
                new_db.close()
                
        if settings.CELERY_ENABLED:
            try:
                celery_app.send_task("butler_learning", args=[history_dicts, user_id])
            except Exception:
                asyncio.create_task(background_learning())
        else:
            asyncio.create_task(background_learning())
                
        return {
            "id": f"msg_ai_{datetime.now().timestamp()}",
            "role": "assistant",
            "content": last_msg.content,
            "type": "text",
            "is_byok": is_byok,
            "attachments": attachments
        }
    finally:
        db.close()

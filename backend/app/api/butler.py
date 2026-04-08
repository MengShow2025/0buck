from fastapi import APIRouter, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.butler_ops import ButlerOpsService, butler_tools_dispatcher
from app.services.finance_engine import FinanceEngine
from app.services.agent import run_agent
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import asyncio
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

from app.models.butler import UserButlerProfile, BindingCode, UserIMBinding

router = APIRouter()

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
    butler_name: Any = "0Buck Butler"

@router.post("/chat")
async def proxy_butler_chat(request: MinimaxChatRequest, db: Session = Depends(get_db)):
    """
    v5.7.11: Zero-Error Proxy Policy.
    Ensures all errors are caught and returned as user-friendly messages.
    """
    try:
        user_id = 1
        if request.user_id:
            try:
                user_id = int(request.user_id)
            except (ValueError, TypeError):
                user_id = 1
        
        # Determine the user's name if available
        profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
        user_nickname = profile.user_nickname if profile and profile.user_nickname else "主人"
        
        # Use a consistent session ID for the user's web chat
        session_id = f"web_{user_id}"
        
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
            
        # --- 2. REVERSE BINDING (v5.7.37) ---
        # If user is logged in and sends a 6-digit code (alone or in a sentence), try to bind!
        # This supports the "Copy-Paste Sentence" flow.
        import re
        code_match = re.search(r'\b(\d{6})\b', last_msg)
        
        if user_id > 1 and code_match:
            code = code_match.group(1)
            pending = db.query(BindingCode).filter_by(code=code).first()
            
            if pending and pending.expires_at > datetime.now():
                # Perform the binding
                existing = db.query(UserIMBinding).filter_by(platform=pending.platform, platform_uid=pending.platform_uid).first()
                if existing:
                    existing.user_id = user_id
                    existing.is_active = True
                else:
                    db.add(UserIMBinding(user_id=user_id, platform=pending.platform, platform_uid=pending.platform_uid, is_active=True))
                
                # Cleanup
                db.delete(pending)
                db.commit()
                
                logger.info(f"✨ CHAT BINDING SUCCESS: {pending.platform} linked to User {user_id} via pattern match")
                
                return {
                    "id": f"msg_bind_{datetime.now().timestamp()}",
                    "choices": [{
                        "message": {
                            "content": f"✨ 身份同步成功！我已经识别了您的指令，并将您的 {pending.platform} 账号与 0Buck 账户成功关联。现在您可以两端同步享受我的服务了，主人！",
                            "role": "assistant"
                        }
                    }],
                    "base_resp": {"status_code": 0, "status_msg": "ok"}
                }
        
        # 3. Run the unified AI brain with failover protection
        response = await run_agent(content=last_msg, user_id=user_id, session_id=session_id)
        
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
            "model": response.get("model_name", "gemini-2.0-flash"),
            "base_resp": {
                "status_code": 0,
                "status_msg": "ok"
            }
        }
        
    except Exception as e:
        logger.error(f"🚨 CRITICAL API FAILURE: {str(e)}")
        # Ultimate fallback: Never return a 500, always a polite 200 with error content
        return {
            "id": f"msg_panic_{datetime.now().timestamp()}",
            "choices": [
                {
                    "message": {
                        "content": "⚠️ 0Buck 智脑正在进行神经网络自愈，请稍等片刻后再与我交谈。我一直都在。",
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
async def get_butler_profile(user_id: int, db: Session = Depends(get_db)):
    """Fetch AI Butler profile and affinity score."""
    ops = ButlerOpsService(db)
    profile = ops.get_reward_status(user_id)
    return profile

@router.post("/settings/{user_id}")
async def update_butler_settings(user_id: int, data: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Update Butler name, personality, or BYOK settings."""
    ops = ButlerOpsService(db)
    success = ops.update_account_settings(user_id, data)
    return {"status": "success" if success else "failed"}

@router.post("/points/redeem/{user_id}")
async def redeem_renewal(user_id: int, order_id: str = Body(...), phase_id: int = Body(...), db: Session = Depends(get_db)):
    """Redeem 3000 points for a renewal card."""
    finance = FinanceEngine(db)
    success, message = finance.redeem_renewal_card(user_id, order_id, phase_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"status": "success", "message": message}

@router.post("/checkin/{user_id}")
async def process_checkin(user_id: int, plan_id: str = Body(...), db: Session = Depends(get_db)):
    """Process a daily check-in."""
    from app.services.rewards import RewardsService
    rewards = RewardsService(db)
    result = rewards.process_checkin(user_id, plan_id)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.post("/tools/call/{user_id}")
async def call_butler_tool(user_id: int, tool_name: str = Body(...), args: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Execute a Butler tool (Search, Order tracking, etc.)."""
    result = await butler_tools_dispatcher(tool_name, user_id, args, db)
    return {"status": "success", "result": result}

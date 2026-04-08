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

from app.models.butler import UserButlerProfile

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
        
        # Run the unified AI brain with failover protection
        response = await run_agent(content=last_msg, user_id=user_id, session_id=session_id)
        return response
        
    except Exception as e:
        logger.error(f"🚨 CRITICAL API FAILURE: {str(e)}")
        # Ultimate fallback: Never return a 500, always a polite 200 with error content
        return {
            "id": f"msg_panic_{datetime.now().timestamp()}",
            "role": "assistant",
            "content": "⚠️ 0Buck 智脑正在进行神经网络自愈，请稍等片刻后再与我交谈。我一直都在。",
            "type": "text"
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

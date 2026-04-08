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
from app.core.config import settings

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
    v5.7.2 Superpowers Unified AI: 
    Routes all web-based AI requests through the central 'run_agent' brain.
    Ensures identical persona across Web, Floating Butler, and IM.
    """
    user_id = 1
    if request.user_id:
        try:
            user_id = int(request.user_id)
        except (ValueError, TypeError):
            user_id = 1
    
    last_msg = request.messages[-1]["content"] if request.messages else "Hello"
    
    # Use 'web' platform prefix for session isolation but user-level persistence
    session_id = f"web_{user_id}"
    
    # v5.7.3: Check connectivity if user_id is 1 (Guest/System account)
    if user_id == 1 and not settings.GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="AI Brain is offline (Missing System Key)")

    try:
        response = await run_agent(content=last_msg, user_id=user_id, session_id=session_id)
        
        # Adapt run_agent response to MiniMax-compatible format for frontend
        return {
            "choices": [
                {
                    "message": {
                        "content": response["content"],
                        "role": "assistant"
                    }
                }
            ],
            "model": "gemini-1.5-flash",
            "base_resp": {
                "status_code": 0,
                "status_msg": "ok"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

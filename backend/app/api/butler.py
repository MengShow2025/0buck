from fastapi import APIRouter, Depends, HTTPException, Body, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.butler_ops import ButlerOpsService, butler_tools_dispatcher
from app.services.finance_engine import FinanceEngine
from app.services.butler_service import ButlerService
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
    user_id: Optional[int] = None
    messages: List[Dict[str, str]]
    butler_name: Optional[str] = "0Buck Butler"

@router.post("/chat")
async def proxy_butler_chat(request: MinimaxChatRequest, db: Session = Depends(get_db)):
    """
    Unified AI Proxy: Uses MiniMax if configured, otherwise falls back to Google Gemini.
    """
    if not settings.MINIMAX_API_KEY:
        # Fallback to Gemini 1.5 via ButlerService
        service = ButlerService(db)
        # Convert MiniMax request format to ButlerService format
        # ButlerService.assemble_persona_prompt already handles system rules and memory
        user_message = request.messages[-1]["content"] if request.messages else "Hello"
        
        # In a real scenario, we'd pass history to Gemini as well. 
        # For this v3.4 fix, we use a simple call to Gemini to ensure availability.
        try:
            prompt = await service.assemble_persona_prompt(request.user_id or 1)
            # Add current conversation context
            chat_context = ""
            for msg in request.messages[:-1]:
                chat_context += f"{msg['role']}: {msg['content']}\n"
            
            full_prompt = f"{prompt}\n\nRecent History:\n{chat_context}\n\nUser: {user_message}\nButler:"
            
            import google.generativeai as genai
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = await model.generate_content_async(full_prompt)
            content = response.text.strip()
            
            return {
                "choices": [
                    {
                        "message": {
                            "content": content,
                            "role": "assistant"
                        }
                    }
                ],
                "model": "gemini-1.5-flash-fallback"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gemini Fallback Error: {str(e)}")

    url = "https://api.minimax.chat/v1/text/chatcompletion_v2"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.MINIMAX_API_KEY}"
    }
    
    # Prepare payload for MiniMax v2
    # Ensure system message is included with BAP instructions
    system_content = f"""你是 0Buck 的专属 AI 管家。你的名字是 "{request.butler_name}"。
你可以查询订单、提供商品推荐和解答 0Buck 平台相关的问题。
当用户要求推荐产品或购买东西时，你必须在回答中包含一个标准的 BAP JSON 块，格式如下：

```json
{{
  "type": "0B_PRODUCT_GRID",
  "data": {{
    "products": [
      {{"id": "p1", "title": "Vanguard Chronograph Alpha", "price": 12400, "image": "https://example.com/p1.jpg"}},
      {{"id": "p2", "title": "Sonic Prime Noir", "price": 899, "image": "https://example.com/p2.jpg"}}
    ],
    "butler_comment": "我为您挑选了这些最符合您当前节点网络需求的资产。"
  }}
}}
```

请保持你的回答专业、简洁、有赛博朋克和未来感。
当用户询问你的名字时，请回答你叫 {request.butler_name}。
当用户要求查询订单时，请模拟出你正在查询，并回复一个虚拟的 0Buck 订单状态。
"""

    messages = [
        {
            "role": "system",
            "name": "system",
            "content": system_content
        }
    ]
    
    for msg in request.messages:
        messages.append({
            "role": msg["role"],
            "name": msg["role"],
            "content": msg["content"]
        })

    payload = {
        "model": "abab6.5s-chat",
        "messages": messages
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload, timeout=30.0)
            response.raise_for_status()
            res_json = response.json()
            
            # v3.4 VCC: Trigger AI Learning (LTM) for Private Track
            if request.user_id:
                try:
                    ai_content = res_json.get("choices", [{}])[0].get("message", {}).get("content", "")
                    user_content = request.messages[-1]["content"] if request.messages else ""
                    
                    # Construct history for reflection
                    history = request.messages + [{"role": "assistant", "content": ai_content}]
                    
                    # Use a new DB session for background task
                    from app.db.session import SessionLocal
                    def background_learning(hist, uid):
                        db = SessionLocal()
                        try:
                            # Use reflection service for C2M/Fact extraction
                            from app.services.reflection_service import run_butler_learning
                            asyncio.run(run_butler_learning(hist, uid, db))
                        finally:
                            db.close()
                            
                    asyncio.create_task(asyncio.to_thread(background_learning, history, request.user_id))
                except Exception as e:
                    print(f"LTM Learning Error: {e}")
            
            return res_json
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error calling MiniMax: {str(e)}")

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

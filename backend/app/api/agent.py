import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import json
import asyncio
from typing import List, Dict, Any, Optional

from app.schemas.agent import ChatRequest, ChatResponse, SessionCreate, SessionResponse, ProductSearchRequest
from app.services.agent import agent_executor
from app.services.vector_search import vector_search_service
from app.services.stream_chat import stream_chat_service
from app.models.ledger import AISession
from app.db.session import get_db
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Core AI Chat endpoint. Processes natural language, images, and intent.
    Routes to the LangGraph AI agent.
    """
    try:
        session_id = request.session_id or "default"
        config = {"configurable": {"thread_id": session_id}}
        
        # Verify session if not default
        if session_id != "default":
            session = db.query(AISession).filter(AISession.session_id == session_id).first()
            if not session:
                # In dev we might allow it, but in prod we should be strict
                print(f"Warning: Session {session_id} not found in database. Using as transient.")
        
        # Prepare content: if image_url exists, the model should handle it
        content = request.content
        if request.image_url:
            content = f"{content}\n\nImage: {request.image_url}"

        initial_state = {
            "messages": [HumanMessage(content=content)],
            "query_params": {},
            "search_results": [],
            "next_node": "supervisor",
            "locale": request.locale or "en",
            "currency": request.currency or "USD",
        }

        final_state = await agent_executor.ainvoke(initial_state, config=config)
        
        last_msg = final_state["messages"][-1]
        
        # Extract metadata if search/order info was populated
        search_results = final_state.get("search_results", [])
        order_info = final_state.get("order_info")
        
        response_type = "text"
        if search_results:
            response_type = "products"
        elif order_info:
            response_type = "order_status"
            
        return ChatResponse(
            id=f"msg_{uuid.uuid4()}",
            role="assistant",
            content=last_msg.content,
            type=response_type,
            products=search_results if search_results else None,
            order_info=order_info,
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session", response_model=SessionResponse)
async def create_session(request: SessionCreate, db: Session = Depends(get_db)):
    """
    Initialize a new AI session for a user.
    """
    session_id = f"sess_{uuid.uuid4()}"
    
    # v3.4.4: Selective Persistence - only save sessions for registered users (numeric IDs)
    is_registered_user = request.user_id.isdigit()
    
    if is_registered_user:
        new_session = AISession(
            session_id=session_id,
            user_id=int(request.user_id),
            metadata_json={"created_via": "api"}
        )
        db.add(new_session)
        db.commit()
    else:
        print(f"[VCC] Guest Session Created: {session_id} (No DB persistence)")
    
    # Generate Stream Chat token
    try:
        chat_token = stream_chat_service.generate_user_token(request.user_id)
        chat_api_key = stream_chat_service.get_api_key()
        
        # v3.4.5: Optimization - Do not block the session creation with member additions
        # We return the token immediately and let the frontend handle channel joining
        # or use a background task for platform-level membership
        
        return SessionResponse(
            session_id=session_id,
            user_id=request.user_id,
            chat_token=chat_token,
            chat_api_key=chat_api_key,
            status="active"
        )
    except Exception as e:
        print(f"Error generating chat token: {e}")
        return SessionResponse(
            session_id=session_id,
            user_id=request.user_id,
            chat_token="",
            chat_api_key="",
            status="error"
        )

@router.post("/product_search")
async def product_search(request: ProductSearchRequest):
    """
    Standalone product search endpoint for visual or semantic search.
    Used by the frontend to populate galleries without the full chat flow.
    """
    try:
        vector = await vector_search_service.get_embedding(text=request.query, image_url=request.image_url)
        results = vector_search_service.search(vector=vector, limit=request.limit)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming AI response via SSE. Returns text chunks and structured JSON.
    """
    async def event_generator():
        # Configuration for LangGraph (manages history automatically)
        session_id = request.session_id or "default"
        config = {"configurable": {"thread_id": session_id}}
        initial_input = {"messages": [HumanMessage(content=request.content)]}

        try:
            # We use astream to get chunks from LangGraph
            # Note: For now we simulate the streaming behavior by yielding text chunks
            # In production, use final_state = await agent_executor.ainvoke(initial_input, config=config)
            # then split the content into chunks.
            
            final_state = await agent_executor.ainvoke(initial_input, config=config)
            full_content = final_state["messages"][-1].content
            search_results = final_state.get("search_results", [])

            # Split text into small chunks for streaming effect
            words = full_content.split(' ')
            for i, word in enumerate(words):
                chunk = word + (' ' if i < len(words) - 1 else '')
                yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
                await asyncio.sleep(0.05) # Simulate typing

            if search_results:
                yield f"data: {json.dumps({'type': 'products', 'products': search_results})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

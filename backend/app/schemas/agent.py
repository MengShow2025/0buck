from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime

class ChatRequest(BaseModel):
    content: str
    session_id: Optional[str] = "default"
    image_url: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    role: str
    content: str
    type: str = "text" # text, products, order_status
    products: Optional[List[Dict[str, Any]]] = None
    order_info: Optional[Dict[str, Any]] = None
    timestamp: datetime = datetime.now()

class SessionCreate(BaseModel):
    user_id: str

class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    created_at: datetime = datetime.now()

class ProductSearchRequest(BaseModel):
    query: str
    limit: int = 5
    image_url: Optional[str] = None

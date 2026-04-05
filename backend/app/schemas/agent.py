from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class ChatRequest(BaseModel):
    content: str
    session_id: Optional[str] = "default"
    image_url: Optional[str] = None
    locale: Optional[str] = "en" # "en", "zh-CN", "es", etc.
    currency: Optional[str] = "USD"

class ChatResponse(BaseModel):
    id: str
    role: str
    content: str
    type: str = "text" # text, products, order_status
    products: Optional[List[Dict[str, Any]]] = None
    order_info: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class SessionCreate(BaseModel):
    user_id: str

class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    chat_token: Optional[str] = ""
    chat_api_key: Optional[str] = ""
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.now)

class ProductSearchRequest(BaseModel):
    query: str
    limit: int = 5
    image_url: Optional[str] = None

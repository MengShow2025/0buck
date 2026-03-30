import httpx
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool
from app.core.config import settings
from app.services.rewards import RewardsService
from app.services.vector_search import vector_search_service
from app.db.session import SessionLocal # 假设后端已有此 session 工厂

# Shopify Config
SHOPIFY_API_URL = f"https://{settings.SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2026-01"
SHOPIFY_ACCESS_TOKEN = settings.SHOPIFY_ACCESS_TOKEN

@tool
async def multimodal_search(query: Optional[str] = None, image_url: Optional[str] = None) -> List[Dict[str, Any]]:
    """使用文本或图片在 1688 商品池中搜索匹配的商品。"""
    # 1. 获取嵌入向量
    vector = await vector_search_service.get_embedding(text=query, image_url=image_url)
    
    # 2. 在 Qdrant 中执行搜索
    results = vector_search_service.search(vector, limit=5)
    
    # 3. 格式化返回结果，确保符合前端 UI 要求的字段
    products = []
    for res in results:
        products.append({
            "id": res.get("shopify_id"),
            "shopify_id": res.get("shopify_id"),
            "title": res.get("title"),
            "price": float(res.get('price', 0.0)),
            "rating": 4.8,
            "images": [res.get("image_url")],
            "is_reward_eligible": True
        })
    return products

@tool
def get_order_status(order_id: str) -> Dict[str, Any]:
    """查询指定订单的实时状态，包括付款状态和物流进度。"""
    headers = {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    url = f"{SHOPIFY_API_URL}/orders/{order_id}.json"
    
    try:
        with httpx.Client() as client:
            response = client.get(url, headers=headers)
            if response.status_code == 200:
                order_data = response.json().get("order", {})
                return {
                    "order_id": order_data.get("id"),
                    "financial_status": order_data.get("financial_status"),
                    "fulfillment_status": order_data.get("fulfillment_status"),
                    "total_price": order_data.get("total_price"),
                    "created_at": order_data.get("created_at")
                }
            else:
                return {"error": f"Failed to fetch order: {response.text}"}
    except Exception as e:
        return {"error": str(e)}

@tool
def get_user_rewards_info(customer_id: int) -> Dict[str, Any]:
    """查询用户的奖励账户概览，包括等级(Silver/Gold/Platinum)、钱包余额和分佣比例。"""
    db = SessionLocal()
    try:
        service = RewardsService(db)
        level_info = service.get_user_level(customer_id)
        wallet_info = service.get_wallet_summary(customer_id)
        return {
            "customer_id": customer_id,
            "level": level_info["level"],
            "referral_rate": float(level_info["rate"] * 100), # 转换为百分比
            "total_referral_volume": float(level_info["total_volume"]),
            "wallet_available": wallet_info["available"],
            "wallet_locked": wallet_info["locked"],
            "currency": wallet_info["currency"]
        }
    finally:
        db.close()

@tool
def get_recent_transactions(customer_id: int, limit: int = 5) -> List[Dict[str, Any]]:
    """查询用户最近的资金变动流水（如签到奖励、分佣到账等）。"""
    db = SessionLocal()
    try:
        service = RewardsService(db)
        return service.get_transaction_history(customer_id, limit=limit)
    finally:
        db.close()

@tool
def search_kb_rules(query: str) -> str:
    """查询 0Buck 的平台规则，包括 555天签到、3人免单、推广分润等。"""
    kb_path = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/backend/app/core/kb_rules.md"
    try:
        with open(kb_path, "r", encoding="utf-8") as f:
            content = f.read()
        return content
    except Exception as e:
        return f"Error reading KB: {str(e)}"

@tool
def get_shopify_customer_balance(customer_id: str) -> Dict[str, Any]:
    """从 Shopify Metafields 中查询用户的实时余额和奖励信息。这通常用于验证同步到 Shopify 侧的数据。"""
    headers = {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    # 假设使用 GraphQL 查询 metafields 更为高效
    query = """
    query($id: ID!) {
      customer(id: $id) {
        metafields(first: 10, namespace: "0buck_rewards") {
          edges {
            node {
              key
              value
            }
          }
        }
      }
    }
    """
    url = f"https://pxjkad-zt.myshopify.com/admin/api/2024-01/graphql.json"
    
    try:
        with httpx.Client() as client:
            response = client.post(url, headers=headers, json={"query": query, "variables": {"id": f"gid://shopify/Customer/{customer_id}"}})
            if response.status_code == 200:
                data = response.json().get("data", {}).get("customer", {})
                metafields = {edge["node"]["key"]: edge["node"]["value"] for edge in data.get("metafields", {}).get("edges", [])}
                return {
                    "customer_id": customer_id,
                    "wallet_balance": metafields.get("wallet_balance", "0.00"),
                    "referral_code": metafields.get("referral_code", "N/A"),
                    "user_level": metafields.get("user_level", "Silver")
                }
            else:
                return {"error": f"Failed to fetch Shopify metafields: {response.text}"}
    except Exception as e:
        return {"error": str(e)}

# 汇总工具集
order_tools = [get_order_status]
rewards_tools = [get_user_rewards_info, get_recent_transactions, get_shopify_customer_balance]
search_tools = [multimodal_search]
kb_tools = [search_kb_rules]
all_ai_tools = order_tools + rewards_tools + search_tools + kb_tools

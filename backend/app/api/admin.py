from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from backend.app.db.session import get_db
from backend.app.models.rewards import UserExt, Wallet, WalletTransaction, CheckinPlan
from backend.app.models.product import Product
from decimal import Decimal

router = APIRouter()

@router.get("/summary")
def get_admin_summary(db: Session = Depends(get_db)):
    """Get high-level summary for the dashboard"""
    total_users = db.query(func.count(UserExt.customer_id)).scalar()
    total_orders_synced = db.query(func.count(CheckinPlan.order_id)).scalar()
    total_wallet_balance = db.query(func.sum(Wallet.balance_available)).scalar() or 0.0
    total_products = db.query(func.count(Product.id)).scalar()
    
    # Last 10 transactions
    recent_txs = db.query(WalletTransaction).order_by(WalletTransaction.created_at.desc()).limit(10).all()
    
    return {
        "users_count": total_users,
        "orders_count": total_orders_synced,
        "total_balance": float(total_wallet_balance),
        "products_count": total_products,
        "recent_transactions": [
            {
                "id": str(tx.id),
                "user_id": tx.user_id,
                "amount": float(tx.amount),
                "type": tx.type,
                "status": tx.status,
                "created_at": tx.created_at.isoformat()
            } for tx in recent_txs
        ]
    }

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    """List all extended user profiles"""
    users = db.query(UserExt).all()
    res = []
    for u in users:
        wallet = db.query(Wallet).filter_by(user_id=u.customer_id).first()
        res.append({
            "customer_id": u.customer_id,
            "referral_code": u.referral_code,
            "user_type": u.user_type,
            "balance": float(wallet.balance_available) if wallet else 0.0,
            "created_at": u.created_at.isoformat()
        })
    return res

@router.get("/sync-status")
def get_sync_status(db: Session = Depends(get_db)):
    """Monitor 1688 and Shopify sync status"""
    products = db.query(Product).order_by(Product.updated_at.desc()).limit(50).all()
    return [
        {
            "id": p.id,
            "title": p.title_en,
            "shopify_id": p.shopify_product_id,
            "cost_cny": float(p.cost_cny),
            "price_usd": float(p.price_usd),
            "updated_at": p.updated_at.isoformat()
        } for p in products
    ]

@router.post("/wallet/adjust")
def adjust_wallet(user_id: int, amount: float, reason: str, db: Session = Depends(get_db)):
    """Manual adjustment for user wallet balance"""
    from backend.app.services.rewards import RewardsService
    rewards = RewardsService(db)
    rewards.update_wallet_balance(user_id, Decimal(str(amount)), "admin_adjustment", None, reason)
    return {"status": "success", "message": f"已为用户 {user_id} 调整余额: {amount}"}

from sqlalchemy import Column, Integer, String, Numeric, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class RewardPhase(Base):
    __tablename__ = "reward_phases"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("checkin_plans.id"), nullable=False)
    phase_num = Column(Integer, nullable=False)
    ratio = Column(Numeric(5, 4, asdecimal=True), nullable=False)
    days_required = Column(Integer, nullable=False)
    status = Column(String, default="pending") # pending, active, completed, forfeited
    amount = Column(Numeric(10, 2, asdecimal=True), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PlatformProfitPool(Base):
    __tablename__ = "platform_profit_pool"
    
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2, asdecimal=True), nullable=False)
    source = Column(String, nullable=False) # 'forfeited_rebate', 'exchange_buffer'
    reference_id = Column(String, nullable=True) # order_id or plan_id
    
    # v4.0: Real-time Cost Collision Coefficient
    margin_ratio = Column(Numeric(5, 4, asdecimal=True), nullable=True)
    is_red_alert = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

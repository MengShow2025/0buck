import pytest
from unittest.mock import MagicMock, patch
from app.services.rewards import RewardsService
from app.services.shopify_discount import ShopifyDiscountService

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def reward_service(mock_db):
    return RewardsService(mock_db)

def test_redeem_points_exchange_item_insufficient_pts(reward_service, mock_db):
    # Setup mock user
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    mock_db.query.return_value.filter_by.return_value.first.return_value = mock_user
    
    with patch('app.services.rewards.RewardsService._find_exchange_item') as mock_find:
        mock_find.return_value = {
            "type": "shopify_balance_voucher",
            "points_cost": 100,
            "voucher_usd": 10.0
        }
        
        # Patch the discount service which actually does the deduction
        with patch('app.services.shopify_discount.ShopifyDiscountService.deduct_balance_and_generate_voucher') as mock_deduct:
            mock_deduct.return_value = None # Simulates insufficient balance or failure
            
            result = reward_service.redeem_points_exchange_item(customer_id=1, item_code="VOUCHER10")
            
            assert result["status"] == "error"
            assert "Voucher generation failed" in result["message"]

def test_redeem_points_exchange_item_success(reward_service, mock_db):
    # Setup mock user
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    mock_db.query.return_value.filter_by.return_value.first.return_value = mock_user
    
    with patch('app.services.rewards.RewardsService._find_exchange_item') as mock_find:
        mock_find.return_value = {
            "type": "shopify_balance_voucher",
            "points_cost": 100,
            "voucher_usd": 10.0
        }
        
        with patch('app.services.shopify_discount.ShopifyDiscountService.deduct_balance_and_generate_voucher') as mock_deduct:
            mock_deduct.return_value = "DISCOUNT_CODE_123"
            
            result = reward_service.redeem_points_exchange_item(customer_id=1, item_code="VOUCHER10")
            
            assert result["status"] == "success"
            assert result["voucher_code"] == "DISCOUNT_CODE_123"
            mock_deduct.assert_called_once_with(
                user_id=1,
                email="test@example.com",
                amount_points=100,
                amount_usd=10.0
            )
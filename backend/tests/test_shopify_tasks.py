import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
from app.workers.shopify_tasks import process_paid_order

@pytest.fixture
def mock_db_session():
    with patch('app.workers.shopify_tasks.SessionLocal') as mock_session:
        session_instance = MagicMock()
        mock_session.return_value = session_instance
        yield session_instance

@pytest.fixture
def sample_payload():
    return {
        "id": 12345,
        "name": "#1001",
        "current_total_price": "50.00",
        "customer": {
            "id": 999
        },
        "line_items": [
            {
                "variant_id": "v1",
                "quantity": 1,
                "price": "50.00"
            }
        ],
        "note_attributes": []
    }

def test_process_paid_order_missing_ids(mock_db_session):
    # Test early exit when customer_id or order_id is missing
    payload = {"id": 12345} # Missing customer
    
    result = process_paid_order(payload)
    
    assert result == {"status": "skipped"}
    mock_db_session.add.assert_not_called()

def test_process_paid_order_idempotency(mock_db_session, sample_payload):
    # Mock the DB query to return an existing order with status "paid_processed"
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_filter = MagicMock()
    mock_query.filter_by.return_value = mock_filter
    
    existing_order = MagicMock()
    existing_order.status = "paid_processed"
    mock_filter.first.return_value = existing_order
    
    result = process_paid_order(sample_payload)
    
    assert result == {"status": "already_processed"}
    mock_db_session.add.assert_not_called()


@patch('app.workers.shopify_tasks.RewardsService')
@patch('app.workers.shopify_tasks.SupplyChainService')
@patch('app.workers.shopify_tasks.SocialAutomationService')
@patch('app.workers.shopify_tasks.asyncio.get_event_loop')
def test_process_paid_order_success(
    mock_get_event_loop, 
    mock_social_service, 
    mock_supply_chain, 
    mock_rewards_service, 
    mock_db_session, 
    sample_payload
):
    # Mock DB query to return NO existing order (first time processing)
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_filter = MagicMock()
    mock_query.filter_by.return_value = mock_filter
    mock_filter.first.return_value = None
    
    # Mock asyncio loop
    mock_loop = MagicMock()
    mock_get_event_loop.return_value = mock_loop
    
    result = process_paid_order(sample_payload)
    
    assert result == {"status": "success", "order_id": 12345}
    assert mock_db_session.add.called
    assert mock_db_session.commit.called
    
    # Verify RewardsService was initialized and methods called
    mock_rewards_instance = mock_rewards_service.return_value
    mock_rewards_instance.init_checkin_plan.assert_called_once_with(
        999, 12345, Decimal('50.00'), 'UTC'
    )

def test_process_paid_order_retry_on_db_error(mock_db_session, sample_payload):
    mock_db_session.commit.side_effect = Exception("DB Connection Lost")
    
    # We can patch the retry method on the celery task object
    with patch('app.workers.shopify_tasks.process_paid_order.retry') as mock_retry:
        mock_retry.side_effect = Exception("RetryTriggered")
        
        with pytest.raises(Exception, match="RetryTriggered"):
            # Calling the task directly. Celery handles injecting 'self' for bound tasks 
            # when called directly in recent versions, but if not, it will throw TypeError.
            process_paid_order(sample_payload)
            
        mock_db_session.rollback.assert_called()

# Backend Testing Guide

## Checkout Smoke

Fast regression suite for checkout critical paths:

- Shopify customer sync failure fallback (`guest checkout` downgrade)
- Shopify variant unavailable fallback (custom line items retry)
- `create-order` error observability (`detail` and `trace_id`)

Run from `backend/`:

```bash
source venv/bin/activate
PYTHONPATH=. python -m pytest -q -m checkout_smoke \
  tests/test_shopify_payment_service.py \
  tests/test_rewards_create_order_observability.py
```

Expected result:

- `4 passed`

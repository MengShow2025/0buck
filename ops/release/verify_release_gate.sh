#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PYTHON_BIN="/Library/Developer/CommandLineTools/usr/bin/python3"

export MASTER_SECRET_KEY="${MASTER_SECRET_KEY:-dummy}"
export PYTHONPATH="${ROOT_DIR}/backend"

echo "[gate] compile backend key modules"
"${PYTHON_BIN}" -m compileall \
  "${ROOT_DIR}/backend/app/core/config.py" \
  "${ROOT_DIR}/backend/app/core/db_url.py" \
  "${ROOT_DIR}/backend/app/gateway/dedup.py" \
  "${ROOT_DIR}/backend/app/api/products.py" \
  "${ROOT_DIR}/backend/app/api/im_gateway.py" \
  "${ROOT_DIR}/backend/app/api/rewards.py"

echo "[gate] run backend pytest key suite"
"${PYTHON_BIN}" -m pytest \
  "${ROOT_DIR}/backend/tests/smoke/test_backend_key_apis.py" \
  "${ROOT_DIR}/backend/tests/test_im_gateway_dedup.py" \
  "${ROOT_DIR}/backend/tests/test_coupon_stacking_rules.py" \
  "${ROOT_DIR}/backend/tests/test_checkout_idempotency.py" \
  "${ROOT_DIR}/backend/tests/test_db_url_normalization.py" \
  "${ROOT_DIR}/backend/tests/test_shopify_tasks.py" \
  "${ROOT_DIR}/backend/tests/test_im_tasks.py" \
  "${ROOT_DIR}/backend/tests/test_rewards_points.py" \
  "${ROOT_DIR}/backend/tests/test_checkout_schema.py" \
  "${ROOT_DIR}/backend/tests/test_checkout_block_reason_schema.py" \
  -q

echo "[gate] run frontend vitest suite"
(
  cd "${ROOT_DIR}/frontend"
  npm run test -- --run
)

echo "[gate] build frontend"
(
  cd "${ROOT_DIR}/frontend"
  npm run build
)

echo "[gate] release gate passed"

# 0Buck v4.0 Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation for the 0Buck S2b2C Conversational OS by implementing the Shopify Headless Payment Bridge (Discount Code method), the VCC (Vortex Chat Container) BAP card renderer, and the core Actuarial Drop-off Funnel for the 20-Phase Rebate System.

**Architecture:** 
- Backend: FastAPI (Python) with SQLAlchemy and Celery/Redis for asynchronous Webhook queuing.
- Frontend: React with GetStream SDK for chat-based interactions and Framer Motion for BAP card animations.
- Integration: Shopify Admin API (GraphQL/REST) for dynamic Discount Code generation and Order syncing.

**Tech Stack:** Python 3.11+, FastAPI, PostgreSQL, Redis, React 18, Tailwind CSS, Shopify API.

---

## Phase 1: The Headless Payment & Compliance Bridge

### Task 1: Robust Shopify Webhook Receiver & Queue
**Files:**
- Create: `backend/app/api/webhooks.py`
- Create: `backend/app/workers/shopify_tasks.py`

**Steps:**
- [ ] **Step 1:** Implement FastAPI endpoint `/api/webhooks/shopify/orders-paid` with HMAC-SHA256 signature verification.
- [ ] **Step 2:** Write incoming raw JSON payload to a Redis queue (or a PostgreSQL `webhook_events` table) and immediately return HTTP 200.
- [ ] **Step 3:** Create a Celery task `process_paid_order` that reads from the queue, enforces idempotency (checking `shopify_order_id`), and triggers the internal `FinanceEngine`.

### Task 2: Dynamic Discount Code Generator (Balance Payment)
**Files:**
- Create: `backend/app/services/shopify_discount.py`

**Steps:**
- [ ] **Step 1:** Implement `ShopifyDiscountService.generate_balance_voucher(email, amount)`.
- [ ] **Step 2:** Call Shopify Admin API to create a PriceRule (target_type: line_item, allocation_method: across, value: -amount, customer_selection: prerequisite, prerequisite_customer_ids: [customer_id]).
- [ ] **Step 3:** Generate a unique DiscountCode (e.g., `0BUCK-BAL-[HASH]`) linked to the PriceRule.
- [ ] **Step 4:** Return the code string to the frontend for Checkout injection.

---

## Phase 2: The Vortex Chat Container (VCC)

### Task 3: BAP Protocol Definitions & Backend Emitter
**Files:**
- Modify: `backend/app/api/stream.py`
- Create: `backend/app/core/bap_protocol.py`

**Steps:**
- [ ] **Step 1:** Define Pydantic schemas for `BAP_ProductGrid`, `BAP_CashbackRadar`, and `BAP_WishWell`.
- [ ] **Step 2:** Implement `StreamService.send_targeted_bap_card(channel_id, user_id, bap_payload)` using the GetStream Python client, utilizing the `silent=True` or targeted message feature for privacy.

### Task 3: React Frontend BAP Renderer
**Files:**
- Create: `frontend/src/components/BAP/BAPRenderer.tsx`
- Create: `frontend/src/components/BAP/cards/ProductGridCard.tsx`

**Steps:**
- [ ] **Step 1:** Create the `BAPRenderer` component that intercepts custom attachments from GetStream's `MessageList`.
- [ ] **Step 2:** Implement the `ProductGridCard` component with a 2x5 swipeable layout (Tailwind) to render `0B_PRODUCT_GRID` payloads.
- [ ] **Step 3:** Add an "Add to Cart / Buy Now" button that triggers the Shopify Checkout flow.

---

## Phase 3: Actuarial Core & Anti-Bankruptcy

### Task 4: The 20-Phase Drop-off Funnel Engine
**Files:**
- Modify: `backend/app/services/rewards.py`
- Create: `backend/app/models/actuarial.py`

**Steps:**
- [ ] **Step 1:** Implement `RewardEngine.process_daily_checkin(user_id)`.
- [ ] **Step 2:** If a user misses a check-in, set the current `RewardPhase` status to `forfeited`.
- [ ] **Step 3:** Calculate the forfeited amount and append it to a global `PlatformProfitPool` ledger.
- [ ] **Step 4:** Implement `AdminService.get_funnel_metrics()` to calculate survival rates across P1-P20 and the real-time "Actual Payout Ratio" for the Admin Dashboard.

---

## Phase 4: Supplier Darwinism & AI Onboarding

### Task 5: The "Toxic Sandbox" Filter
**Files:**
- Create: `backend/app/services/sourcing_filter.py`

**Steps:**
- [ ] **Step 1:** Implement `SourcingFilter.scan_product(product_data)`.
- [ ] **Step 2:** Use regex and NLP (or Gemini API) to scan titles, descriptions, and attributes for prohibited keywords (e.g., "battery", "liquid", "powder", "knife").
- [ ] **Step 3:** If toxic, mark the `CandidateProduct` status as `quarantined` and block it from the Shopify sync queue.
# 0Buck VCC Frontend SPA Drawers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 full-screen SPA sliding drawers (Lounge, Square, Prime, Settings & Wallet, Fan Center) using React and Framer Motion, seamlessly integrated into the VCC architecture.

**Architecture:** We will create a generic `Drawer` wrapper component using `framer-motion`'s `AnimatePresence` and `motion.div`. The global state will manage which drawer is currently open via `AppContext`. Each of the 5 business modules will have its own dedicated component that renders inside the Drawer when triggered by header icons or the Magic Pocket menu.

**Tech Stack:** React, Tailwind CSS, Framer Motion, Lucide React.

---

### Task 1: Create Global Drawer Wrapper and State

**Files:**
- Modify: `frontend/src/components/VCC/AppContext.tsx`
- Create: `frontend/src/components/VCC/Drawer/GlobalDrawer.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update AppContext with Drawer State**
Modify `AppContext.tsx` to include `activeDrawer` state (`'none' | 'lounge' | 'square' | 'prime' | 'wallet' | 'fans'`).

- [ ] **Step 2: Create GlobalDrawer Component**
Create `GlobalDrawer.tsx` using `framer-motion` to slide up from the bottom (y: '100%' to y: 0) and cover the screen, with a close button at the top.

- [ ] **Step 3: Integrate GlobalDrawer into App.tsx**
Add `<GlobalDrawer />` right before the closing `</div>` of the main layout in `App.tsx`.

---

### Task 2: Implement Prime (Store) Drawer

**Files:**
- Create: `frontend/src/components/VCC/Drawer/PrimeDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/GlobalDrawer.tsx`
- Modify: `frontend/src/components/VCC/MagicPocketMenu.tsx`

- [ ] **Step 1: Create PrimeDrawer UI**
Create a masonry/grid layout showing dummy product cards (Artisan Verified, Price, etc.).

- [ ] **Step 2: Register in GlobalDrawer**
Render `<PrimeDrawer />` inside `GlobalDrawer` when `activeDrawer === 'prime'`.

- [ ] **Step 3: Trigger from Magic Pocket**
Update `MagicPocketMenu.tsx` so clicking "0Buck 严选小店" calls `setActiveDrawer('prime')`.

---

### Task 3: Implement Settings & Wallet Drawer

**Files:**
- Create: `frontend/src/components/VCC/Drawer/WalletDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/GlobalDrawer.tsx`
- Modify: `frontend/src/components/VCC/VCCHeader.tsx`

- [ ] **Step 1: Create WalletDrawer UI**
Create sections for "Balance (USDC/PayPal)", "Points", and "API Token Usage (Max $1/day)". Add a mockup "Withdraw" button.

- [ ] **Step 2: Register in GlobalDrawer**
Render `<WalletDrawer />` when `activeDrawer === 'wallet'`.

- [ ] **Step 3: Trigger from Header**
Update `VCCHeader.tsx` so clicking the 💰 Wallet icon calls `setActiveDrawer('wallet')`.

---

### Task 4: Implement Fan Center (Rebate & Referrals) Drawer

**Files:**
- Create: `frontend/src/components/VCC/Drawer/FanCenterDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/GlobalDrawer.tsx`
- Modify: `frontend/src/components/VCC/VCCHeader.tsx`

- [ ] **Step 1: Create FanCenterDrawer UI**
Create UI showing the 20-Phase Check-in Rebate progress, Fan/Referral earnings leaderboard, and Group Buy status.

- [ ] **Step 2: Register in GlobalDrawer**
Render `<FanCenterDrawer />` when `activeDrawer === 'fans'`.

- [ ] **Step 3: Trigger from Header**
Update `VCCHeader.tsx` so clicking the 🛒 Orders/Fan icon calls `setActiveDrawer('fans')`.

---

### Task 5: Implement Lounge & Square (Community) Drawers

**Files:**
- Create: `frontend/src/components/VCC/Drawer/LoungeDrawer.tsx`
- Create: `frontend/src/components/VCC/Drawer/SquareDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/GlobalDrawer.tsx`
- Modify: `frontend/src/components/VCC/MagicPocketMenu.tsx`

- [ ] **Step 1: Create LoungeDrawer UI**
Create a mockup list of Private Groups and DMs (Group Chat UI).

- [ ] **Step 2: Create SquareDrawer UI**
Create a mockup Feed (like WeChat Moments) for Platform Activities and Public Shares.

- [ ] **Step 3: Register in GlobalDrawer**
Render `<LoungeDrawer />` or `<SquareDrawer />` based on `activeDrawer`.

- [ ] **Step 4: Trigger from Magic Pocket**
Update `MagicPocketMenu.tsx` so clicking "社群广场" calls `setActiveDrawer('square')`.

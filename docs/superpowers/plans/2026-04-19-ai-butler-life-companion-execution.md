# AI Butler Life Companion Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 管家升级为“先任务后推荐”的泛生活顾问，并将 BYOK 奖励统一为积分机制。

**Architecture:** 通过三层改造推进：提示词与路由策略层（主任务优先/能力边界）、推荐控制层（触发+频控+用户可控）、奖励结算层（BYOK token→积分）。先做最小可用行为收敛，再扩展可视化与评测。

**Tech Stack:** FastAPI, SQLAlchemy, LangChain/LangGraph, React, i18n CSV/JSON, pytest

---

### Task 1: BYOK 奖励积分化（已开始）

**Files:**
- Modify: `backend/app/services/reward_engine.py`
- Verify: `backend/app/services/agent.py`

- [x] **Step 1: 修改奖励结算语义为积分**

```python
# reward_engine.py
# milestones -> points
points_delta = new_milestones * reward_points
```

- [x] **Step 2: 写入积分主表与积分流水**

```python
points = self.db.query(Points).filter_by(user_id=user_id).with_for_update().first()
txn = PointTransaction(user_id=user_id, amount=points_delta, source=PointSource.TASK, ...)
```

- [x] **Step 3: 保留进度字段用于 UI 进度展示**

```python
contribution.reward_shards = min(2, int(progress * 3))
```

- [ ] **Step 4: 运行后端回归验证**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_butler_chat_timeout_guard.py tests/test_butler_system_action_expansion.py`
Expected: PASS

### Task 2: AI 主任务优先与能力边界门控

**Files:**
- Modify: `backend/app/services/butler_service.py`
- Modify: `backend/app/services/agent.py`

- [ ] **Step 1: 在 L1 enforcement 增加主任务优先与禁硬推销规则**

```text
MAIN TASK FIRST:
1) complete user's explicit request first
2) recommendation is optional and post-task
3) avoid hard refusal + sales redirection
BOUNDARY:
do not act as general coding/programming tool
```

- [ ] **Step 2: 加入“泛生活请求优先计划输出”约束**

```text
For travel/lifestyle requests, produce executable plan first (day-by-day, time, transport, budget).
```

- [ ] **Step 3: 运行 smoke 测试（人工）**

Run: 本地调用 butler 接口输入“帮我规划成都3天旅游”
Expected: 先给计划，不先导购，不硬拒答。

### Task 3: 推荐控制策略（频控 + 可跳过 + 可关闭）

**Files:**
- Modify: `backend/app/services/agent.py`
- Create: `backend/app/services/recommendation_guard.py`
- Modify: `frontend/src/components/VCC/Drawer/SettingsDrawer.tsx` (或等效设置入口)

- [ ] **Step 1: 新建推荐守卫模块**

```python
def can_recommend(user_id, session_id, topic): ...
def mark_recommend_shown(...): ...
def mark_recommend_skipped(...): ...
```

- [ ] **Step 2: 在 agent 输出链路加守卫**

```python
if recommendation_guard.can_recommend(...):
    append_recommendation()
```

- [ ] **Step 3: 前端增加推荐开关与“本次跳过”动作**

```tsx
// 用户级：smart_recommendation_enabled
// 会话级：skip_this_session
```

- [ ] **Step 4: 运行前端构建与类型检查**

Run: `cd frontend && npm run build`
Expected: PASS

### Task 4: 文档与评测用例

**Files:**
- Modify: `docs/project-readiness-matrix.md`
- Create: `docs/ai/ai-butler-life-companion-eval-cases.md`

- [ ] **Step 1: 更新里程碑记录**

```md
记录“先任务后推荐”与 BYOK 积分化状态
```

- [ ] **Step 2: 追加 10 条评测对话用例**

```md
覆盖：旅行规划、情绪安抚、推荐跳过、推荐关闭、BYOK 奖励
```

- [ ] **Step 3: 形成明日验收清单**

Run: 手工验收 + 命令回归
Expected: 可复现、可度量

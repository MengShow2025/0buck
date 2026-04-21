# Social Feed MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成交付“动态（朋友圈）图文MVP闭环”，打通发布、列表、点赞、评论、删除、可见性（公开/仅好友），并统一“发现/社群动态”数据源。

**Architecture:** 后端新增 Social 写接口与可见性过滤，媒体采用“后端签名 + 前端直传 Shopify CDN + commit + 发布”流程；前端移除多处 mock feed，统一改为一个 social store + 同一 API。发布失败不落本地假数据，互动采用乐观更新并失败回滚。

**Tech Stack:** FastAPI + SQLAlchemy + Pydantic + React + TypeScript + Axios + Shopify CDN 上传链路

---

### Task 1: 扩展后端数据模型（动态可见性与点赞明细）

**Files:**
- Modify: `backend/app/models/ledger.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_social_api_mvp.py`

- [ ] **Step 1: 写失败测试（模型字段和唯一约束）**

```python
def test_social_like_unique_constraint(db):
    # 同一 user 对同一 activity 重复点赞应触发唯一约束
    ...
```

- [ ] **Step 2: 先运行测试确认失败**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py::test_social_like_unique_constraint`  
Expected: FAIL（模型/表不存在或约束未生效）

- [ ] **Step 3: 最小实现模型**

```python
class SquareActivityLike(Base):
    __tablename__ = "square_activity_likes"
    __table_args__ = (UniqueConstraint("activity_id", "user_id", name="uq_square_activity_like"),)
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    activity_id = Column(BigInteger, ForeignKey("square_activities.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=False, index=True)
    created_at = Column(DateTime, default=func.now())
```

```python
# SquareActivity 新增字段
visibility = Column(String(16), default="public", nullable=False, index=True)
media_json = Column(JSON, nullable=True)
deleted_at = Column(DateTime, nullable=True, index=True)
likes_count = Column(Integer, default=0)
comments_count = Column(Integer, default=0)
```

- [ ] **Step 4: 在启动建表流程纳入新表**

```python
SquareActivityLike.__table__.create(bind=engine, checkfirst=True)
```

- [ ] **Step 5: 再次运行测试确认通过**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py::test_social_like_unique_constraint`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/ledger.py backend/app/models/__init__.py backend/app/main.py backend/tests/test_social_api_mvp.py
git commit -m "feat: extend social activity model for mvp visibility and likes"
```

### Task 2: 实现动态发布与列表可见性过滤 API

**Files:**
- Modify: `backend/app/api/social.py`
- Modify: `backend/app/api/__init__.py` (if exports are used)
- Test: `backend/tests/test_social_api_mvp.py`

- [ ] **Step 1: 写失败测试（公开/好友可见过滤）**

```python
def test_list_activities_visibility_public_and_friends(client, token_a, token_b, token_c):
    # A发friends动态，B为好友可见，C非好友不可见
    ...
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py::test_list_activities_visibility_public_and_friends`  
Expected: FAIL（接口不存在或过滤不正确）

- [ ] **Step 3: 最小实现发布/列表接口与鉴权**

```python
@router.post("/activities")
def create_activity(payload: ActivityCreatePayload, db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    ...

@router.get("/activities")
def list_activities(..., db: Session = Depends(get_db), current_user: UserExt = Depends(get_current_user)):
    ...
```

- [ ] **Step 4: 实现可见性过滤逻辑**

```python
# public 全员可见；friends 仅双向好友 + 作者本人
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py::test_list_activities_visibility_public_and_friends`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/social.py backend/tests/test_social_api_mvp.py
git commit -m "feat: add social activity create and visibility-aware list api"
```

### Task 3: 实现点赞/评论/删除动态 API（含幂等）

**Files:**
- Modify: `backend/app/api/social.py`
- Test: `backend/tests/test_social_api_mvp.py`

- [ ] **Step 1: 写失败测试（点赞幂等、评论计数、删除权限）**

```python
def test_like_is_idempotent(...): ...
def test_comment_create_and_delete_updates_count(...): ...
def test_only_author_can_delete_activity(...): ...
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py -k "like_is_idempotent or comment_create_and_delete_updates_count or only_author_can_delete_activity"`  
Expected: FAIL

- [ ] **Step 3: 最小实现接口**

```python
POST   /social/activities/{id}/like
DELETE /social/activities/{id}/like
GET    /social/activities/{id}/comments
POST   /social/activities/{id}/comments
DELETE /social/comments/{id}
DELETE /social/activities/{id}
```

- [ ] **Step 4: 实现幂等与权限**

```python
# like 用唯一键 + IntegrityError 回退幂等成功
# 删除动态仅作者可删
# 删评论：评论作者或动态作者
```

- [ ] **Step 5: 运行相关测试确认通过**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/social.py backend/tests/test_social_api_mvp.py
git commit -m "feat: add social likes comments and delete with idempotency"
```

### Task 4: 实现媒体上传签名/提交（Shopify CDN 链路）

**Files:**
- Modify: `backend/app/api/social.py`
- Modify: `backend/app/services/shopify.py` (or add helper in existing Shopify service module)
- Test: `backend/tests/test_social_api_mvp.py`

- [ ] **Step 1: 写失败测试（无 commit 媒体不可发布）**

```python
def test_create_activity_requires_committed_cdn_media(...): ...
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py::test_create_activity_requires_committed_cdn_media`  
Expected: FAIL

- [ ] **Step 3: 最小实现 upload-ticket / media-commit**

```python
POST /social/media/upload-ticket
POST /social/media/commit
```

- [ ] **Step 4: 在 create_activity 校验媒体必须来自 commit 结果**

```python
if payload.media and not all(item.get("committed") for item in payload.media):
    raise HTTPException(status_code=400, detail="media_not_committed")
```

- [ ] **Step 5: 回归测试**

Run: `cd backend && PYTHONPATH=. pytest -q tests/test_social_api_mvp.py::test_create_activity_requires_committed_cdn_media`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/social.py backend/app/services/shopify.py backend/tests/test_social_api_mvp.py
git commit -m "feat: add social media upload ticket and commit validation"
```

### Task 5: 前端补 social API 客户端与统一 store

**Files:**
- Modify: `frontend/src/services/api.ts`
- Create: `frontend/src/components/VCC/state/socialStore.ts` (if no existing store directory, create it)
- Test: `frontend` build + targeted UI smoke

- [ ] **Step 1: 在 `api.ts` 写 social API 封装**

```ts
export const socialApi = {
  uploadTicket: (...) => api.post('/social/media/upload-ticket', ...),
  commitMedia: (...) => api.post('/social/media/commit', ...),
  createActivity: (...) => api.post('/social/activities', ...),
  listActivities: (...) => api.get('/social/activities', { params }),
  like: (id:number) => api.post(`/social/activities/${id}/like`),
  unlike: (id:number) => api.delete(`/social/activities/${id}/like`),
  listComments: (id:number) => api.get(`/social/activities/${id}/comments`),
  createComment: (id:number, data:any) => api.post(`/social/activities/${id}/comments`, data),
  deleteComment: (id:number) => api.delete(`/social/comments/${id}`),
  deleteActivity: (id:number) => api.delete(`/social/activities/${id}`),
};
```

- [ ] **Step 2: 创建统一 social store（发现/社群动态共用）**

```ts
// 统一维护 feed 列表、分页、点赞评论乐观更新与回滚
```

- [ ] **Step 3: 运行前端类型检查/构建确认无错误**

Run: `cd frontend && npm run build`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/components/VCC/state/socialStore.ts
git commit -m "feat: add social api client and shared feed store"
```

### Task 6: 发布抽屉接入 Shopify 上传与真实发布

**Files:**
- Modify: `frontend/src/components/VCC/Drawer/MyFeedsDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/ShareDrawer.tsx` (if publish entry helpers reused)
- Test: `frontend` build + manual publish smoke

- [ ] **Step 1: 写失败用例（流程级，先手测脚本）**

Run: 发布图文但不上传成功直接提交  
Expected: 前端禁止发布并提示“媒体未上传完成”

- [ ] **Step 2: 最小实现发布状态机**

```ts
// 选择图片 -> uploadTicket -> 直传 Shopify -> commitMedia -> createActivity
// 任一步失败中断并提示
```

- [ ] **Step 3: 增加可见性选择（仅两项）**

```ts
type Visibility = 'public' | 'friends';
```

- [ ] **Step 4: 运行构建与手工验证**

Run: `cd frontend && npm run build`  
Expected: PASS；手工验证“上传失败不发布、成功才入流”

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/VCC/Drawer/MyFeedsDrawer.tsx frontend/src/components/VCC/Drawer/ShareDrawer.tsx
git commit -m "feat: wire publish drawer to shopify upload and social create api"
```

### Task 7: 列表页改造（发现/社群动态同源）与互动接真实接口

**Files:**
- Modify: `frontend/src/components/VCC/Drawer/SquareDrawer.tsx`
- Modify: `frontend/src/components/VCC/Desktop/DesktopSquarePanel.tsx`
- Modify: `frontend/src/components/VCC/Desktop/DesktopSocialView.tsx`
- Test: `frontend` build + manual cross-entry consistency

- [ ] **Step 1: 移除本地 mock feed 来源，改为 shared social store**

```ts
// 所有 feed 读取 socialStore.activities
```

- [ ] **Step 2: 点赞/评论改真实 API + 乐观更新回滚**

```ts
// optimistic: +1 -> fail rollback
```

- [ ] **Step 3: 删除动态接真实 API**

```ts
// 仅作者显示删除菜单，删除后双入口同步消失
```

- [ ] **Step 4: 运行构建和双入口一致性手测**

Run: `cd frontend && npm run build`  
Expected: PASS；“发现”和“社群动态”数据一致

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/VCC/Drawer/SquareDrawer.tsx frontend/src/components/VCC/Desktop/DesktopSquarePanel.tsx frontend/src/components/VCC/Desktop/DesktopSocialView.tsx
git commit -m "feat: unify discovery and community feed with real social backend"
```

### Task 8: 上线回归脚本与文档收口

**Files:**
- Create: `backend/scripts/smoke_social_api.py`
- Create: `docs/module-social-release-checklist.md`
- Modify: `docs/completion-journal.md`

- [ ] **Step 1: 编写 social smoke 脚本**

```python
# 覆盖：发布(public/friends)、可见性过滤、点赞幂等、评论增删、删除权限
```

- [ ] **Step 2: 编写上线清单**

```md
# 包含 A/B/C 可见性验证、跨入口一致性验证、Shopify 上传失败回归
```

- [ ] **Step 3: 验证脚本与构建**

Run:
- `cd backend && python3 -m py_compile scripts/smoke_social_api.py`
- `cd backend && python3 -m compileall app/api/social.py app/main.py app/models/ledger.py`
- `cd frontend && npm run build`

Expected: 全 PASS

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/smoke_social_api.py docs/module-social-release-checklist.md docs/completion-journal.md
git commit -m "chore: add social mvp release smoke and checklist"
```

---

## 计划自检
1、**Spec 覆盖检查**：已覆盖发布、列表、点赞、评论、删除、可见性、双入口同源、Shopify 上传链路。  
2、**占位检查**：无 TODO/TBD；每个任务含明确文件、命令、预期。  
3、**一致性检查**：可见性仅 `public/friends`；不包含视频；发现与社群动态统一 store。  


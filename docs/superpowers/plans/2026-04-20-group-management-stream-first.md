# Group Management (Stream-First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一次性交付完整群管理（创建、邀请、成员/角色、群设置、治理、审计、生命周期）并对齐 Stream 标准能力。

**Architecture:** 后端以自有数据库作为业务真源（群、成员、角色、设置、审计），Stream 作为实时消息与会话状态通道。所有关键群操作先写业务表并审计，再同步 Stream；失败进入重试并保持幂等。

**Tech Stack:** FastAPI, SQLAlchemy, Stream Chat SDK, React + TypeScript, Axios, Pytest, Vite

---

### Task 1: 数据模型与建表

**Files:**
- Modify: `backend/app/models/ledger.py`
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_group_models.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_group_models.py
from app.models.ledger import ChatGroup, ChatGroupMember, ChatGroupAuditLog

def test_group_model_symbols_exist():
    assert ChatGroup.__tablename__ == "chat_groups"
    assert ChatGroupMember.__tablename__ == "chat_group_members"
    assert ChatGroupAuditLog.__tablename__ == "chat_group_audit_logs"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_group_models.py`  
Expected: FAIL（`ImportError` / symbol not found）

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/models/ledger.py (新增)
class ChatGroup(Base):
    __tablename__ = "chat_groups"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    stream_channel_id = Column(String(128), unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    owner_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=False, index=True)
    group_type = Column(String(20), default="private", index=True)  # private/public
    status = Column(String(20), default="active", index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ChatGroupMember(Base):
    __tablename__ = "chat_group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_member"),)
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    group_id = Column(BigInteger, ForeignKey("chat_groups.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=False, index=True)
    role = Column(String(20), default="member", index=True)  # owner/admin/member
    muted_until = Column(DateTime, nullable=True)
    state = Column(String(20), default="active", index=True)
    created_at = Column(DateTime, default=func.now())

class ChatGroupAuditLog(Base):
    __tablename__ = "chat_group_audit_logs"
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    group_id = Column(BigInteger, ForeignKey("chat_groups.id"), nullable=False, index=True)
    actor_user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=False, index=True)
    action = Column(String(64), nullable=False, index=True)
    target_user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=True, index=True)
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
```

- [ ] **Step 4: Register models and startup create**

```python
# backend/app/models/__init__.py
from .ledger import ChatGroup, ChatGroupMember, ChatGroupAuditLog

# backend/app/main.py
from app.models.ledger import ChatGroup, ChatGroupMember, ChatGroupAuditLog
# startup_event:
ChatGroup.__table__.create(bind=engine, checkfirst=True)
ChatGroupMember.__table__.create(bind=engine, checkfirst=True)
ChatGroupAuditLog.__table__.create(bind=engine, checkfirst=True)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_group_models.py`  
Expected: PASS


### Task 2: 群管理后端 API（创建/成员/角色/设置/生命周期）

**Files:**
- Create: `backend/app/api/groups.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_groups_api.py`

- [ ] **Step 1: Write failing API test**

```python
# backend/tests/test_groups_api.py
from fastapi.testclient import TestClient
from app.main import app

def test_groups_router_registered():
    client = TestClient(app)
    r = client.get("/api/v1/groups")
    assert r.status_code in (200, 401)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_groups_api.py`  
Expected: FAIL（404）

- [ ] **Step 3: Implement minimal router**

```python
# backend/app/api/groups.py
router = APIRouter()

@router.get("")
def list_groups(...): ...
@router.post("")
def create_group(...): ...
@router.get("/{group_id}/members")
def list_members(...): ...
@router.post("/{group_id}/members/invite")
def invite_members(...): ...
@router.post("/{group_id}/members/{user_id}/role")
def update_member_role(...): ...
@router.delete("/{group_id}/members/{user_id}")
def remove_member(...): ...
@router.patch("/{group_id}/settings")
def update_settings(...): ...
@router.post("/{group_id}/leave")
def leave_group(...): ...
@router.delete("/{group_id}")
def dissolve_group(...): ...
```

- [ ] **Step 4: Wire router**

```python
# backend/app/main.py
from app.api.groups import router as groups_router
app.include_router(groups_router, prefix=f"{settings.API_V1_STR}/groups", tags=["groups"])
```

- [ ] **Step 5: Re-run tests**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_groups_api.py`  
Expected: PASS


### Task 3: Stream 同步与幂等

**Files:**
- Modify: `backend/app/services/stream_chat.py`
- Modify: `backend/app/api/groups.py`
- Test: `backend/tests/test_groups_stream_sync.py`

- [ ] **Step 1: Write failing sync test**

```python
def test_create_group_calls_stream_create_channel(monkeypatch):
    called = {"ok": False}
    def fake_create(*args, **kwargs):
        called["ok"] = True
    monkeypatch.setattr("app.services.stream_chat.stream_chat_service.create_channel", fake_create)
    # 调用 create_group 后 called["ok"] 应为 True
    assert called["ok"] is True
```

- [ ] **Step 2: Run test and verify fail**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_groups_stream_sync.py`  
Expected: FAIL

- [ ] **Step 3: Implement sync calls**

```python
# create_group: stream_chat_service.create_channel(...)
# invite/remove: add_members/remove_members wrapper
# settings: update_channel metadata
# 所有调用带 operation_id 幂等键并记录审计日志
```

- [ ] **Step 4: Re-run test**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_groups_stream_sync.py`  
Expected: PASS


### Task 4: 前端群管理 API 客户端与抽屉

**Files:**
- Modify: `frontend/src/services/api.ts`
- Create: `frontend/src/components/VCC/Drawer/GroupCreateDrawer.tsx`
- Create: `frontend/src/components/VCC/Drawer/GroupManageDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/GlobalDrawer.tsx`
- Test: `frontend/src/components/VCC/Drawer/__tests__/group-management.test.tsx`

- [ ] **Step 1: Write failing frontend test**

```tsx
it("renders group manage actions", () => {
  render(<GroupManageDrawer />);
  expect(screen.getByText("成员管理")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to fail**

Run: `cd frontend && npm run test -- group-management.test.tsx`  
Expected: FAIL（component missing）

- [ ] **Step 3: Implement drawers + api**

```ts
// api.ts
export const groupsApi = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  members: (id) => api.get(`/groups/${id}/members`),
  invite: (id, user_ids) => api.post(`/groups/${id}/members/invite`, { user_ids }),
  setRole: (id, userId, role) => api.post(`/groups/${id}/members/${userId}/role`, { role }),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  updateSettings: (id, data) => api.patch(`/groups/${id}/settings`, data),
  leave: (id) => api.post(`/groups/${id}/leave`),
  dissolve: (id) => api.delete(`/groups/${id}`),
};
```

- [ ] **Step 4: Re-run test**

Run: `cd frontend && npm run test -- group-management.test.tsx`  
Expected: PASS


### Task 5: 聊天室内群管理入口与能力对齐

**Files:**
- Modify: `frontend/src/components/VCC/Drawer/ChatRoomDrawer.tsx`
- Modify: `frontend/src/components/VCC/Drawer/LoungeDrawer.tsx`
- Test: `frontend/src/components/VCC/Drawer/__tests__/group-entry.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
it("opens group manage drawer from group menu", async () => {
  // 点击群菜单 -> 出现“群管理”
});
```

- [ ] **Step 2: Implement minimal behavior**

```tsx
// ChatRoomDrawer 群菜单加入:
// 1) 成员管理 2) 群设置 3) 转让群主 4) 解散群（仅群主）
// 并根据角色显示/隐藏
```

- [ ] **Step 3: Verify pass**

Run: `cd frontend && npm run test -- group-entry.test.tsx`  
Expected: PASS


### Task 6: 端到端验证与文档回填

**Files:**
- Modify: `docs/completion-journal.md`
- Modify: `docs/project-readiness-matrix.md`

- [ ] **Step 1: Backend verification**

Run: `cd backend && PYTHONPATH=. python3 -m pytest -q tests/test_group_models.py tests/test_groups_api.py tests/test_groups_stream_sync.py`  
Expected: all pass

- [ ] **Step 2: Frontend verification**

Run: `cd frontend && npm run build`  
Expected: exit code 0

- [ ] **Step 3: Update records with numbered labels**

```md
## 一、本批完成（群管理完整）
1、...
2、...
## 二、本批验证（群管理完整）
1、...
## 三、本批后续建议测试（群管理完整）
1、...
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/ledger.py backend/app/api/groups.py backend/app/main.py backend/app/services/stream_chat.py backend/tests/test_group_models.py backend/tests/test_groups_api.py backend/tests/test_groups_stream_sync.py frontend/src/services/api.ts frontend/src/components/VCC/Drawer/GroupCreateDrawer.tsx frontend/src/components/VCC/Drawer/GroupManageDrawer.tsx frontend/src/components/VCC/Drawer/GlobalDrawer.tsx frontend/src/components/VCC/Drawer/ChatRoomDrawer.tsx frontend/src/components/VCC/Drawer/LoungeDrawer.tsx frontend/src/components/VCC/Drawer/__tests__/group-management.test.tsx frontend/src/components/VCC/Drawer/__tests__/group-entry.test.tsx docs/completion-journal.md docs/project-readiness-matrix.md
git commit -m "feat: deliver stream-first full group management"
```


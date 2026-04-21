# Social Official Topic Pinning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持“官方活动/话题动态”发布与置顶，并在动态流中稳定前置展示。

**Architecture:** 在现有 `social` 接口上扩展官方发布与置顶管理能力；将置顶/官方标记写入 `SquareActivity.metadata_json`；列表接口统一排序“置顶优先、时间次之”，前端直接消费新字段渲染。

**Tech Stack:** FastAPI + SQLAlchemy + React + TypeScript

---

### Task 1: 后端能力扩展（官方发布 + 置顶）

**Files:**
- Modify: `backend/app/api/social.py`

- [ ] 新增 `OfficialActivityCreatePayload` 与 `PinActivityPayload`
- [ ] 新增 `POST /social/official/activities`（仅 admin）
- [ ] 新增 `PUT /social/activities/{id}/pin`（仅 admin）
- [ ] 在序列化中增加 `is_official`、`official_type`、`pinned`
- [ ] 调整列表排序为“`pinned=true` 优先，再 `created_at desc`”

### Task 2: 前端 API 与渲染接线

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/components/VCC/Drawer/SquareDrawer.tsx`
- Modify: `frontend/src/components/VCC/Desktop/DesktopSocialView.tsx`

- [ ] 扩展 `socialApi.createOfficialActivity` 与 `socialApi.pinActivity`
- [ ] 在 Feed 卡片增加“官方/置顶”标识渲染
- [ ] 在 admin 用户视角增加“置顶/取消置顶”入口并回刷列表

### Task 3: 回归验证与文档回填

**Files:**
- Modify: `backend/tests/test_social_official_pinning.py`（新增）
- Modify: `docs/project-readiness-matrix.md`

- [ ] 新增后端单测：排序规则 + 权限门禁
- [ ] 运行目标测试与前端构建
- [ ] 更新 `project-readiness-matrix` 本轮结果

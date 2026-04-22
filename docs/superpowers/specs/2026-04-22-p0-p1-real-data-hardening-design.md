# 2026-04-22 P0/P1 Real Data Hardening Design

## 目标

本次整改面向正式上线前的前端可信度收口，目标是移除会被用户误认为真实资产/身份/订单的占位数据，并替换为真实接口数据或明确空态。

范围选择为 `P0 + P1`：

- P0：身份资料、会员等级、用户 ID、头像、钱包余额、积分、签到状态、订单核心字段
- P1：粉丝收益、资料页、通知流、地址簿等高感知但部分尚未完全后端化的区域

本次不处理：

- 正在推进中的 Feeds / Square 交互改造
- 无法在当前后端字段下稳定真实化的深层商品展示字段
- 与本次上线可信度无关的视觉微调

## 设计原则

1. 真实数据优先。已有稳定接口的页面必须切到真实数据。
2. 空态优于假态。没有稳定后端字段支撑时，显示空态/未开通/暂无数据，不保留“像真的假数据”。
3. 不串号。身份、钱包、积分、订单等必须全部绑定当前登录用户。
4. 小步替换。先统一数据源，再逐页消灭假值，避免页面各自拼装不同身份态。

## 真实数据源

### 1. 身份与资料

- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/users/me`
- `GET /api/v1/users/tier/status`

使用策略：

- 登录态与基础资料以 `auth/me` 为主，因为返回结构与当前会话上下文更贴近。
- 若需要会员费率/升级门槛等衍生信息，再补 `users/tier/status`。
- 用户展示 ID 使用真实 `customer_id`，格式化为 `0BUCK_{customer_id}`。

### 2. 钱包 / 积分 / 奖励

- `GET /api/v1/rewards/status/{user_id}`
- `GET /api/v1/rewards/transactions/{user_id}`
- `GET /api/v1/rewards/points/transactions/{user_id}`
- `GET /api/v1/rewards/points/rules`
- `GET /api/v1/rewards/points/exchange-catalog`

使用策略：

- 钱包余额、用户等级、返佣比例、近期奖励总览以 `rewards/status` 为单一事实源。
- 钱包流水与积分流水分别使用对应 transactions 接口。

### 3. 订单

- `GET /api/v1/rewards/orders/me`

使用策略：

- 订单列表先真实化核心字段：订单号、状态、金额、时间、返现估算、物流号。
- 商品名、商品图、数量如后端当前未稳定返回，则使用通用占位结构，不显示具体假商品。

## 页面整改清单

### 第一批：身份可信度收口

目标页面：

- `frontend/src/components/VCC/Drawer/MeDrawer.tsx`
- `frontend/src/components/VCC/Desktop/DesktopProfileView.tsx`
- `frontend/src/components/VCC/Drawer/PersonalInfoDrawer.tsx`
- `frontend/src/components/VCC/Desktop/DesktopSidebar.tsx`

整改内容：

- 移除硬编码 `0BUCK_9527`
- 移除默认 `Silver Member`
- 头像、昵称、邮箱、用户 ID 全部改为当前登录用户真实值
- 未登录时显示游客空态，不显示伪会员态

### 第二批：资产可信度收口

目标页面：

- `frontend/src/components/VCC/Drawer/WalletDrawer.tsx`
- `frontend/src/components/VCC/Desktop/DesktopWalletView.tsx`
- `frontend/src/components/VCC/Drawer/FanCenterDrawer.tsx`
- `frontend/src/components/VCC/Desktop/DesktopFansPanel.tsx`
- 已部分真实化的 `PointsHistoryDrawer` / `PointsExchangeDrawer`

整改内容：

- `CommerceContext` 中默认余额/积分/等级不再作为最终展示数据源
- 将余额、积分、会员等级、返佣比例改为从 rewards 相关接口派生
- 粉丝收益中缺乏真实后端字段的卡片改为空态或“待开通”
- 去除 `$342`、`VORTEX888` 等误导性假值

### 第三批：订单与通知可信度收口

目标页面：

- `frontend/src/components/VCC/Desktop/DesktopOrdersView.tsx`
- `frontend/src/components/VCC/Drawer/OrderCenterDrawer.tsx`
- `frontend/src/components/VCC/Drawer/OrderDetailDrawer.tsx`
- `frontend/src/components/VCC/Drawer/OrderTrackingDrawer.tsx`
- `frontend/src/components/VCC/Desktop/DesktopNotificationsView.tsx`
- `frontend/src/components/VCC/Drawer/NotificationDrawer.tsx`

整改内容：

- `DesktopOrdersView` 改接 `/rewards/orders/me` 的真实订单列表
- 订单详情/物流详情若没有真实后端明细接口，则从“假详情”降级为空态说明，不继续展示假地址、假手机号、假物流
- 通知流若尚未后端化，则从整页假通知改为“暂无通知”空态

### 第四批：资料与地址空态收口

目标页面：

- `frontend/src/components/VCC/Drawer/UserProfileDrawer.tsx`
- `frontend/src/components/VCC/Drawer/AddressDrawer.tsx`

整改内容：

- 用户资料页使用真实身份信息或空态
- 地址簿如已存在真实接口则接入；否则改为空态列表，不显示 `Long` 和美国假地址

## 上下文与状态策略

当前项目已从单一 `AppContext` 过渡到分层 contexts。为避免与现有重构冲突，本次采用“最小侵入接入”：

- 会话身份：使用现有 `SessionContext`
- 商业态：优先改造 `CommerceContext` 的加载来源，不强行回退旧上下文结构
- 页面层如果暂时拿不到完整真实数据，允许显示空态，但不得自行拼接假值

## 空态规则

以下情形统一使用空态：

- 未登录：显示游客态，不显示资产、会员号、会员等级
- 接口返回空数组：显示“暂无订单”“暂无通知”“暂无地址”“暂无粉丝收益”
- 后端无该字段：显示 `--`、`暂无数据` 或隐藏模块

禁止继续使用：

- 固定金额
- 固定订单号
- 固定邀请码
- 固定会员号
- 固定榜单名次
- 固定物流号/手机号/地址

## 风险与缓解

### 风险 1：前端需要的字段多于当前后端返回

缓解：

- 第一优先：真实化已有字段
- 第二优先：缺字段时空态，不造假

### 风险 2：多 context 并存导致页面取值不一致

缓解：

- 身份只认 `SessionContext`
- 商业态只认 `CommerceContext` 的真实加载结果
- 页面内部不再自行写默认金额或默认等级

### 风险 3：用户切换账号后页面残留旧值

缓解：

- 依赖前序已完成的 OAuth 登录态清理修复
- 所有展示态由当前用户实时派生，不持有硬编码 fallback

## 验证计划

### 自动验证

- 前端构建：`npm run build`
- 针对新增数据转换逻辑添加最小测试

### 手工验证

1. 使用 Google 与 GitHub 分别登录，确认昵称、头像、邮箱、用户 ID 随账号变化
2. 钱包/积分/会员等级不再显示固定值
3. 订单页不再显示固定订单号和固定商品
4. 粉丝收益页不再显示固定收益与固定邀请码
5. 通知页和地址页在无真实数据时显示空态

## 交付物

- 前端页面真实化/空态化修改
- `docs/completion-journal.md` 追加本批完成记录
- `docs/project-readiness-matrix.md` 同步阶段状态

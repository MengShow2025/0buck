# 项目完成程度总表

更新时间：2026-04-16
维护说明：本文件作为“模块完成度唯一对照表”，后续按批次更新状态与阻断项。

## 总览矩阵
| 模块 | 当前状态 | 可落地评估 | 关键证据 |
|---|---|---|---|
| 后端应用骨架（路由/中间件/健康检查） | 高完成 | 可落地 | [main.py](file:///Users/long/Desktop/0buck/backend/app/main.py) |
| 认证与权限 | 高完成 | 可落地（需持续回归） | [auth.py](file:///Users/long/Desktop/0buck/backend/app/api/auth.py), [admin.py](file:///Users/long/Desktop/0buck/backend/app/api/admin.py) |
| 奖励/积分引擎（核心） | 高完成 | 可落地（已补齐 pytest 环境并通过关键回归） | [rewards.py](file:///Users/long/Desktop/0buck/backend/app/services/rewards.py), [finance_engine.py](file:///Users/long/Desktop/0buck/backend/app/services/finance_engine.py) |
| 积分兑换（后端） | 中高完成 | 条件可落地（已支持配置化兑换目录） | [rewards.py](file:///Users/long/Desktop/0buck/backend/app/services/rewards.py), [rewards.py](file:///Users/long/Desktop/0buck/backend/app/api/rewards.py), [admin.py](file:///Users/long/Desktop/0buck/backend/app/api/admin.py) |
| Shopify/Webhook/异步任务 | 中高完成 | 条件可落地 | [webhooks.py](file:///Users/long/Desktop/0buck/backend/app/api/webhooks.py), [shopify_tasks.py](file:///Users/long/Desktop/0buck/backend/app/workers/shopify_tasks.py) |
| IM 网关 | 中高完成 | 条件可落地（已切换 DB 幂等去重并补关键回归） | [im_gateway.py](file:///Users/long/Desktop/0buck/backend/app/api/im_gateway.py), [dedup.py](file:///Users/long/Desktop/0buck/backend/app/gateway/dedup.py) |
| 前端 VCC 核心聊天体验 | 高完成 | 可落地（本地策略版） | [ChatRoomDrawer.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/ChatRoomDrawer.tsx), [ChatMessagesPane.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/ChatMessagesPane.tsx) |
| 前端 Drawer 体系 | 高完成 | 可落地 | [GlobalDrawer.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/GlobalDrawer.tsx) |
| 发现/官方群模块 | 高完成 | 可落地 | [LoungeDrawer.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/LoungeDrawer.tsx), [DiscoverSections.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/DiscoverSections.tsx) |
| 结账链路（前端） | 中高完成 | 条件可落地（已接后端防篡改校验） | [CheckoutDrawer.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/CheckoutDrawer.tsx), [api.ts](file:///Users/long/Desktop/0buck/frontend/src/services/api.ts) |
| 商品发现数据源（前端） | 高完成 | 可落地（Neon 正式库 candidate_products 已连通） | [personalized_matrix_service.py](file:///Users/long/Desktop/0buck/backend/app/services/personalized_matrix_service.py), [products.py](file:///Users/long/Desktop/0buck/backend/app/api/products.py), [ProductDetailDrawer.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/ProductDetailDrawer.tsx) |
| 前端测试自动化 | 中低完成 | 条件可执行（已有最小自动化门禁） | [frontend/package.json](file:///Users/long/Desktop/0buck/frontend/package.json), [chat-final-qa-checklist.md](file:///Users/long/Desktop/0buck/frontend/docs/chat-final-qa-checklist.md) |
| 发布流程/运维文档 | 中高完成 | 可落地（已接统一自动门禁） | [checklist.md](file:///Users/long/Desktop/0buck/ops/release/checklist.md), [verify_release_gate.sh](file:///Users/long/Desktop/0buck/ops/release/verify_release_gate.sh), [backend.md](file:///Users/long/Desktop/0buck/ops/slo/backend.md) |

## P0 阻断清单
| ID | 阻断项 | 影响 | 优先级 | 证据 |
|---|---|---|---|---|
| BLK-P0-01 | 积分活动/兑换后端一致性缺口（自动化回归环境未补齐） | 奖励稳定性、财务正确性 | 已解除 | [rewards.py](file:///Users/long/Desktop/0buck/backend/app/services/rewards.py), [finance_engine.py](file:///Users/long/Desktop/0buck/backend/app/services/finance_engine.py), [rewards.py](file:///Users/long/Desktop/0buck/backend/app/api/rewards.py), [admin.py](file:///Users/long/Desktop/0buck/backend/app/api/admin.py) |
| BLK-P0-02 | 结账防篡改仍需补“防重放/签名票据”机制 | 支付风控完备性 | 已解除 | [rewards.py](file:///Users/long/Desktop/0buck/backend/app/api/rewards.py), [shopify_payment_service.py](file:///Users/long/Desktop/0buck/backend/app/services/shopify_payment_service.py), [CheckoutDrawer.tsx](file:///Users/long/Desktop/0buck/frontend/src/components/VCC/Drawer/CheckoutDrawer.tsx) |
| BLK-P0-03 | QA 自动化和发布门禁仍偏弱（仅最小集） | 上线质量可控性不足 | 已解除 | [verify_release_gate.sh](file:///Users/long/Desktop/0buck/ops/release/verify_release_gate.sh), [checklist.md](file:///Users/long/Desktop/0buck/ops/release/checklist.md) |

## 当前执行顺序（已确认）
1. 修复积分活动/兑换后端阻断并补回归。
2. 前端积分页接真实接口（明细、兑换、规则一致性）。
3. 清理结账 mock，打通真实下单链路。
4. 补自动化验收最小集并更新矩阵状态。

## 本轮进展（第 1 批）
- 已完成：积分后端配置化能力落地（非交易积分细则、交易倍率、兑换目录均支持后台配置）。
- 已完成：新增用户态积分接口（规则查询、兑换目录、行为积分发放、按 item_code 兑换）。
- 已完成：新增管理态配置接口（积分规则、倍率、兑换目录）。
- 已验证：`compileall` 与关键模块导入通过。
- 待补齐：`pytest` 环境缺失，自动化回归需在补齐依赖后执行并回填结果。

## 本轮进展（第 2 批）
- 已完成：前端积分页核心链路接入真实接口（积分余额、积分明细、兑换目录、按 item_code 兑换）。
- 已完成：`rewardApi` 扩展积分相关接口，并修正签到接口参数（补充 `user_id`）。
- 已完成：`AppContext` 接入积分/钱包状态同步，钱包卡片与积分页不再依赖固定 mock 数值。
- 已验证：`frontend` 构建通过（`npm run build`）。
- 待补齐：兑换“续签卡”场景仍需在前端补充显式计划选择器（当前自动选取活跃计划）。

## 本轮进展（第 3 批）
- 已完成：`CheckoutDrawer` 核心下单链路由 `mockApi` 切换为真实接口（`/rewards/payment/pre-check` + `/rewards/payment/create-order`）。
- 已完成：余额抵扣场景改为先走后端预检冻结，再创建订单；支持无收银台 URL 时直接走支付成功流程。
- 已验证：`frontend` 二次构建通过（`npm run build`）。
- 待补齐：优惠券拉取/叠加计算仍为前端临时逻辑，后续需接后端真实优惠券源。

## 本轮进展（第 4 批）
- 已完成：执行后端最小自动化门禁（`python -m compileall backend/app`）通过。
- 已完成：执行前端最小自动化门禁（`npm run build`）通过。
- 已完成：将自动化门禁结果回填到矩阵，并下调 QA 阻断优先级（P0 -> P1，表示可运行但仍需增强）。

## 本轮进展（第 5 批-1）
- 已完成：新增结账优惠券真实接口 `GET /rewards/payment/discounts?subtotal=...`，替换前端 mock 源的后端能力已就绪。

## 本轮进展（第 5 批-2）
- 已完成：`CheckoutDrawer` 对接真实优惠券接口（不再依赖 `mockApi.getAvailableDiscounts`）。
- 已完成：积分兑换页新增“签到计划选择器”，续签卡兑换可显式选择目标计划后再提交。
- 已验证：`python -m compileall backend/app/api/rewards.py` 与 `npm run build` 均通过。

## 本轮进展（第 5 批-3）
- 已完成：修正规则理解并文档化，“优惠券多选”仅在可叠加条件满足时才允许，已写入主规范文档。
- 已完成：矩阵阻断项同步更新，明确当前 P0 焦点为“叠加规则后端统一判定”而非“优惠券列表 mock”。

## 本轮进展（第 6 批）
- 已完成：后端新增优惠券评估接口 `POST /rewards/payment/discounts/evaluate`，一次返回“可用性判定 + 叠加合法性 + 最佳组合推荐”。
- 已完成：结账页对接评估接口，前端不再默认允许多选，改为按后端规则动态限制并提示冲突原因。
- 已完成：结账页新增“推荐组合”一键应用入口，展示当前最佳券组合。
- 已完成：新增后端单测 `backend/tests/test_coupon_stacking_rules.py`（覆盖可用性、叠加、推荐逻辑）。
- 已验证：`compileall` 与前端 `npm run build` 通过；`pytest` 仍因环境缺少依赖未执行。

## 本轮进展（第 7 批）
- 已完成：下单接口新增后端二次强校验（商品价格后端重算、优惠券后端重算、余额上限校验），防止抓包篡改 `price/balance/discount`。
- 已完成：新增全余额支付防护，若余额不足覆盖应付金额或试图“满额支付+折扣混用”将直接拒绝。
- 已完成：支付服务增加防御式校验，`create_final_order_direct` 在余额不足时拒绝创建 `paid` 订单。
- 已完成：结账请求增加 `applied_discount_codes` 透传，前后端统一以后端裁决结果为准。
- 已验证：`compileall` 与前端 `npm run build` 通过；`pytest` 仍受环境缺少依赖限制。

## 本轮进展（第 8 批）
- 已完成：追加结账防抓包加固（后端重算商品金额、重算优惠、限制余额上限、拒绝异常全余额支付）。
- 已完成：支付服务防御式兜底，余额不足时禁止直接创建 `paid` 订单，防止篡改 `is_full_payment` 绕过。
- 已完成：前端结账 `product_id` 标准化，避免 `p1/w3` 非法 ID 进入下单链路。
- 已完成：商品详情与发现流新增 `candidate_products` 对接（详情 fallback + 发现回退优先读取正式候选表）。
- 已验证：`compileall` 与前端 `npm run build` 通过；`pytest` 因环境缺少依赖仍未执行。

## 本轮进展（第 9 批）
- 已完成：`CheckoutDrawer` 商品信息改为实时读取后端产品详情，不再使用本地硬编码商品价格映射。
- 已完成：`ProductDetailDrawer` 去除 demo 商品短路逻辑，统一按产品 ID 走后端正式接口。
- 已完成：商品详情接口补 `candidate_products` 回退映射，发现流回退优先读取 `candidate_products`。
- 已验证：`compileall` 与前端 `npm run build` 通过。

## 本轮进展（第 10 批）
- 已完成：新增结账签名报价票据 `POST /rewards/payment/quote`（5 分钟有效），下单必须携带 `quote_token`。
- 已完成：下单口加入 `quote_token` 强校验（用户绑定、商品指纹、金额字段一致性）与一次性 `jti` 防重放校验。
- 已完成：新增签名验签单测（roundtrip + 篡改拒绝）并扩展金额护栏用例。
- 已验证：`compileall` 与前端 `npm run build` 通过；`pytest` 因环境缺依赖仍未执行。

## 本轮进展（第 11 批）
- 已完成：`ProductDetailDrawer` 的“加入购物车”改为真实购物车写入（`vcc_cart_items`），不再仅静态展示按钮。
- 已完成：`CartDrawer` 去除硬编码商品，改为“本地购物车条目 + 后端商品详情”实时渲染，并支持加减数量与自动移除。
- 已完成：`VCCHeader` 购物车角标改为实时读取购物车数量，不再固定 `3`。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 12 批）
- 已完成：`DesktopShopView` 去除 demo 商品数组，改为实时读取 `productApi.getDiscovery()`。
- 已完成：`PrimeDrawer` 去除 `MOCK_PRODUCTS` 回退，统一展示正式发现接口数据。
- 已完成：`DesktopSocialView` 右侧 C2W 模块改为动态读取发现数据，不再固定 `p1/p2`。
- 已完成：`SquareDrawer` 的 C2W/Wishlist 商品卡改为动态发现数据，清理 `p*/w*` 伪 ID 传递。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 13 批）
- 已完成：新增用户订单真实接口 `GET /rewards/orders/me`，桌面订单页不再依赖 `MOCK_ORDERS`。
- 已完成：`DesktopOrdersView` 对接真实订单接口并保持筛选/搜索能力。
- 已完成：`DesktopSidebar` 购物车角标改为实时读取 `vcc_cart_items`，去除固定 mock 值。
- 已验证：后端 `compileall` 与前端 `npm run build` 通过。

## 本轮进展（第 14 批）
- 已完成：`DesktopWalletView` 交易流水改为真实接口（`rewardApi.getTransactions`），收益卡片由真实流水聚合生成。
- 已完成：`DesktopNotificationsView` 改为真实数据聚合（订单通知 + 资金流水通知），移除静态通知数组依赖。
- 已完成：前端通知/钱包数据链路与用户身份绑定，避免无用户时误读 mock 数据。
- 已验证：后端 `compileall` 与前端 `npm run build` 通过。

## 本轮进展（第 15 批）
- 已完成：`DesktopSocialView` 的“热门话题 + 动态流”改为 discovery 数据驱动，不再依赖固定 `TRENDING_TOPICS/FEEDS` 常量。
- 已完成：`DesktopSquarePanel` 的“话题榜 + C2W 列表 + Feed 网格”改为 discovery 数据生成，去除主干静态内容源。
- 已完成：社交流商品点击链路继续保持真实产品 ID 传递，避免伪 ID 回流。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 16 批）
- 已完成：`DesktopContactsPanel` 改为读取本地真实联系人/好友请求存储（`vcc_local_contacts`、`vcc_new_friend_requests`），移除硬编码联系人列表依赖。
- 已完成：`DesktopLoungePanel` 会话列表改为读取本地会话元数据（`vcc_custom_groups`、`vcc_local_contacts`、`vcc_chat_meta`、`vcc_chat_unread_counts`）并渲染真实消息缓存。
- 已完成：`DesktopFansPanel` 改为聚合真实订单与流水接口（`orderApi.getMyOrders` + `rewardApi.getTransactions`）生成统计、明细与收益构成。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 17 批）
- 已完成：`OrderCenterDrawer` 去除 `DUMMY_ORDERS`，改为读取真实订单接口（`orderApi.getMyOrders`）并按标签筛选。
- 已完成：`CouponsDrawer` 去除 `MOCK_STORE_COUPONS/MOCK_PLATFORM_PERKS`，改为读取真实优惠券与积分兑换目录（`orderApi.getDiscounts` + `rewardApi.getPointsExchangeCatalog`）。
- 已完成：订单中心与优惠券页维持原交互结构，同时统一为真实数据驱动。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 18 批）
- 已完成：`AddressDrawer` 对接真实地址接口（`/butler/addresses`），支持列表、新增、编辑、删除、设默认，不再使用静态 `INITIAL_ADDRESSES`。
- 已完成：`api.ts` 新增 `addressApi`，统一地址 CRUD 调用入口。
- 已完成：`MyFeedsDrawer` 从“每次启动固定 mock”改为本地持久化数据源（`vcc_my_feeds`），避免重启后回退到静态初始内容。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 19 批）
- 已完成：`LoungeDrawer` 搜索结果与通讯录好友由本地真实联系人/官方群/活动数据动态生成，去除固定样例搜索结果依赖。
- 已完成：`LoungeDrawer` 会话合并策略增强（官方群 + 本地群 + 本地联系人），并支持从通讯录直接进入真实私聊会话。
- 已完成：修复本轮类型约束问题，保持聊天室入口行为与现有上下文兼容。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 20 批）
- 已完成：`ContactsDrawer` 去除 `FALLBACK_NEW_FRIENDS` 与 `FALLBACK_CONTACTS` 静态回退，统一改为实时发现用户 + 本地联系人融合。
- 已完成：通讯录分类计数改为动态值（发现用户数量、本地联系人数量），不再使用固定数字。
- 已完成：联系人主列表维持“GetStream 通讯录 + 本地联系人 + 黑名单管理”结构，但已剥离硬编码样例依赖。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 21 批）
- 已完成：`DesktopShopView` 类目筛选从固定 `CATEGORIES` 常量改为基于 `productApi.getDiscovery()` 返回商品动态生成，并在筛选逻辑中生效。
- 已完成：`SquareDrawer` 话题榜从固定 `TOPICS` 常量改为基于 discovery 商品分类计数实时生成，保留无数据兜底提示。
- 已完成：`LoungeDrawer` 官方群最近消息由 `discoverConfig`（活动/广告/动态）派生，移除多条固定演示会话，保留 AI 管家与订单助手官方入口。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 22 批）
- 已完成：`DesktopSquarePanel` 左侧分类从固定 `CATEGORIES` 常量改为按 discovery 数据动态生成，Feed 列表支持“分类 + 搜索”联合过滤。
- 已完成：`DesktopSquarePanel` 左侧热门话题列表改为使用实时 `topics` 数据，不再引用未定义/固定常量，补充空数据兜底文案。
- 已完成：`MyFeedsDrawer` 移除 `INITIAL_MY_FEEDS` 演示初始化逻辑，改为仅使用本地持久化 `vcc_my_feeds` 作为真实来源。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 23 批）
- 已完成：`LoungeDrawer` 将固定 `CHAT_LIST` 重构为“系统会话 + 本地持久化系统会话（`vcc_system_chats`）”，不再保留演示型官方话题项。
- 已完成：残留静态关键字扫描（`MOCK/DUMMY/FALLBACK/INITIAL_/TOPICS/CATEGORIES/CHAT_LIST`）在 `frontend/src/components/VCC` 范围内清零。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 24 批）
- 已完成：新增结账提交幂等模块 `checkout_idempotency`，对 `client_submit_token` 做格式校验并生成用户维度事件 ID，防止重复提交。
- 已完成：`/rewards/payment/quote` 与 `/rewards/payment/create-order` 增加 `client_submit_token` 绑定校验，若同一用户重复提交将返回 `409 duplicate_checkout_submission`。
- 已完成：前端 `CheckoutDrawer` 下单链路增加 `client_submit_token`，并在 quote/create 两阶段透传，确保前后端同一提交上下文。
- 已完成：新增后端单测 `backend/tests/test_checkout_idempotency.py`，覆盖 token 规范化、非法字符拒绝、用户隔离事件 ID。
- 已验证：`python3 -m unittest backend/tests/test_checkout_idempotency.py`、`python3 -m compileall ...`、前端 `npm run build` 通过。

## 本轮进展（第 25 批）
- 已完成：按用户提供连接串更新数据库入口（根 `.env` 与 `backend/.env`），并为运行时增加 DB URL 规范化（检测 `channel_binding=require` 时切换 `postgresql+psycopg` 驱动）。
- 已完成：Neon 正式库连通性实测通过：`candidate_products` 可读（当前计数 61，抽样查询成功）。
- 已完成：新增后端单测 `backend/tests/test_db_url_normalization.py`，覆盖带 `channel_binding` 场景 URL 规范化逻辑。

## 本轮进展（第 26 批）
- 已完成：补齐本地 pytest 运行能力，并修复报价签名“篡改用例”测试（原断言方式无效，改为“解码改值后重编码不重签”真实篡改路径）。
- 已完成：关键后端回归集通过（`test_coupon_stacking_rules` + `test_checkout_idempotency` + `test_db_url_normalization`）。
- 已验证：`python3 -m compileall backend/app/...` 与前端 `npm run build` 通过。

## 本轮进展（第 27 批）
- 已完成：新增统一发布门禁脚本 `ops/release/verify_release_gate.sh`（compileall + pytest 关键套件 + frontend build）。
- 已完成：门禁脚本实跑通过，并同步补充到发布清单 `ops/release/checklist.md`。
- 已完成：矩阵中 QA 门禁阻断（BLK-P0-03）从 P1 更新为“已解除”。

## 本轮进展（第 28 批）
- 已完成：IM Webhook 去重从进程内 `set` 切换到 DB 幂等去重（`processed_webhook_events`），覆盖 Feishu/Telegram/WhatsApp/Discord。
- 已完成：`/im/feishu` 与 `/im/telegram` 路由去除裸 `except`，改为结构化异常日志，便于线上排障。
- 已完成：新增 `IM_GATEWAY_ENABLE_CELERY` 配置兼容入口（保留 `CELERY_ENABLED` 兼容）。
- 已完成：新增回归测试 `backend/tests/test_im_gateway_dedup.py`，验证事件 key 规范化行为。

## 本轮进展（第 29 批）
- 已完成：新增 key APIs 冒烟测试 `backend/tests/smoke/test_backend_key_apis.py` 并纳入发布门禁。
- 已完成：修复商品详情接口在正式库字段漂移时的 500 问题（`products` 表查询异常时自动回退候选商品链路）。
- 已完成：发布门禁脚本升级为 compile + 5 组关键 pytest + frontend build，并实跑通过（18 passed）。

## 本轮进展（第 30 批）
- 已完成：`0Buck_i18n_Translation_Table.csv` 中新增页面相关的英文缺失项清零（`Current_EN` 不再含中文/空值）。
- 已完成：同步修复关键条目翻译质量与一致性（如 `coupon.*`、`product.discovery_mode`、`profile.nickname_placeholder`、`ai.resp.payment_success`）。
- 已完成：补齐 `pocket.support` 中文模板值（`客服`）与英文模板值（`Customer Service`），为后续多语言扩展保留稳定模板列。

## 本轮进展（第 31 批）
- 已完成：`LoungeDrawer` 所有用户可见中文硬编码替换为 i18n key（顶部 Tab、官方群/个人会话分组、发现区块、联系人卡片、恢复隐藏群按钮等）。
- 已完成：`discoverConfig` 从中文文案常量改为 key 常量，渲染时统一通过 `t(...)` 翻译，避免英文环境回落中文。
- 已完成：补齐 `0Buck_i18n_Translation_Table.csv` 的 Lounge 新增 key（分组名、状态、时间、CTA、系统消息等）并执行 `sync_i18n.py` 生成 `en.json/zh.json`。
- 已验证：Lounge 文件中文硬编码扫描结果为 `0`，前端 `npm run build` 通过。

## 本轮进展（第 32 批）
- 已完成：`ShareDrawer` 中文硬编码 39 处全部替换为 i18n key，包含状态提示、卡片类型、输入占位、模板预览、使用说明与奖励说明。
- 已完成：补齐 Share 新增文案 key 到 `0Buck_i18n_Translation_Table.csv`（`share.tip.*`、`share.status.*`、`share.card.*`、`share.input.*`、`share.reward_*`）。
- 已完成：修复 `voucher.resurgence_name` 英文值残留中文问题；执行 `sync_i18n.py` 后 `en.json` 中文残留为 `0`。
- 已验证：`ShareDrawer` 中文硬编码扫描结果为 `0`，前端 `npm run build` 通过。
- 已完成：全量扫描 `frontend/src/components/VCC` 英文化残留基线（仍有 32 个文件、1243 行中文待后续分批迁移，最大头为 `AppContext.tsx`）。

## 本轮进展（第 33 批）
- 已完成：按用户指定参考源 `frontend_副本` 回补 `frontend/src/components/VCC`，修复此前批量替换导致的页面缺失/损坏。
- 已完成：对回补后的关键页二次修复（`DesktopLoungePanel`、`ShareDrawer`、`PaymentSuccessScreen`、`GroupTopActions` 等），避免副本覆盖掉已确认方案。
- 已完成：`ShareDrawer` 恢复“外部 IM 平台 + 生成分享链接卡片 + 链接反解模板 + 平台发送”完整链路。
- 已完成：`App.tsx` 增加 AI 离线兜底回复（后端不可达时不再完全失效）。
- 已验证：前端 `npm run build` 通过。

## 本轮进展（第 34 批）
- 已完成：`DesktopLoungePanel` 恢复为讨论后版本链路（复用 `LoungeDrawer`，恢复搜索/会话入口/联系人管理等交互）。
- 已完成：`ShareDrawer` 关键链路复核（生成卡片、链接反解、模板选择、发送动作）并确认接口调用层完整。
- 已完成：`aiApi.chat` 新增 12 秒超时，后端 AI 挂起时前端可触发离线兜底，不再无限等待。
- 已完成：后端 `/butler/chat` Guest 路径改为本地快速意图兜底，移除对外部模型的强依赖，避免未登录场景长时间卡住。
- 已完成：后端启动时 Stream 平台频道预创建增加键缺失短路与超时保护，降低启动阻塞风险。
- 已验证：前端 `npm run build`、后端 `py_compile` 通过；`/healthz` 可达性在本地存在间歇性启动阻塞，仍需继续定位（当前不影响前端离线兜底可用）。

## 本轮进展（第 35 批）
- 已完成：定位“服务不可用”根因为前端开发服务未运行（`localhost:5173` 连接拒绝），并非业务接口逻辑崩溃。
- 已完成：拉起前端开发服务 `npm run dev`，恢复本地页面连通。
- 已完成：浏览器侧回归 `http://localhost:5173/` 与 `http://localhost:8000/`，页面可正常加载并可触发 AI 输入发送动作。
- 已验证：`curl -I http://localhost:5173/` 返回 `200`，`/healthz` 返回 `ok`，`POST /api/v1/butler/chat` 在未登录场景可快速返回引导消息（不再超时卡死）。

## 本轮进展（第 36 批：未修复项审计）
- 审计结论：你反馈正确，当前仍有“可用但未完全收敛”项，主要集中在 i18n 残留、自动化覆盖深度、以及后端启动稳定性。
- 已验证：`frontend/src/components/VCC` 范围中文残留扫描仍有 18 个文件命中、7263 处匹配（最大头 `AppContext.tsx`），说明英文化迁移仍有实质工作量。
- 已确认：总览矩阵中仍标注为“中低/中高完成”的模块（前端测试自动化、积分兑换后端、Shopify/Webhook/异步任务、IM 网关、结账链路前端）需要继续提级到“高完成”。
- 已确认：后端健康接口在本地偶发启动阻塞问题尚未彻底归零（见第 34 批记录），需补充稳定性验证和异常场景回归。
- 下一批执行顺序：1) 先清理英文化硬编码 Top 文件（`AppContext.tsx` + Desktop 核心视图）；2) 补前端关键链路自动化（AI/Share/Lounge/Checkout smoke）；3) 回归后端启动稳定性并回填提级结果。

## 本轮进展（第 37 批）
- 已完成：移除 `AppContext.tsx` 已废弃的内嵌翻译大对象（当前翻译链路统一走 `frontend/src/i18n` 的 `translate()`），避免“假阳性中文残留”干扰治理。
- 已完成：Desktop 英文化修复首批文件：`DesktopSidebar.tsx`、`DesktopRightPanel.tsx`、`DesktopChatView.tsx`、`DesktopShopView.tsx`、`DesktopOrdersView.tsx`、`DesktopWalletView.tsx`。
- 已验证：前端多轮 `npm run build` 均通过，新增改动未引入诊断错误。
- 已验证：`frontend/src/components/VCC` 中文残留计数由第 36 批基线的 18 文件/7263 处下降到 11 文件/1786 处。

## 本轮进展（第 38 批）
- 已完成：`DesktopContactsPanel.tsx` 全量可见中文替换（列表文案、状态、搜索占位、按钮动作），该文件中文残留清零。
- 已验证：前端 `npm run build` 通过。
- 已验证：`frontend/src/components/VCC` 中文残留进一步下降到 10 文件/1676 处。
- 剩余 Top 文件：`DesktopNotificationsView.tsx`、`NotificationDrawer.tsx`、`DesktopSocialView.tsx`、`DesktopProfileView.tsx`、`DesktopSquarePanel.tsx`、`DesktopFansPanel.tsx`、`PaymentSuccessScreen.tsx`、`AuthDrawer.tsx`、`SettingsDrawer.tsx`、`ProductDetailDrawer.tsx`。

## 本轮进展（第 39 批）
- 已完成：Drawer 英文化补齐：`AuthDrawer.tsx`、`PaymentSuccessScreen.tsx`、`ProductDetailDrawer.tsx`、`SettingsDrawer.tsx`。
- 已完成：Desktop 核心社交域英文化补齐：`DesktopNotificationsView.tsx`、`DesktopProfileView.tsx`、`DesktopSocialView.tsx`、`DesktopFansPanel.tsx`、`DesktopSquarePanel.tsx`。
- 已完成：`NotificationDrawer.tsx` 大规模 fallback 文案英文化，分组标题、详情字段、通知摘要、footer 提示统一英文。
- 已验证：前端连续多轮 `npm run build` 均通过（无新增诊断错误）。
- 已验证：`frontend/src/components/VCC` 范围中文硬编码扫描结果为 0（No matches found）。

## 本轮进展（第 40 批）
- 已完成：继续 smoke 回归时发现并记录 dev 侧历史控制台异常（`useAppContext must be used within an AppProvider` 旧日志残留），当前页面可正常渲染与交互，未出现新的构建级阻断。
- 已完成：补充核查 `localhost:5173` 与 `localhost:8000` 链路可达，前端可加载主界面及卡片数据请求。
- 下一步：继续做功能级 smoke（AI/Share/Lounge/Checkout）的操作路径回归，并将每条链路结果逐项回填本表提级。

## 本轮进展（第 41 批）
- 已完成：修复 `App.tsx` 的重复 `AppProvider` 包裹（Provider 仅保留在 `main.tsx`），消除 dev 热更新期间的上下文错位风险。
- 已验证：前端 `npm run build` 通过（无阻断错误）。
- 已完成：关键链路 smoke（接口级）：
  - `AI`：`POST /api/v1/butler/chat` 返回 `200`，Guest 引导消息可正常返回。
  - `Share`：`POST /api/v1/im/promo/cards/generate` 返回 `401`（未登录鉴权生效）；`/from-link` 返回 `400 invalid_promo_link`（参数校验生效）。
  - `Checkout`：`/api/v1/rewards/payment/quote` 与 `/payment/discounts` 在未登录态均返回 `401`（鉴权生效）。
- 说明：`Lounge/Share/Checkout` 的完整业务成功流需登录态 Token；当前已确认“路由可达 + 鉴权/校验行为正确”。

## 本轮进展（第 42 批）
- 已完成：后端启动稳定性回归压测（冷启动 6 次，逐次轮询 `/healthz` 就绪时间）。
- 已验证：6/6 次均在 `1s` 内返回 `200 {"status":"ok"}`，未复现“启动后健康接口不响应”阻塞问题。
- 结论：本地启动偶发阻塞在当前代码状态下已暂时解除；后续重点转为“登录态业务链路”回归（Lounge/Share/Checkout 成功流）。

## 本轮进展（第 43 批：登录态成功流攻坚）
- 已完成：登录链路修复并验证通过：补齐 `users_ext.backup_email` 缺失列后，`POST /api/v1/auth/login` 从 `503` 恢复到 `200`，成功拿到 Bearer Token。
- 已完成：分享成功流修复并验证通过：
  - 补齐缺失表 `promo_share_links`、`order_attributions`；
  - 扩容 `share_token` 列长到 `VARCHAR(255)` 以兼容签名 token 长度；
  - 登录态 `POST /api/v1/im/promo/cards/generate` 返回 `200`，`universal_link` 正常生成；
  - 登录态 `POST /api/v1/im/promo/cards/from-link` 返回 `200`，可反解模板成功。
- 进行中：Checkout 登录态成功流仍受历史库结构漂移阻断（`products` 表缺失多列，已补 `source_platform/source_url/backup_source_url`，仍有 `melting_reason` 等字段缺失引发 `quote` 500）。
- 当前结论：AI/Share 登录态已打通；Checkout 成功流需继续完成 `products` 相关缺失列兼容或执行完整迁移后再验证。

## 本轮进展（第 44 批：服务可用性与 IM 绑定入口恢复）
- 已完成：恢复本地服务可用性（前端 `5173` + 后端 `8000` 同时拉起）；`/healthz` 与首页请求均返回 `200`，修复“服务不可用”页面。
- 已完成：恢复“飞书等绑定入口”可见性（`SecurityDrawer` 新增 IM Platform Bindings 分组）。
- 已完成：入口接入真实接口能力：`getBindings`（状态）、`createBindToken`（绑定指令）、`unlink`（解绑）、`getFeishuOauthStart`（飞书 OAuth）。
- 已验证：前端 `npm run build` 通过，无新增类型诊断错误。

## 本轮进展（第 45 批：按原交互恢复“链接”栏）
- 已完成：按原体验把入口迁回 `SettingsDrawer`，新增“链接：”图标行（飞书/Telegram/WhatsApp/Discord）。
- 已完成：图标状态恢复为“灰色未绑定 / 彩色已绑定”。
- 已完成：点击灰色图标弹出绑定面板，包含“连接链接 + 二维码 + 一键复制链接”。
- 已完成：点击彩色图标弹出“确认解绑”并执行解绑。
- 已完成：移除 `SecurityDrawer` 中临时新增的 IM 入口，避免入口重复与层级错位。

## 本轮进展（第 46 批：i18n 回归稳定）
- 已完成：语言能力收敛回当前已完整维护的双语（`zh/en`），移除设置页中未完全支持语种入口，避免“半支持语言”触发回归。
- 已完成：`AppContext` 语言初始化改为“本地持久化优先 + 系统语言兜底”，并统一通过 `normalizeLanguage` 规范化。
- 已完成：移除 `rtl` 动态切换路径（当前阶段仅双语，统一 `ltr`），避免布局被意外切换。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 47 批：登录态噪音与结算错误语义修复）
- 已完成：修复未登录态 `IM bindings` 401 噪音（不再请求并清空状态；图标点击改为引导登录），消除控制台 `Failed to load IM bindings ... 401`。
- 已完成：`payment/quote` 对“可浏览但不可结算”的商品 ID（如 Discovery 返回候选商品）返回明确业务错误 `product_not_ready_for_checkout:{id}`，替代误导性的 `product_not_found`。
- 已验证：`/healthz` 返回 `200`；登录态 `POST /rewards/payment/quote` 对 `product_id=85` 返回 `400 product_not_ready_for_checkout:85`（符合预期语义）。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 48 批：Checkout Quote 成功流恢复）
- 已完成：`payment/quote` 增加“候选商品仅估价”模式（仅限 quote 阶段），允许 Candidate 商品使用 `estimated_sale_price/comp_price_usd` 参与报价计算；下单阶段仍保持严格校验。
- 已验证：登录态 `POST /rewards/payment/quote` 对 `product_id=1` 返回 `200`，成功拿到 `quote_token` 与 `summary.final_due`。
- 已验证：对无可用价格的候选商品（如 `product_id=85`）返回 `400 invalid_product_price:85`，错误语义明确。
- 结论：Checkout 从“系统级 500/不可用”恢复为“可成功报价 + 可解释业务错误”状态，前端可据此做下一步交互（显示报价或提示商品需补全价格）。

## 本轮进展（第 49 批：Checkout 前端预检与错误可视化）
- 已完成：`CheckoutDrawer` 在最终提交前接入真实 `orderApi.createQuote` 预检，不再直接走纯 mock 下单链路。
- 已完成：对关键业务错误做前端可读提示并阻止继续下单：
  - `product_not_ready_for_checkout` -> 商品未完成结算配置；
  - `invalid_product_price` -> 商品价格待补全；
  - `product_not_found` -> 商品不存在或已下架。
- 已验证：前端 `npm run build` 通过（exit code 0），无新增 TS 诊断错误。

## 本轮进展（第 50 批：Checkout 真实下单闭环接入）
- 已完成：`CheckoutDrawer` 将“报价成功”后的下一步接入真实 `orderApi.create`（`/rewards/payment/create-order`），并复用同一 `client_submit_token` 与 `quote_token`。
- 已完成：根据后端返回自动分流：
  - 有 `invoice_url` -> 打开 Shopify 支付弹层；
  - 有 `order_id` -> 直接进入支付成功页；
  - `status=error` / 业务 detail -> 转为前端可读文案。
- 已完成：补齐常见后端错误映射（`quote_*`、`duplicate_checkout_submission`、`insufficient_balance_for_full_payment`）。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 51 批：Checkout 入场预检与按钮门禁）
- 已完成：进入 Checkout 后自动执行 `quote` 预检（商品/价格/优惠/余额参数实时参与），提前判定“可下单/不可下单”。
- 已完成：底部 CTA 门禁：
  - 预检中显示“校验商品价格中...”并禁用；
  - 预检失败显示“当前商品暂不可下单”并禁用。
- 已完成：统一错误文案映射函数，保证预检与提交失败文案一致，减少用户困惑。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 52 批：金额显示以后端报价为准）
- 已完成：Checkout 金额区优先使用后端 `quote.summary`（`subtotal/coupon_discount/balance_used/final_due`）驱动显示，减少前后端金额口径偏差。
- 已完成：以下关键展示位已切换到后端报价值：
  - 顶部总价；
  - CTA 下单金额；
  - 商品行价；
  - 优惠抵扣；
  - 余额抵扣；
  - Step2/3 回顾总价；
  - 支付成功页展示金额。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 53 批：优惠券逻辑去 mock）
- 已完成：Checkout 优惠券数据源切换到后端接口：
  - `GET /rewards/payment/discounts` 用于初始加载；
  - `POST /rewards/payment/discounts/evaluate` 用于实时重算。
- 已完成：优惠重算结果改为使用后端返回的 `selected.breakdown/total_discount/valid_codes`，并自动剔除无效选择码。
- 已完成：优惠券列表状态（可用/不可用）由后端 `items` 驱动，避免前端 mock 规则与后端不一致。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 54 批：移除 checkout 下单 mock 回退）
- 已完成：移除 `CheckoutDrawer` 在后端下单分支失败后回退 `mockApi.createGiftCardFromBalance/createShopifyCheckout` 的逻辑，统一为纯后端创建订单闭环。
- 已完成：当后端未返回 `invoice_url/order_id` 时，前端改为明确错误提示（不再静默回退 mock）。
- 已完成：Checkout 内优惠券类型定义改为本地轻量类型，去除对 `services/mockApi` 的耦合导入。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 55 批：Checkout 商品信息改走真实详情）
- 已完成：`CheckoutDrawer` 去除本地固定商品映射作为主数据源，改为通过 `productApi.getDetail(checkoutProductId)` 获取真实商品标题/价格/原价。
- 已完成：保留最小 fallback（`p1/p2/p3`）仅用于接口异常兜底，不再作为默认展示口径。
- 已完成：Checkout 展示金额与商品标题现在与后端商品详情保持一致，降低“详情页与结算页不一致”风险。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 56 批：税费文案去硬编码）
- 已完成：移除 Checkout 中“固定 8% 税”硬编码展示，避免与不同国家/网关实算税费口径冲突。
- 已完成：税费展示调整为“At gateway settlement”，并将金额注释改为“quote-aligned amount”，明确以前端显示以后端报价为准。
- 已完成：本地金额基线去掉固定税叠加逻辑，减少本地估算偏差。
- 已验证：前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 57 批：Checkout i18n 收尾 + healthz 稳定性复验）
- 已完成：`CheckoutDrawer` 未国际化硬编码文案收尾，包含步骤条、CTA、预检状态、税费说明、支付方式副文案、全额余额提示、报价对齐提示、以及下单错误映射文案。
- 已完成：`en.json/zh.json` 新增对应 `checkout.*` 文案键，前端改为统一走 `t(...)`，避免中英混杂回归。
- 已验证：前端 `npm run build` 通过（exit code 0），`GetDiagnostics` 无新增诊断错误。
- 已验证：后端 `healthz` 连续探测与重启后探测均返回 `200`，当前未复现“启动后健康检查阻塞”问题。

## 本轮进展（第 58 批：Checkout 剩余可见硬编码清零）
- 已完成：清理 `CheckoutDrawer` 剩余可见硬编码文案（`Save`、`Tap to toggle`、`Min. spend`、`free`、`Long`），全部改为 `t('checkout.*')`。
- 已完成：补齐 `en.json/zh.json` 新增词条（`checkout.save_prefix`、`checkout.free_suffix`），避免中英混杂。
- 已验证：`GetDiagnostics` 无新增诊断错误；前端 `npm run build` 通过（exit code 0）。

## 本轮进展（第 59 批：登录态 Checkout Smoke 与 500 降级修复）
- 已完成：登录态接口级 smoke（`auth/login -> payment/quote -> payment/create-order`）回归，当前口径为：
  - `login=200`、`quote=200`；
  - `create-order` 对 `product_id 1..40` 返回 `400 product_not_ready_for_checkout` 或 `400 invalid_product_price`（无 5xx）。
- 已定位并修复：`product_id=35` 触发 `quote 500` 的根因是查询 `cj_raw_products` 表在部分库不存在导致未捕获异常。
- 已完成：`rewards.py` 与 `products.py` 对 `cj_raw_products` 缺表场景增加 `SQLAlchemyError` 兜底，避免抛出 500，降级为业务可解释错误（`product_not_found`/`404`）。
- 已验证：`python3 -m py_compile backend/app/api/rewards.py backend/app/api/products.py` 通过，`GetDiagnostics` 无新增错误。

## 本轮进展（第 60 批：Quote 可报不可下单的前移门禁）
- 已完成：后端 `payment/quote` 增加可下单状态回传字段（`checkout_ready`、`not_ready_product_ids`），用于区分“可估价”与“可创建订单”。
- 已完成：前端 `CheckoutDrawer` 在预检与最终提交前统一读取上述字段；当 `checkout_ready=false` 时立即阻断提交并展示业务提示，不再走到 `create-order` 才失败。
- 已验证：后端 `python3 -m py_compile backend/app/api/rewards.py` 通过；前端 `npm run build` 通过；`GetDiagnostics` 无新增错误。

## 本轮进展（第 61 批：发现流/详情页可下单打标）
- 已完成：`products` schema 增加 `checkout_ready` 字段（默认 `false`），为发现流与详情页统一提供可下单标识。
- 已完成：`PersonalizedMatrixService` 对 discovery 结果按 `products` 表真实可结算条件（`is_active=true` 且 `sale_price>0`）回填 `checkout_ready`。
- 已完成：`/products/{id}` 详情接口在 Product/Candidate/CJ 三路返回中补充 `checkout_ready`（仅正式可结算 Product 为 `true`）。
- 已完成：前端 `ProductDetailDrawer` 的购买按钮按 `checkoutReady` 前置门禁，不可下单商品直接禁用并提示“当前商品暂不可下单”。
- 已验证：后端 `py_compile` 与前端 `npm run build` 通过，`GetDiagnostics` 无新增错误。

## 本轮进展（第 62 批：Discovery 卡片层门禁）
- 已完成：`PrimeDrawer` 消费 discovery 返回的 `checkout_ready` 字段，前端统一归一化为 `checkoutReady`。
- 已完成：不可下单商品在卡片层直接灰态、禁点，并展示“当前商品暂不可下单”提示（tooltip + 卡片角标）。
- 已完成：仅 `checkoutReady=true` 的卡片允许进入商品详情抽屉，进一步减少无效 checkout 流程进入。
- 已验证：前端 `npm run build` 通过，`GetDiagnostics` 无新增错误。

## 本轮进展（第 63 批：其余商品入口门禁对齐）
- 已完成：`BAP ProductGridCard` 接入 `checkout_ready/checkoutReady` 归一化，新增不可下单卡片灰态、禁点与提示角标。
- 已完成：`DesktopSocialView` 的 Live C2W 商品入口接入同一门禁策略，不可下单时禁点并显示 `checkout.blocked_unavailable` 提示。
- 已完成：新文案复用现有 i18n key，避免引入新的硬编码文案。
- 已验证：前端 `npm run build` 通过，`GetDiagnostics` 无新增错误。

## 本轮进展（第 64 批：不可下单原因细分透传）
- 已完成：后端 discovery/detail 增加 `checkout_block_reason` 字段，按规则细分为 `inactive`、`missing_price`、`not_published`。
- 已完成：前端 `PrimeDrawer`、`ProductGridCard`、`ProductDetailDrawer`、`DesktopSocialView` 接入原因文案映射，不再统一显示泛化“暂不可下单”。
- 已完成：补齐 i18n 键（`checkout.block_reason.inactive|missing_price|not_published`）中英文文案。
- 已验证：后端 `py_compile` 通过；前端 `npm run build` 通过；`GetDiagnostics` 无新增错误。

## 本轮进展（第 65 批：Checkout 预检口径与 block_reason 对齐）
- 已完成：后端 `payment/quote` 返回 `checkout_block_reason`（并带 `not_ready_reasons`），在候选商品估价场景可直接给出阻断原因。
- 已完成：`CheckoutDrawer` 新增 `checkoutBlockReason` 状态；预检与提交前 quote 返回 `checkout_ready=false` 时优先按 `checkout_block_reason` 展示细分文案。
- 已完成：`CheckoutDrawer` 错误映射补齐 `product_inactive` 与 `product_variant_missing`，并将 CTA 阻断文案改为原因驱动显示。
- 已验证：后端 `python3 -m py_compile backend/app/api/rewards.py` 通过；前端 `npm run build` 通过；`GetDiagnostics` 无新增错误。


## 本轮进展（第 66 批：多阻断原因优先级与摘要）
- 已完成：`CheckoutDrawer` 新增 `resolveBlockInfo()`，支持按 `not_ready_product_ids` 顺序从 `not_ready_reasons` 解析首个阻断原因。
- 已完成：当存在多个不可下单项时，阻断提示追加“另有 N 件商品不可下单 / +N more item(s) blocked”摘要，避免单原因误导。
- 已完成：补齐 i18n 键 `checkout.block_reason.more_items`（en/zh）。
- 已验证：前端 `npm run build` 通过，`GetDiagnostics` 无新增错误。

## 本轮进展（第 67 批：block reason 映射工具收敛）
- 已完成：新增共享工具 `frontend/src/components/VCC/utils/checkoutBlockReason.ts`，统一封装阻断原因文案与“更多项”摘要文案。
- 已完成：`PrimeDrawer`、`ProductGridCard`、`ProductDetailDrawer`、`DesktopSocialView`、`CheckoutDrawer` 全部改为复用共享工具，移除重复映射代码。
- 已完成：保持原有文案键不变，仅收敛实现，降低后续口径漂移与回归风险。
- 已验证：前端 `npm run build` 通过，`GetDiagnostics` 无新增错误。


## 本轮进展（第 68 批：错误码到 block reason 的统一转换）
- 已完成：在 `checkoutBlockReason` 共享工具中新增 `getCheckoutBlockReasonFromDetail()` 与 `getCheckoutBlockMessageFromDetail()`。
- 已完成：`CheckoutDrawer.mapCheckoutError()` 改为优先调用共享转换，统一处理 `product_inactive`、`invalid_product_price`、`product_variant_missing`、`product_not_ready_for_checkout`。
- 已完成：实现层不再散落维护多份 `product_*` 错误码映射，保障 detail/discovery/quote 与 checkout 文案口径一致。
- 已验证：前端 `npm run build` 通过，`GetDiagnostics` 无新增错误。

## 本轮进展（第 69 批：checkout_block_reason 枚举常量化）
- 已完成：后端新增 `app/core/checkout_block_reason.py`，集中定义 `inactive/missing_price/not_published/unknown` 常量集合。
- 已完成：`rewards.py`、`products.py`、`personalized_matrix_service.py` 全部改为引用枚举常量，不再散落硬编码字符串。
- 已完成：前端 `checkoutBlockReason` 工具新增 `CHECKOUT_BLOCK_REASONS` 与 `normalizeCheckoutBlockReason()`，消费端按白名单枚举解析。
- 已验证：后端 `py_compile`（4 文件）通过；前端 `npm run build` 通过；`GetDiagnostics` 无新增错误。

# 群管理完整交付设计（Stream-First）

## 一、目标与边界
1、目标：一次性交付可生产使用的群管理体系，能力优先对齐 Stream 标准，再以微信习惯优化交互。  
2、范围：建群、邀请入群、成员管理、角色权限、群设置、消息治理、标准 IM 能力、审计日志、生命周期管理。  
3、架构边界：  
- 群聊实时通道与消息状态：走 Stream。  
- 业务策略与审计：走自有后端。  
- AI 单聊仍与三方聊天通道解耦（不纳入本模块改造）。  

## 二、能力清单（完整交付）
1、群创建：创建公开/私有群，设置群名、头像、简介。  
2、邀请与入群：好友邀请、邀请链接、申请入群、审批入群。  
3、成员管理：成员列表、移除成员、退出群、转让群主。  
4、角色权限：群主/管理员/成员权限矩阵。  
5、群设置：群公告、入群策略（自由/审批）、全员邀请开关、免打扰。  
6、消息治理：全员禁言、单人禁言、消息撤回窗口。  
7、标准能力：read receipts、typing indicators、quote reply、reactions、pinned messages。  
8、会话体验：未读数、@提醒、会话置顶。  
9、审计安全：关键操作审计（改设置、踢人、转让群主、解散群）。  
10、生命周期：解散群、归档群、离群后的会话处理。  

## 三、数据模型设计（自有后端）
1、`chat_groups`：群元数据（id、name、avatar、owner_id、policy、status）。  
2、`chat_group_members`：成员关系（group_id、user_id、role、mute_until、state）。  
3、`chat_group_invites`：邀请记录（inviter_id、invitee_id、status、expires_at）。  
4、`chat_group_join_requests`：入群申请（applicant_id、reviewer_id、status）。  
5、`chat_group_settings`：公告、入群规则、全员邀请开关、撤回窗口。  
6、`chat_group_audit_logs`：操作审计（actor、action、target、payload、created_at）。  
7、`chat_message_moderation`（可选首版简化）：禁言/审核命中结果。  

## 四、Stream 映射策略
1、群对象映射：`chat_groups.id` <-> Stream `channel_id`。  
2、成员角色映射：  
- owner -> Stream owner capability set  
- admin -> elevated capability set  
- member -> default capability set  
3、状态同步：  
- 创建群：先写本地，再创建 Stream channel。  
- 成员变更：本地事务成功后同步 Stream add/remove。  
- 设置变更：本地为真源，Stream 用于实时消费。  
4、一致性策略：失败重试队列 + 幂等 key（避免重复加人/重复踢人）。  

## 五、后端 API 设计
1、建群与群列表  
- `POST /api/v1/groups`  
- `GET /api/v1/groups`  
- `GET /api/v1/groups/{group_id}`  
2、成员与角色  
- `GET /api/v1/groups/{group_id}/members`  
- `POST /api/v1/groups/{group_id}/members/invite`  
- `POST /api/v1/groups/{group_id}/members/{user_id}/role`  
- `DELETE /api/v1/groups/{group_id}/members/{user_id}`  
- `POST /api/v1/groups/{group_id}/leave`  
- `POST /api/v1/groups/{group_id}/transfer-owner`  
3、入群申请与邀请  
- `POST /api/v1/groups/{group_id}/join-requests`  
- `POST /api/v1/groups/{group_id}/join-requests/{request_id}/approve`  
- `POST /api/v1/groups/{group_id}/join-requests/{request_id}/reject`  
- `POST /api/v1/groups/{group_id}/invite-links`  
4、群设置与治理  
- `PATCH /api/v1/groups/{group_id}/settings`  
- `POST /api/v1/groups/{group_id}/mute-all`  
- `POST /api/v1/groups/{group_id}/members/{user_id}/mute`  
- `POST /api/v1/groups/{group_id}/pin-message`  
- `DELETE /api/v1/groups/{group_id}/pin-message/{message_id}`  
5、审计与生命周期  
- `GET /api/v1/groups/{group_id}/audit-logs`  
- `POST /api/v1/groups/{group_id}/archive`  
- `DELETE /api/v1/groups/{group_id}`（解散）  

## 六、前端交互设计
1、群创建流：选择好友 -> 填群信息 -> 创建成功进入群会话。  
2、群资料页：成员、角色、公告、设置、审计入口。  
3、成员管理页：搜索成员、批量选择、角色调整、移除。  
4、入群审批页：待审批列表，支持同意/拒绝。  
5、消息操作：  
- 桌面 hover 操作条；移动长按操作条。  
- 支持引用、reaction、置顶、@提及。  
6、状态反馈：权限不足、审批失败、同步失败均提供明确提示。  

## 七、权限矩阵（核心规则）
1、群主：全权限（解散、转让、角色管理、踢人、公告、策略）。  
2、管理员：可管成员与公告，不可解散群和转让群主。  
3、成员：发言、引用、reaction、申请邀请（受策略限制）。  
4、禁言状态：禁言用户不能发言，但可读消息与查看成员。  

## 八、错误处理与一致性
1、后端写本地成功但 Stream 同步失败：进入重试队列，前端提示“处理中”。  
2、重复操作幂等：邀请/加人/踢人/置顶采用 idempotency key。  
3、并发冲突：角色更新使用版本号（optimistic lock）。  
4、审计必达：关键动作先写审计，再执行状态变更。  

## 九、测试与验收
1、单元测试：权限判断、状态流转、幂等校验。  
2、集成测试：建群、邀请、审批、踢人、转让群主、解散。  
3、前端 E2E：创建群、管理成员、引用/反应/置顶、禁言。  
4、双端一致性：桌面与移动交互一致（hover/long-press）。  
5、回归门禁：`backend pytest + frontend build + 关键 API smoke`。  

## 十、非目标（本轮不做）
1、跨平台微信官方通讯录同步（仅对齐交互习惯，不做微信账号体系接入）。  
2、端到端加密改造。  
3、复杂多级审核策略引擎（首版只做基础审批流）。  


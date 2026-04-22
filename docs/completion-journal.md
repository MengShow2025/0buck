# 0Buck Completion Journal

> 用途：持续记录“每一批已完成事项 + 验证结果 + 待续项”。
> 规则：每次阶段性完成后追加，不覆盖历史；每个小节统一使用数字标签（1、2、3...）。

## 2026-04-20

## 一、本批完成（聊天分享与卡片链路）
1、完成 AI/私聊/群聊输入规则分流：AI 聊天每次仅 1 图/1 拍摄/1 外链；私聊群聊图片与链接最多 9、视频 1。  
2、完成链接卡片分流：拼团/分销链接 => 商品/商家卡；注册链接 => 注册卡；外部链接 => 降级外链卡（可打开/复制）。  
3、完成“直接粘贴发送链接”转卡，不再只依赖 `+` 面板。  
4、完成分享入口可用性修复（商品卡、商品详情、商家详情、订单拼团、粉丝中心复制）。  
5、完成游客点击推广/分享卡时登录拦截与登录后续执行首版闭环。  
6、完成私聊/群聊展示收敛：移除“忽略本次/以后闭嘴”；成功转卡默认不再插入“已分享N个链接”文本气泡。  
7、完成 AI 图搜链路增强：前端传递 `media_items`，后端注入视觉摘要提示，并增加“看不到图片”拒答清理兜底。  

## 二、本批验证（聊天分享与卡片链路）
1、前端：`npm run build` 通过。  
2、后端：关键回归 `pytest` 通过（29 passed）。  

## 三、本批后续建议测试（聊天分享与卡片链路）
1、注册卡视觉模板替换为你提供的正式样式。  
2、动态（Feeds）模块按既定边界继续推进。  

## 一、本批完成（私聊/群聊标准聊天能力 1/2/3）
1、完成 `引用回复（Quote Reply）`：新增“引用”入口、输入区引用预览、发送后引用摘要展示。  
2、完成 `已读回执（Read Receipts）` 首版：私聊/群聊我方消息显示 `sent -> delivered -> read`。  
3、完成 `对方输入中（Typing Indicator）` 首版：新增会话级 typing 信号通道，支持“对方正在输入...”提示。  

## 二、本批验证（私聊/群聊标准聊天能力 1/2/3）
1、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（私聊/群聊标准聊天能力 1/2/3）
1、双窗口（不同账号）测试 typing 指示是否稳定触发与超时消失。  
2、私聊/群聊多轮消息测试引用回复展示与发送顺序。  
3、已读状态节奏（sent/delivered/read）是否符合产品预期时序。  

## 一、本批完成（消息操作条交互对齐）
1、完成私聊/群聊消息操作条改造：桌面端 hover 出现 `❤️ / 👍 / 👎 / Quote`，移动端长按出现同样操作条。  
2、完成消息反应展示：选择后在消息下方显示对应表情。  
3、完成交互收敛：移除常驻“引用”按钮，改为按需出现，减少视觉噪音。  

## 二、本批验证（消息操作条交互对齐）
1、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（消息操作条交互对齐）
1、桌面端 hover 进入/离开时，操作条显隐是否平滑。  
2、移动端长按阈值与误触率（滚动时不误触发）。  
3、选择 reaction 后，是否只影响当前消息且可被后续覆盖。  

## 一、本批完成（好友模块 1/2/3 第1批）
1、后端新增好友关系真实 API：搜索好友、发起申请、收件箱、接受/忽略、好友列表、删除好友、拉黑/取消拉黑。  
2、后端新增好友数据表：`friend_requests`、`friendships`、`friend_blocks`，并在启动时自动 `checkfirst` 建表。  
3、前端 `ContactsDrawer` 改为真实接口驱动：好友列表、黑名单数量、新朋友数量、搜索用户与添加好友。  
4、前端 `NewFriendsDrawer` 改为真实接口驱动：接受/忽略请求直连后端。  
5、前端 `BlacklistDrawer` 改为真实接口驱动：拉黑列表与取消拉黑直连后端。  
6、`LoungeDrawer` 的“添加好友”从占位日志改为真实发起好友请求。  

## 二、本批验证（好友模块 1/2/3 第1批）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/friends.py app/models/ledger.py app/main.py` 通过。  

## 三、本批后续建议测试（好友模块 1/2/3 第1批）
1、A账号搜索B账号并发送好友申请，B账号在新朋友页接受后，双方通讯录应互相可见。  
2、拉黑后联系人列表应移除，黑名单页出现；取消拉黑后恢复搜索可见。  
3、重复申请/重复接受时应返回稳定结果（不重复创建关系）。  

## 一、本批完成（群管理完整 第1检查点）
1、后端新增群管理核心数据模型：`chat_groups`、`chat_group_members`、`chat_group_audit_logs`。  
2、后端新增群管理真实 API：建群、群列表、成员列表、邀请成员、角色变更、移除成员、群设置更新、退出群、解散群。  
3、后端新增 Stream 同步封装：`add_members`、`remove_members`、`update_channel`。  
4、前端新增 `groupsApi` 客户端并接入：建群、成员、邀请、角色、设置、退出、解散。  
5、前端新增抽屉：`GroupCreateDrawer`、`GroupManageDrawer`。  
6、前端入口打通：Lounge 的“Start Group”进入建群；聊天群菜单新增“群设置与权限”入口。  

## 二、本批验证（群管理完整 第1检查点）
1、后端：`python3 -m compileall app/api/groups.py app/main.py app/models/ledger.py app/services/stream_chat.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（群管理完整 第1检查点）
1、创建群后，Lounge 列表应出现动态群会话。  
2、群主在群管理页设置公告后，刷新页面应保持。  
3、成员角色变更与移除后，再次拉取成员列表应一致。  
4、退出群与解散群权限边界（群主/管理员/成员）需双账号验证。  

## 一、本批完成（群管理完整 第2检查点）
1、后端新增群详情接口：返回 `my_role`、`owner_id`、群设置，供前端权限化渲染。  
2、后端新增“转让群主”接口：仅群主可执行，转让后原群主降级为管理员并写审计日志。  
3、后端新增“审计日志列表”接口：仅群主/管理员可查看关键操作记录。  
4、前端群管理页改为角色驱动：根据 `my_role` 显示可执行按钮，成员态不显示越权操作。  
5、前端群管理页接入审计日志面板（群主/管理员可见）。  
6、修复好友添加ID风险点：删除“字符串抽数字当用户ID”，改为只使用后端返回的真实 `user_id`。  

## 二、本批验证（群管理完整 第2检查点）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/groups.py app/main.py app/models/ledger.py` 通过。  

## 三、本批后续建议测试（群管理完整 第2检查点）
1、群主转让后，双方角色与可见按钮应立即变化。  
2、管理员不能解散群，成员不能改角色；越权请求应返回 403。  
3、执行“设置公告/移除成员/转让群主”后，审计日志应按时间倒序可见。  
4、好友搜索添加链路需核对：目标 `user_id` 与实际用户一致，不得出现串号。  

## 一、本批完成（群管理完整 第3检查点）
1、聊天室群菜单动作改为真实后端链路：受管群执行 `leave/dissolve` API，非受管旧群保留本地兼容逻辑。  
2、聊天室群菜单权限化：仅群主显示解散群入口，成员与管理员无越权按钮。  
3、群菜单与群管理抽屉联动：成员管理/群设置入口统一走 `group_manage`，并校验受管群上下文。  
4、继续强化用户映射安全：好友搜索结果仅使用后端返回 `user_id` 作为操作参数，彻底移除字符串推断ID路径。  

## 二、本批验证（群管理完整 第3检查点）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/groups.py app/api/friends.py app/main.py app/models/ledger.py app/services/stream_chat.py` 通过。  

## 三、本批后续建议测试（群管理完整 第3检查点）
1、群主/管理员/成员三角色分别打开群菜单，确认可见操作符合权限矩阵。  
2、受管群执行退出与解散后，Lounge 会话列表是否实时收敛。  
3、好友搜索添加在多用户并发场景下，申请目标是否严格命中所选 `user_id`。  

## 一、本批完成（群管理完整 第4检查点）
1、后端新增群置顶接口：`pin-message` 与 `unpin-message`，置顶数据写入群设置并记审计日志。  
2、前端消息操作条新增 `Pin`（仅群主/管理员 + 受管群可见），点击后即写入后端并更新置顶区。  
3、前端置顶区新增 `Unpin`（仅群主/管理员可见），取消置顶后后端与前端同步清空。  
4、群详情拉取时同步置顶消息到聊天室，确保刷新后仍保留。  

## 二、本批验证（群管理完整 第4检查点）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/groups.py app/main.py app/models/ledger.py app/services/stream_chat.py` 通过。  

## 三、本批后续建议测试（群管理完整 第4检查点）
1、群主/管理员在同一群内置顶与取消置顶，成员端应实时看到置顶变化。  
2、被置顶消息内容截断规则（240字符）是否符合产品预期。  
3、置顶/取消置顶操作应出现在审计日志中，且 actor 与 target 映射正确。  

## 一、本批完成（群管理完整 第5检查点）
1、群管理后端路由清单补齐并核对：建群、成员、角色、设置、退出、转让群主、审计、置顶/取消置顶。  
2、群管理前端能力与后端接口一一对应：`groupsApi` 已包含 detail/transferOwner/auditLogs/pinMessage/unpinMessage。  
3、聊天室群菜单与消息操作条实现“权限 + 动作”联动：成员管理入口、退出/解散、Pin/Unpin 均按角色控制。  

## 二、本批验证（群管理完整 第5检查点）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/groups.py app/main.py app/models/ledger.py app/services/stream_chat.py` 通过。  
3、后端路由静态核验：`groups.py` 路由定义与 `main.py` 挂载点已匹配。  

## 三、本批后续建议测试（群管理完整 第5检查点）
1、由于本机缺失 `langchain_openai`，`import app.main` 路由动态探测未执行；补齐依赖后建议做一次 `TestClient` 级 API smoke。  
2、三角色（群主/管理员/成员）需在双账号或多账号下做端到端验证，重点覆盖越权拒绝（403）。  
3、受管群与历史本地群并存场景需回归，确认兼容路径不会误触发越权动作。  

## 一、本批完成（群管理完整 第6检查点）
1、新增后端可执行 smoke 脚本：`backend/scripts/smoke_groups_api.py`（群主/管理员/成员三角色校验）。  
2、新增模块验收清单：`docs/module-group-management-checklist.md`（自动 + 手工 + 防串号核验）。  
3、脚本支持可选变更校验 `RUN_MUTATIONS=1`，覆盖 `pin/unpin` 权限路径。  

## 二、本批验证（群管理完整 第6检查点）
1、脚本静态编译：`python3 -m py_compile scripts/smoke_groups_api.py` 通过。  
2、文档诊断：`module-group-management-checklist.md` 无诊断错误。  

## 三、本批后续建议测试（群管理完整 第6检查点）
1、接入真实三账号 token 后执行 smoke 脚本，确认输出 `Group API Smoke OK`。  
2、将 smoke 脚本纳入发布前 Gate（预发环境至少跑一轮）。  
3、每次群权限改动后，必须回归“actor/target 用户映射正确性”检查。  

## 一、本批完成（群管理完整 第7检查点：禁言能力）
1、后端新增全员禁言接口：`POST /groups/{group_id}/mute-all`（仅群主/管理员）。  
2、后端新增成员禁言接口：`POST /groups/{group_id}/members/{user_id}/mute`（分钟数，`0` 为解除）。  
3、前端群管理页新增禁言操作：开启/关闭全员禁言、成员“禁言30分/解除禁言”。  
4、聊天室发送前新增禁言拦截：当“全员禁言（成员态）”或“个人禁言未到期”时禁止发送并提示原因。  
5、后端补充禁言规则单元测试：`test_group_mute_rules.py`（4个用例）。  

## 二、本批验证（群管理完整 第7检查点：禁言能力）
1、后端测试：`PYTHONPATH=. python3 -m pytest -q tests/test_group_mute_rules.py` 通过（4 passed）。  
2、后端编译：`python3 -m compileall app/api/groups.py` 通过。  
3、前端构建：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（群管理完整 第7检查点：禁言能力）
1、群主开启全员禁言后，成员发送应被拦截；管理员与群主应可继续发言。  
2、成员被禁言30分钟后，提示应即时出现；解除禁言后无需重登即可恢复发送。  
3、禁言与解除禁言操作应写入审计日志，`actor_user_id/target_user_id` 映射准确。  
4、单账号阶段测试限制：当前建群流程要求至少选择1位好友，若通讯录为空则无法完整验证群管理；待多用户环境再执行全链路验收。  

## 一、本批完成（群聊推荐与菜单体验修正）
1、移除群聊顶部“默认假推荐”回退逻辑：推荐栏仅在存在真实置顶推荐时展示。  
2、右上角 `...` 菜单层级提升，修复被顶部推荐栏和内容区遮挡问题。  
3、群菜单选项作用校正：成员管理/群设置与权限、退出群聊、解散群聊（仅群主）。  

## 二、本批验证（群聊推荐与菜单体验修正）
1、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（群聊推荐与菜单体验修正）
1、普通成员进入群聊时不应看到默认推荐卡；仅真实推荐时展示。  
2、群主/管理员打开 `...` 菜单时应始终位于最上层不被遮挡。  
3、成员角色下不应出现“解散群聊”入口。  

## 一、本批完成（群聊操作项与推荐打通）
1、修复群内 `...` 菜单错误文案：`成员管理`、`退出群聊`、`解散群聊`（不再显示“聊天”误文案）。  
2、群主/管理员新增显式“群主推荐”配置入口（群管理页）：可填写分销/拼团链接并发布、更新、关闭推荐。  
3、推荐卡支持链接跳转：当推荐存在 `link` 时，点击推荐卡直达链接。  
4、群主/管理员权限聚焦到核心动作：填推广链接、管理群员、退出/解散（转让在群管理内）。  

## 二、本批验证（群聊操作项与推荐打通）
1、后端：`python3 -m compileall app/api/groups.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（群聊操作项与推荐打通）
1、群主/管理员发布推荐后，成员端顶部推荐应可见且可点。  
2、普通成员不得看到推荐编辑按钮，仅可查看推荐结果。  
3、群菜单动作按角色收敛，成员端仅保留普通操作项。  

## 一、本批完成（微信式群管理同页结构）
1、群管理页重构为微信式同页结构：成员区、群名、公告、备注、本群昵称、查找聊天内容、开关项、退出群聊。  
2、角色差异收敛到同一页面：群主/管理员仅额外显示“群主推荐配置 + 管理群员 + 全员禁言 + 解散群聊”。  
3、群推荐后端接口补齐：新增 `POST /groups/{group_id}/recommendation` 与 `DELETE /groups/{group_id}/recommendation`。  
4、群推荐前端联动补齐：群管理页可发布/更新/关闭推荐，聊天室顶部推荐卡支持按 `link` 点击跳转。  
5、群内 `...` 操作项中文文案修正：`成员管理`、`退出群聊`、`解散群聊`。  

## 二、本批验证（微信式群管理同页结构）
1、后端：`python3 -m compileall app/api/groups.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（微信式群管理同页结构）
1、群员与管理者进入同一页面时，结构一致但按钮权限不同。  
2、发布推荐后，群员端应只可查看与点击，不可编辑。  
3、推荐关闭后顶部栏应消失；重新发布后应恢复展示。  

## 一、本批完成（沙龙默认群迁移为真实群）
1、后端新增默认群引导接口：`POST /groups/bootstrap-defaults`，进入沙龙时自动确保“约同城群/数码出海群”为真实群并把当前用户加入。  
2、前端沙龙会话加载改为：先调用 `bootstrap-defaults`，再读取 `groups.list`，保证群ID为 `group_数字` 的真实链路。  
3、移除沙龙中的静态假群（原 `id: '3'/'4'`），避免再进入虚拟群导致功能缺失。  
4、群管理与群推荐能力由此在默认沙龙群可见并可联调。  

## 二、本批验证（沙龙默认群迁移为真实群）
1、后端：`python3 -m compileall app/api/groups.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（沙龙默认群迁移为真实群）
1、首次进入沙龙后，默认群应出现在真实群列表，ID 形如 `group_xxx`。  
2、进入“约同城群/数码出海群”时，`群设置与权限` 应展示完整真实能力。  
3、多账号进入同一默认群时，成员列表应互相可见并支持权限差异化验证。  

## 一、本批完成（微信群同款：菜单单入口）
1、群内 `...` 菜单已收敛为单入口：`群聊信息`。  
2、退出/解散/管理等动作统一迁移到“群聊信息页”按角色展示，避免入口分散。  
3、`...` 菜单保持高层级弹层，不被推荐栏与消息区遮挡。  

## 二、本批验证（微信群同款：菜单单入口）
1、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（微信群同款：菜单单入口）
1、群员、管理员、群主三角色点击 `...` 均只看到“群聊信息”一项。  
2、进入“群聊信息页”后，角色差异动作应在页内呈现。  

## 一、本批完成（500报错修复与官方群管理员权限）
1、修复群信息页 `500` 触发路径：群ID解析改为严格 `group_数字`，避免误把非真实群ID提交给后端。  
2、群信息页加载改为容错：详情接口失败会显示错误提示，成员接口失败不再导致整页崩溃。  
3、官方群默认加入权限升级：默认官方群引导加入时，若用户原角色为 member，将自动升级为 admin（非群主路径）。  

## 二、本批验证（500报错修复与官方群管理员权限）
1、后端：`python3 -m compileall app/api/groups.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（500报错修复与官方群管理员权限）
1、再次打开群聊信息页，确认不再出现 `AxiosError 500` 打断页面。  
2、进入默认官方群后确认当前账号角色为 `admin`，可见管理动作。  

## 一、本批完成（官方群入口修正）
1、群内右上角 `...` 改为“直接进入群聊信息页”，移除中间弹出的一项菜单，交互更接近微信。  
2、默认官方群扩展为三类真实群：`官方播报`、`约同城群`、`数码出海群`。  
3、沙龙会话列表移除旧的静态“官方播报专题项”，避免继续进入旧会话而看不到新入口。  

## 二、本批验证（官方群入口修正）
1、后端：`python3 -m compileall app/api/groups.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（官方群入口修正）
1、进入“官方播报（真实群）”后，右上角应直接跳转“群聊信息页”。  
2、旧专题会话若仍在本地缓存，需手动切到新官方群会话验证。  

## 一、本批完成（群聊信息页功能补齐）
1、群名保存打通：群主/管理员可保存群名（后端 `PATCH /groups/{id}/settings` 支持 `name`）。  
2、成员添加打通：群主/管理员可输入用户ID批量添加成员（`members/invite`）。  
3、个人群设置后端化：新增 `GET/PUT /groups/{id}/me-settings`，备注/本群昵称/免打扰/置顶聊天/成员昵称展示写入后端。  
4、聊天记录本地持久化：群聊消息按会话ID写入本地存储，重进群会话可恢复。  
5、查找聊天内容可用：群聊信息页支持按关键词检索当前会话本地聊天记录。  
6、清空聊天记录可用：群聊信息页“清空聊天记录”会清空该会话本地历史。  

## 二、本批验证（群聊信息页功能补齐）
1、后端：`python3 -m compileall app/api/groups.py app/models/ledger.py app/main.py` 通过。  
2、后端测试：`PYTHONPATH=. python3 -m pytest -q tests/test_group_mute_rules.py` 通过（4 passed）。  
3、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（群聊信息页功能补齐）
1、群名修改后刷新页面应保持。  
2、添加成员后成员宫格应出现新增成员。  
3、设置本群昵称与开关项后，重新进入群信息页应保持。  
4、查找聊天内容应能命中已发送的本地消息；清空后应查不到历史。  

## 一、本批完成（私聊升级群聊）
1、私聊右上角新增 `...` 入口（非AI私聊），点击可输入要追加的用户ID并创建群聊。  
2、私聊升级群聊后自动切换到新群会话（`group_数字`）。  
3、群主归属规则确认：发起升级的当前用户即群主（owner）。  
4、沙龙私聊列表改为真实好友数据（含真实 `peerUserId`），避免“无法升级”因ID缺失。  

## 二、本批验证（私聊升级群聊）
1、前端：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（私聊升级群聊）
1、从私聊升级后，群信息页应显示当前用户角色为 owner。  
2、升级后再添加/禁言/转让群主等操作应符合 owner 权限。  

## 一、本批完成（通讯录管理第1批硬修）
1、后端好友状态机补强：发起/接受好友请求前新增双向拉黑校验，命中即拒绝（403）。  
2、后端并发幂等补强：好友申请与接受流程增加 `IntegrityError` 处理，冲突回落为幂等成功语义。  
3、后端状态收敛补强：发起请求时若存在反向 `pending`，自动接受并建立双向好友关系。  
4、后端拉黑行为补强：拉黑前校验目标用户存在；拉黑后清理双向 pending 请求为 `canceled`。  
5、前端通讯录入口加鉴权门禁：沙龙通讯录按钮改为 `requireAuth` 后再进入。  
6、前端关键操作补齐失败语义：通讯录/新朋友/黑名单页面新增错误提示并为核心写操作加 `try/catch`。  
7、前端安全面收敛：移除 `window.setActiveDrawer/window.pushDrawer` 全局暴露入口。  

## 二、本批验证（通讯录管理第1批硬修）
1、后端编译：`python3 -m compileall app/api/friends.py app/main.py` 通过。  
2、后端回归：`PYTHONPATH=. python3 -m pytest -q tests/test_group_mute_rules.py` 通过（4 passed）。  
3、前端构建：`npm run build` 通过（exit code 0）。  

## 三、本批后续建议测试（通讯录管理第1批硬修）
1、A/B任一方拉黑后，双方应无法再发起或接受好友请求。  
2、A与B互相同时发好友请求，应自动合并为好友，不保留双向 pending。  
3、未登录状态点击通讯录入口，应出现登录流程而非“空通讯录”。  

## 一、本批完成（通讯录管理第2批收口）
1、桌面通讯录改为真实数据源：`DesktopContactsPanel` 从 `friendsApi.list/listRequests` 拉取联系人与新朋友，移除硬编码联系人。  
2、桌面私聊入口与移动端统一：发起私聊时携带真实 `peerUserId`，会话ID统一为 `private_{userId}`。  
3、桌面“Add Friend”按钮接入鉴权门禁：未登录先走登录流程，不再出现误导状态。  
4、桌面通讯录无数据与错误状态补齐：加载失败会提示，空联系人有明确文案。  

## 二、本批验证（通讯录管理第2批收口）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/friends.py app/main.py` 通过。  

## 三、本批后续建议测试（通讯录管理第2批收口）
1、桌面与移动端同账号下，联系人数量与名称应一致。  
2、桌面端点联系人“Message”后，应进入真实私聊会话（`private_{userId}`）。  
3、未登录状态点击桌面“Add Friend”应触发登录，不应打开空通讯录。  

## 一、本批完成（通讯录上线验收工具）
1、新增通讯录后端 smoke 脚本：`backend/scripts/smoke_friends_api.py`。  
2、脚本覆盖关键上线风险：申请、反向申请收敛、拉黑后拒绝、黑名单可见。  
3、新增通讯录上线清单：`docs/module-contacts-release-checklist.md`，含 API 与前端回归项。  

## 二、本批验证（通讯录上线验收工具）
1、脚本静态编译：`python3 -m py_compile scripts/smoke_friends_api.py` 通过。  
2、验收文档诊断无报错。  

## 一、本批完成（动态MVP 第1批：后端主链路 + 前端接线）
1、后端 Social API 重构为真实闭环：发布、列表、点赞/取消点赞、评论列表/新增/删除、删除动态。  
2、Social 全链路接入鉴权：动态列表不再匿名读取。  
3、可见性规则落地：仅支持 `public` 与 `friends`（写入 metadata_json 并按好友关系过滤）。  
4、媒体流程补齐 MVP 形态：新增 `upload-ticket` 与 `media/commit`，发布时强校验 `committed` 媒体。  
5、前端新增 `socialApi` 客户端，发布抽屉接入真实发布（图文）与可见性切换（完全公开/仅好友可看）。  
6、广场“社群动态”改读真实后端动态并接点赞动作，不再仅本地 mock。  
7、动态模型新增点赞明细表 `square_activity_likes`，并在启动建表流程纳入。  

## 二、本批验证（动态MVP 第1批：后端主链路 + 前端接线）
1、后端：`python3 -m compileall app/api/social.py app/models/ledger.py app/main.py` 通过。  
2、前端：`npm run build` 通过（exit code 0）。  

## 一、本批完成（动态MVP 第2批：上线验收工具）
1、新增动态后端 smoke 脚本：`backend/scripts/smoke_social_api.py`。  
2、脚本覆盖发布、点赞幂等、评论增删、作者删除动态等核心链路。  
3、新增动态上线验收清单：`docs/module-social-release-checklist.md`。  

## 二、本批验证（动态MVP 第2批：上线验收工具）
1、脚本静态编译：`python3 -m py_compile scripts/smoke_social_api.py` 通过。  
2、后端编译：`python3 -m compileall app/api/social.py app/main.py app/models/ledger.py` 通过。  

## 一、本批完成（动态MVP 第3批：上传与多端同源收口）
1、Shopify 上传签名接入：`/social/media/upload-ticket` 改为调用 Shopify GraphQL `stagedUploadsCreate` 返回真实上传地址与参数。  
2、媒体提交规则加强：`/social/media/commit` 强校验 CDN URL 合法性，并限制为 Shopify/CDN 域。  
3、发布抽屉接入真实上传：前端改为文件选择 -> 直传 Shopify -> commit -> 发布动态，不再使用伪图链接提交。  
4、广场动态补齐评论交互：支持展开评论、发送评论、刷新评论列表。  
5、桌面 Feed 与桌面 Square 统一改读真实 social 数据源，并接真实点赞动作。  

## 二、本批验证（动态MVP 第3批：上传与多端同源收口）
1、后端编译：`python3 -m compileall app/api/social.py app/main.py app/models/ledger.py` 通过。  
2、脚本静态编译：`python3 -m py_compile scripts/smoke_social_api.py` 通过。  
3、前端构建：`npm run build` 通过（exit code 0）。  

## 一、本批完成（动态与博客同步链路增强）
1、`media/commit` 支持 staged 资源自动 `fileCreate` 转正式 Shopify 文件 URL，避免返回不可见临时地址。  
2、新增动态->博客文章同步能力骨架：发布动态后尝试在 Shopify Blog（social-feed）创建文章并写回 `activity` 映射字段。  
3、删除动态时尝试同步删除 Shopify 文章（若存在映射）。  
4、新增可见图上传脚本并改为默认 800x500 图片，避免 1x1 测试图导致“看不到”的误判。  

## 二、本批验证（动态与博客同步链路增强）
1、`python3 -m compileall app/api/social.py scripts/post_one_social_to_shopify.py` 通过。  
2、脚本执行可成功发布可见 CDN 图片并创建动态。  
3、当前店铺 token 对 blogs/articles 返回 403（权限不足），脚本输出 `ARTICLE_SYNC_WARNING`，已保留降级路径不中断动态发布。  

## 一、本批完成（通讯录管理第3批收口）
1、桌面新朋友列表补齐真实动作：`Accept/Ignore` 分别调用 `friendsApi.accept/ignore`。  
2、桌面新朋友动作后自动刷新通讯录与请求列表，消除“按钮点击后状态不变”问题。  
3、桌面新朋友状态文案统一到真实后端状态（`pending/accepted/ignored/rejected`）。  

## 二、本批验证（通讯录管理第3批收口）
1、前端：`npm run build` 通过（exit code 0）。  
2、后端：`python3 -m compileall app/api/friends.py` 通过。  

## 一、本批完成（通讯录上线联测模板）
1、新增 A/B/C 账号制 PASS/FAIL 验收矩阵：`docs/contacts-passfail-matrix.md`。  
2、覆盖鉴权入口、好友状态机、拉黑收敛、桌面移动一致性、错误语义五大类上线风险。  

## 一、本批完成（P0+P1 真实数据收口）
1、完成身份数据源收口：`SessionContext` 统一兼容 `/users/me` 与 `/auth/me`，并移除个人页中的固定会员号、默认推荐码、默认邮箱与游客头像占位。  
2、完成商业态主数据源切换：`CommerceContext` 改为真实 `rewardApi.getStatus(customer_id)` + `orderApi.getMyOrders()` 驱动余额、积分、等级、费率和订单摘要；未登录统一为空态。  
3、完成奖励与订单抽屉首轮真实化：`PointsHistoryDrawer`、`PointsExchangeDrawer`、`ShareDrawer`、`DesktopOrdersView`、`OrderCenterDrawer`、`OrderDetailDrawer`、`OrderTrackingDrawer` 改为真实数据或空态降级。  
4、完成剩余 P1 面板真实化：`DesktopWalletView`、`DesktopFansPanel`、`FanCenterDrawer`、`RewardHistoryDrawer` 改为真实奖励状态/流水聚合。  
5、完成通知与地址收口：`DesktopNotificationsView` 改为真实订单与奖励流水聚合；`AddressDrawer` 改为真实地址 CRUD（列表/新增/编辑/删除/设默认）。  
6、新增工具与测试：`rewardCommerce.*`、`notificationFeed.*`，固定奖励聚合、通知分组等口径，避免回退到 mock。  
7、补齐移动端个人中心残留占位符：`MeDrawer` 中粉丝收益卡片由硬编码 `$342` 改为真实奖励流水汇总；`0BUCK_9527` 已确认不在当前源码展示逻辑中。  

## 二、本批验证（P0+P1 真实数据收口）
1、前端回归：`npm test -- src/components/VCC/utils/rewardCommerce.test.ts src/components/VCC/utils/notificationFeed.test.ts src/components/VCC/contexts/SessionContext.test.tsx src/components/VCC/contexts/CommerceContext.test.tsx src/components/VCC/utils/meResponseParser.test.ts src/components/VCC/utils/userIdentity.test.ts src/components/VCC/utils/rewardStatus.test.ts src/components/VCC/utils/orderSummary.test.ts` 通过（`22 passed`）。  
2、前端构建：`npm run build` 通过（产物 `dist/assets/index-BJE7jOLH.js`）。  
3、浏览器预览：本地 `http://localhost:5174/` 可打开，首页首屏交互可进入主界面。  

## 三、本批后续建议测试（P0+P1 真实数据收口）
1、登录真实账号后手工回归：钱包、粉丝中心、奖励历史、通知页应只展示真实流水衍生内容。  
2、地址管理建议做一轮新增/编辑/设默认/删除全链路验证，确认 `shipping_addresses` 与结账入口联动一致。  

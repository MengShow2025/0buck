# 动态（朋友圈）MVP 闭环设计（图文）

## 一、目标与边界
1、目标：交付可上线的动态闭环，打通“发布-列表-互动-权限-删除”全链路。  
2、范围：文字+图片发布、列表拉取、点赞、评论、删除、可见性过滤、统一数据源。  
3、展示统一：沙龙内“发现”和广场内“社群动态”读取同一动态数据，仅展示位置不同。  
4、本期不做：视频发布、评论多级回复、复杂推荐排序。  

## 二、产品规则（已确认）
1、可见范围仅两档：`完全公开`、`仅好友可看`。  
2、默认可见范围：`完全公开`。  
3、媒体上云要求：发布图片必须先上传到 Shopify CDN，拿到可访问 URL 后才能发布成功。  
4、本地副本策略：用户设备保留本地副本；可单独删除本地副本，不影响云端展示。  
5、云端删除策略：删除云端媒体时，必须先删除对应动态，避免帖子引用失效。  

## 三、数据模型设计（后端）
1、扩展 `square_activities`：  
- `visibility`（`public`/`friends`）  
- `media_json`（图片数组，含 `url/mime/width/height/size`）  
- `deleted_at`（软删除）  
- `likes_count`、`comments_count`（冗余计数）  
2、新增 `square_activity_likes`：  
- 字段：`id/activity_id/user_id/created_at`  
- 约束：`UNIQUE(activity_id, user_id)`，保证点赞幂等  
3、评论沿用 `comments`，但限制 target 为 activity：  
- `target_type='activity'`  
- `target_id` 指向动态 ID  

## 四、后端 API 设计
1、上传凭证与媒体  
- `POST /api/v1/social/media/upload-ticket`：获取 Shopify 直传凭证（图片）  
- `POST /api/v1/social/media/commit`：提交上传结果（校验 URL 与 metadata）  
2、动态主链路  
- `POST /api/v1/social/activities`：发布动态（必须携带已 commit 的 CDN 媒体）  
- `GET /api/v1/social/activities`：动态列表（按可见性与关系过滤）  
- `GET /api/v1/social/activities/{id}`：动态详情  
- `DELETE /api/v1/social/activities/{id}`：删除动态（作者本人）  
3、点赞评论  
- `POST /api/v1/social/activities/{id}/like`  
- `DELETE /api/v1/social/activities/{id}/like`  
- `GET /api/v1/social/activities/{id}/comments`  
- `POST /api/v1/social/activities/{id}/comments`  
- `DELETE /api/v1/social/comments/{id}`（评论作者或动态作者）  

## 五、可见性与关系过滤
1、`public`：所有登录用户可见。  
2、`friends`：仅作者双向好友可见，作者本人始终可见。  
3、黑名单优先级高于可见性：  
- 被作者拉黑用户不可见作者动态。  
- 作者拉黑目标后，目标也不可互动作者动态。  
4、未登录用户：不返回动态内容（统一鉴权）。  

## 六、前端改造设计
1、发布抽屉（MyFeeds/发布器）  
- 增加可见性选择：`完全公开` / `仅好友可看`  
- 发布流程：选图 -> 获取 upload ticket -> 直传 Shopify -> commit -> 发布动态  
- 任一步失败则发布失败并提示，不写入本地假动态  
2、列表与入口统一  
- “发现”和“社群动态”共用同一 `social store` 与同一接口  
- 移除多处 mock feed，统一从后端拉取  
3、互动行为  
- 点赞/取消点赞：乐观更新 + 失败回滚  
- 评论新增/删除：本地更新 + 服务端确认  
4、删除行为  
- 仅动态作者显示删除入口  
- 删除成功后两处入口列表同步移除  

## 七、错误处理与幂等
1、上传失败：保留本地选择状态，支持重试上传。  
2、发布失败：不生成本地假数据，必须提示失败原因。  
3、重复点赞：后端幂等返回成功，不重复计数。  
4、并发评论删除：不存在资源返回幂等语义，不抛 500。  

## 八、安全与审计
1、所有 social 写接口强制 `get_current_user`。  
2、动态删除、评论删除、媒体 commit 记录审计日志。  
3、对上传媒体做 MIME 与大小白名单校验（仅图片类型）。  

## 九、测试与验收
1、后端  
- 发布接口：无 CDN 媒体应拒绝  
- 可见性：public/friends 过滤正确  
- 点赞幂等：重复点赞不重复计数  
- 删除权限：非作者不可删  
2、前端  
- 发布流程：上传成功后可见，上传失败不可发布  
- 双入口一致性：发现与社群动态展示同一数据  
- 互动回滚：接口失败时 UI 回滚  
3、上线门槛  
- `backend pytest + compileall` 全绿  
- `frontend build` 全绿  
- smoke 联测通过（A/B/C 可见性与互动权限）  

## 十、迭代计划（下一期）
1、视频发布（上传、封面、播放、删除）  
2、评论回复树与 @ 提及  
3、推荐排序与风控审核流  

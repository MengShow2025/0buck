# 动态（朋友圈）上线验收清单（图文MVP）

## 一、范围确认
1、发布内容：文字 + 图片。  
2、可见范围：完全公开 / 仅好友可看。  
3、入口统一：沙龙“发现”与广场“社群动态”同一数据源。  

## 二、后端 API Smoke
```bash
API_BASE_URL="http://localhost:8000/api/v1" \
TOKEN_A="..." TOKEN_B="..." TOKEN_C="..." \
python3 backend/scripts/smoke_social_api.py
```
预期输出：`Social API Smoke OK`。  

## 三、前端关键回归
1、发布图文时，未完成媒体 commit 不可发布。  
2、发布成功后，发现与社群动态都能看到同一条内容。  
3、点赞失败应回滚，成功应实时更新计数。  
4、评论新增后可见，删除后消失。  
5、作者可删除动态，非作者不可删除。  

## 四、可见性验收（多账号）
1、A 发布“完全公开”，B/C 都可见。  
2、A 发布“仅好友可看”，仅 A 的好友可见。  
3、被 A 拉黑的账号不可见 A 的动态。  

## 五、上线结论
- 阻断问题：`________________`  
- 结论：`可上线 / 有条件上线 / 不可上线`  

## 六、本轮执行记录（点赞/留言跨端对齐）
- 自动验证通过：
  - 前端评论映射测试：`npm test -- src/components/VCC/utils/socialComments.test.ts`（`2 passed`）
  - 前端构建：`npm run build`（exit code 0）
- 自动验证受限：
  - `smoke_social_api.py` 需 `TOKEN_A/TOKEN_B/TOKEN_C`，当前环境未注入，脚本在 token 前置检查即停止。
- 手工复核重点：
  1. 桌面 Feed：展开评论、发送评论、删除本人评论。
  2. 桌面 Square：展开评论、发送评论、删除本人评论。
  3. 移动 Square + MyFeeds：评论删除入口可见性（仅 `can_delete=true` 显示）。

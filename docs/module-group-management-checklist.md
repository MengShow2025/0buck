# 群管理模块验收清单（Stream-First）

## 一、环境准备
1、准备三套账号：群主、管理员、成员（必须不同 `customer_id`）。  
2、确保三账号都在同一个测试群内，记录 `GROUP_ID`。  
3、准备三账号 token（`TOKEN_OWNER`、`TOKEN_ADMIN`、`TOKEN_MEMBER`）。  

## 二、后端 API Smoke（自动）
1、执行脚本：

```bash
API_BASE_URL="http://localhost:8000/api/v1" \
TOKEN_OWNER="..." \
TOKEN_ADMIN="..." \
TOKEN_MEMBER="..." \
GROUP_ID="123" \
RUN_MUTATIONS=1 \
python3 backend/scripts/smoke_groups_api.py
```

2、预期结果：控制台输出 `=== Group API Smoke OK ===`。  
3、关键检查：  
- owner/admin 可访问审计；member 被拒绝（403）；  
- owner 可 pin；member 不能 pin；admin 可 unpin。  

## 三、前端三角色验收（手工）
1、群主视角：  
- 群菜单可见：成员管理、群设置、退出、解散；  
- 消息长按/悬停可见 `Pin`；置顶区可 `Unpin`。  
2、管理员视角：  
- 群菜单不可见“解散群”；  
- 可 `Pin/Unpin`；可看审计日志；不可转让群主。  
3、成员视角：  
- 群菜单仅普通项，无越权动作；  
- 不可 `Pin/Unpin`；不可看审计日志。  

## 四、数据一致性核验（防串号）
1、好友搜索结果必须使用后端返回 `user_id` 发起申请，不允许推断。  
2、群审计日志中 `actor_user_id` 必须等于实际操作者账号。  
3、被操作对象 `target_user_id` 必须与 UI 选中用户一致。  
4、任何越权请求都必须返回 403，且不落库。  

## 五、异常与回归
1、网络失败后重试，群角色与菜单权限不应错乱。  
2、刷新页面后，群公告/置顶消息应保留。  
3、群主转让后，旧群主按钮权限应立即收敛。  

# 通讯录上线验收清单

## 一、环境
1、准备 A/B/C 三个账号与对应 token。  
2、确认可获取三者 `customer_id`（用于请求参数）。  

## 二、后端 API Smoke
```bash
API_BASE_URL="http://localhost:8000/api/v1" \
TOKEN_A="..." TOKEN_B="..." TOKEN_C="..." \
USER_A_ID="1001" USER_B_ID="1002" USER_C_ID="1003" \
python3 backend/scripts/smoke_friends_api.py
```

预期：输出 `Friends API Smoke OK`。  

## 三、前端关键回归
1、未登录点击通讯录入口，应先登录。  
2、通讯录页搜索用户后发送申请，失败需有错误提示。  
3、新朋友页同意/忽略失败需有错误提示。  
4、黑名单页解除拉黑失败需有错误提示。  
5、桌面与移动端通讯录联系人应一致。  

## 四、状态机与并发检查
1、A->B 与 B->A 同时申请，最终不应留下双向 pending。  
2、A 拉黑 C 后，C 不可再向 A 发起申请。  
3、拉黑后已有 pending 请求应收敛为 canceled。  

# Amazon 到 Shopify 同步技能

## 说明
从 Amazon（多语言）提取商品数据，并通过 REST Admin API 直接同步到 Shopify，支持自动令牌续期。

## 核心逻辑
- **自动令牌续期**：在每次同步前触发 `client_credentials` 授权，绕过 24 小时令牌过期限制。
- **多语言支持**：提取的法语内容会被改写为高转化率的英文 Body HTML。
- **API 映射**：使用 `dinoho.myshopify.com` 进行身份验证，使用 `dinoho.cn` 获取店铺数据。

## 配置
- **授权 URL**：`https://dinoho.myshopify.com/admin/oauth/access_token`
- **商品 API**：`https://dinoho.myshopify.com/admin/api/2024-01/products.json`
- **密钥**：Client ID（32 位字符）和 Secret Key（在环境/脚本中管理）。

## 使用方法
当用户提供 Amazon 链接（如 Amazon.fr、.de、.uk）时触发此技能，自动创建 Shopify 商品列表。

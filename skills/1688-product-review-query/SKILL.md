---
name: 1688-product-review-query
description: >-
  遨虾下游商机商品评论查询SKILL：根据商机商品ID列表查询商品的用户评论，支持评分、时间、点赞数等多维度筛选和排序。
  触发场景：用户说"查询评论"、"商品评价"、"用户评论"、"提炼卖点"、"分析用户反馈"、"查看差评"。
  用于商品评价分析、卖点提炼、改进点挖掘、用户洞察、竞品对比等场景。
  必需参数：商品ID列表（Amazon如B08XYZ123或TikTok商品ID）、platform（amazon/tiktok）、region（国家代码如US/ID等）。
metadata:
  version: 1.1.0
  openclaw:
    primaryEnv: ALPHASHOP_ACCESS_KEY, ALPHASHOP_SECRET_KEY
    requires:
       env: []
---

# 1688商品评论查询SKILL

根据商品ID列表查询商品的用户评论，支持多维度筛选和排序，帮助分析用户反馈、提炼卖点、挖掘改进点。

## 功能说明

本Skill封装了商品评论查询API，提供以下核心功能：

### 核心功能
- **批量查询**：支持同时查询多个商品的评论（最多20个）
- **多维度筛选**：支持按评分、时间、点赞数筛选
- **灵活排序**：支持按时间、评分、点赞数排序
- **分页查询**：支持大量评论的分页获取

### 使用场景
1. **卖点提炼**：从高评分、高点赞评论中提炼产品核心卖点
2. **改进点挖掘**：从低评分评论中发现产品需要改进的地方
3. **用户洞察**：分析用户关注点和痛点
4. **竞品对比**：对比不同商品的用户反馈
5. **时间趋势**：分析不同时期用户反馈的变化

## 配置

### 环境变量

需要配置 AlphaShop API 凭证。在 OpenClaw config 中设置：

```json5
{
  skills: {
    entries: {
      "1688-product-review-query": {
        env: {
          ALPHASHOP_ACCESS_KEY: "你的AccessKey",
          ALPHASHOP_SECRET_KEY: "你的SecretKey"
        }
      }
    }
  }
}
```

### 如何获取 API Key

#### 获取途径

本 skill 使用 AlphaShop/遨虾平台的 API 服务，需要申请以下凭证：
- `ALPHASHOP_ACCESS_KEY` - API 访问密钥
- `ALPHASHOP_SECRET_KEY` - API 密钥

#### 申请步骤

1. **联系平台方**
   - 如果您是 1688 或阿里内部用户，请联系 AlphaShop/遨虾 平台管理员
   - 平台可能需要您提供：
     - 公司信息
     - 使用场景说明
     - 预期调用量

2. **获取凭证**
   - 平台审核通过后会提供：
     - Access Key（访问密钥）
     - Secret Key（密钥）

3. **配置到环境**
   - 按照上面的配置方式设置环境变量

#### 缺少凭证时的提示

如果运行 skill 时未配置凭证，会看到详细的配置指南：

```
🔐 需要 AlphaShop API 凭证

本 skill 需要以下凭证才能使用：
  • ALPHASHOP_ACCESS_KEY  - API 访问密钥
  • ALPHASHOP_SECRET_KEY  - API 密钥

📋 如何获取凭证：
1. 联系 AlphaShop/遨虾 平台获取 API 凭证
2. 配置环境变量或 OpenClaw 配置
3. 重新运行命令
```

## 安全声明

本 Skill 遵循最小权限原则和数据安全最佳实践，确保在使用过程中的安全性和可控性。

### 数据隔离
- ✅ **API 访问范围**：仅访问 AlphaShop API (`https://api.alphashop.cn`)
- ✅ **数据处理**：不处理、存储或传输用户个人身份信息（PII）
- ✅ **评论内容**：仅查询公开的商品评论数据，不涉及用户隐私信息
- ✅ **数据用途**：仅用于商品分析和市场洞察，不用于其他目的

### 凭证安全
- ✅ **传递方式**：API 凭证通过环境变量安全传递，不在代码中硬编码
- ✅ **认证机制**：使用 JWT Token 进行身份认证，支持 1 小时有效期
- ✅ **日志保护**：脚本不在日志或标准输出中记录敏感信息（AccessKey/SecretKey）
- ✅ **凭证管理**：建议使用 OpenClaw 配置管理凭证，避免明文存储

### 权限最小化
- ✅ **文件系统**：仅需读取环境变量权限，无需文件系统写入权限（除非指定 `--output`）
- ✅ **网络访问**：仅访问 AlphaShop API 端点，不进行其他网络连接
- ✅ **系统权限**：无需 Root/Admin 权限，普通用户即可运行
- ✅ **进程隔离**：脚本运行在独立的 Python 进程中，不影响其他进程

### 安全编码实践
- ✅ **参数校验**：严格校验所有输入参数，防止注入攻击
- ✅ **原生 API**：使用 Python 标准库和成熟的第三方库（`requests`, `jwt`），不调用 Shell 命令
- ✅ **错误处理**：完整的异常捕获和错误提示，避免敏感信息泄露
- ✅ **超时保护**：设置 HTTP 请求超时，防止资源占用

### 责任声明
- ⚠️ **凭证保管**：用户需自行妥善保管 API 凭证，避免泄露给他人
- ⚠️ **合规使用**：确保在合规范围内使用 API 服务，遵守 AlphaShop 平台的使用条款
- ⚠️ **数据合规**：使用评论数据时需遵守相关法律法规，不得用于非法目的
- ⚠️ **调用频率**：建议控制调用频率（QPS < 10），避免对平台造成压力

### 审计与监控
- 📊 **调用记录**：每次 API 调用都会记录时间戳、请求参数（脱敏）、响应状态
- 📊 **错误追踪**：详细的错误日志帮助快速定位问题，不包含敏感信息
- 📊 **性能监控**：记录 API 响应时间，帮助优化查询策略

## 支持的平台和国家

### Amazon 平台
支持国家：`US`, `UK`, `ES`, `FR`, `DE`, `IT`, `CA`, `JP`

### TikTok 平台
支持国家：`ID`, `VN`, `MY`, `TH`, `PH`, `US`, `SG`, `BR`, `MX`, `GB`, `ES`, `FR`, `DE`, `IT`, `JP`

## 使用方法

### 基础用法

#### 1. 查询单个商品的评论

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US"
```

#### 2. 查询多个商品的评论

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" "B09ABC456" \
  --platform "amazon" \
  --country "US" \
  --page-size 20
```

### 筛选功能

#### 3. 查询高评分评论（提炼卖点）

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US" \
  --min-rating 4.5 \
  --max-rating 5.0 \
  --sort-field "up_num" \
  --sort-order "desc"
```

**使用场景**：从高评分、高点赞的评论中提炼产品核心卖点

#### 4. 查询低评分评论（挖掘改进点）

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US" \
  --min-rating 0.0 \
  --max-rating 2.0 \
  --sort-field "review_time" \
  --sort-order "desc"
```

**使用场景**：从低评分评论中发现产品需要改进的地方

#### 5. 查询高点赞评论（最受认可）

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US" \
  --min-up-num 10 \
  --sort-field "up_num" \
  --sort-order "desc"
```

**使用场景**：查看用户最认可的评论，了解真实用户体验

#### 6. 查询特定时间段的评论

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US" \
  --start-time "2025-01-01" \
  --end-time "2025-01-31"
```

**使用场景**：分析特定时期的用户反馈，发现问题或改进效果

### 组合筛选

#### 7. 综合筛选（高质量评论）

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US" \
  --min-rating 4.0 \
  --max-rating 5.0 \
  --min-up-num 5 \
  --start-time "2025-01-01" \
  --end-time "2025-03-31" \
  --sort-field "review_time" \
  --sort-order "desc" \
  --page-size 20
```

**使用场景**：获取近期高质量、有代表性的用户评论

### 输出格式

#### 8. 输出为JSON格式

```bash
python3 scripts/review_query.py query \
  --product-id "B08XYZ123" \
  --platform "amazon" \
  --country "US" \
  --json \
  --output reviews.json
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `--product-id` | String[] | ✅ | 商品ID列表（最多20个） | `"B08XYZ123" "B09ABC456"` |
| `--platform` | String | ✅ | 平台（`amazon` 或 `tiktok`） | `"amazon"` |
| `--country` | String | ✅ | 国家代码（大写） | `"US"` |
| `--page-num` | Integer | ❌ | 页码，从1开始，默认1 | `1` |
| `--page-size` | Integer | ❌ | 每页数量，默认10，最大50 | `20` |
| `--min-rating` | Float | ❌ | 最低评分（0.0-5.0） | `4.0` |
| `--max-rating` | Float | ❌ | 最高评分（0.0-5.0） | `5.0` |
| `--start-time` | String | ❌ | 开始时间（yyyy-MM-dd） | `"2025-01-01"` |
| `--end-time` | String | ❌ | 结束时间（yyyy-MM-dd） | `"2025-03-31"` |
| `--min-up-num` | Integer | ❌ | 最小点赞数 | `10` |
| `--sort-field` | String | ❌ | 排序字段（`review_time`/`review_score`/`up_num`） | `"review_time"` |
| `--sort-order` | String | ❌ | 排序方向（`asc`/`desc`），默认desc | `"desc"` |
| `--user-id` | String | ❌ | 用户ID | `"user_123"` |
| `--json` | Flag | ❌ | 输出JSON格式 | - |
| `--output` | String | ❌ | 输出文件路径 | `"reviews.json"` |

## 返回数据

### 基础信息
- **评论总数**：符合条件的评论总数
- **分页信息**：当前页码、每页数量、总页数
- **平台和国家**：查询的平台和国家

### 评论字段说明

| 字段名 | 类型 | 必有 | 说明 | 使用场景 |
|--------|------|------|------|----------|
| `productId` | String | ✅ | 商品ID | 关联商品信息 |
| `productTitle` | String | ✅ | 商品标题 | 确认评论对应的商品 |
| `reviewTitle` | String | ✅ | 评论标题 | 快速了解评论主题 |
| `reviewContent` | String | ✅ | 评论内容（原文） | 完整评论文本 |
| `reviewPictureUrl` | String | ⚠️ | 评价图片URL | **高价值**：买家秀图片，真实使用场景 |
| `rating` | Float | ✅ | 评分（0.0-5.0） | 用户满意度 |
| `reviewTime` | String | ✅ | 评论时间 | 时间趋势分析 |
| `upNum` | Integer | ✅ | 点赞数 | 评论认可度，筛选高质量评论 |
| `author` | String | ⚠️ | 评价者ID | 用户标识 |
| `reviewerName` | String | ⚠️ | 评论者名称 | 评论者展示名 |
| `verifiedPurchase` | Boolean | ⚠️ | 是否已验证购买 | 判断评论可信度 |
| `labelNames` | Array | ⚠️ | 评论标签列表 | **核心功能**：自动化提炼卖点和改进点 |
| `contentInfo` | Object | ⚠️ | 多语言内容 | 包含中文/英文翻译 |

**字段说明**：
- ✅ **必有字段**：所有评论都包含这些字段
- ⚠️ **可选字段**：某些评论可能不包含（取决于数据源）

### 高价值字段重点说明

#### 1. reviewPictureUrl - 评价图片（买家秀）
**价值**：
- 真实使用场景，比官方图片更有说服力
- 帮助判断商品实际质量和外观
- 可用于产品详情页优化

**使用建议**：
- 筛选带图评论：有图评论通常更详细、更有参考价值
- 分析买家秀与卖家秀的差异
- 收集用户真实使用场景

#### 2. labelNames - 评论标签
**价值**：
- 结构化的评论关键点提取
- 快速了解用户关注的核心特性
- 自动化卖点和改进点挖掘

**常见标签示例**：
- 正面标签：`["音质好", "降噪效果好", "佩戴舒适", "性价比高", "电池续航长"]`
- 负面标签：`["蓝牙不稳定", "音质一般", "佩戴不舒适"]`

**使用场景**：
- 卖点提炼：统计高评分评论的正面标签频次
- 改进点挖掘：统计低评分评论的负面标签频次
- 竞品对比：对比不同商品的标签分布

#### 3. contentInfo - 多语言内容
**价值**：
- 提供中文翻译，方便中文用户理解
- 保留英文原文，确保信息准确性

**数据结构**：
```json
{
  "zh": "这是一款功能出色的耳机...",
  "en": "This is an amazing phone..."
}
```

## 使用建议

### 场景1：提炼产品卖点
**目标**：找到用户最认可的产品优点

**筛选条件**：
```bash
--min-rating 4.5 --max-rating 5.0 \
--min-up-num 10 \
--sort-field "up_num" --sort-order "desc"
```

**分析要点**：
- 关注高点赞评论中的关键词
- **使用 labelNames 标签**：统计高评分评论的正面标签频次（如"音质好"、"性价比高"）
- **查看 reviewPictureUrl 买家秀**：观察用户真实使用场景和效果
- 提取用户反复提及的优点
- 整理成产品核心卖点

### 场景2：挖掘改进点
**目标**：发现产品需要改进的地方

**筛选条件**：
```bash
--min-rating 0.0 --max-rating 2.0 \
--sort-field "review_time" --sort-order "desc"
```

**分析要点**：
- 分析负面评论的共性问题
- **使用 labelNames 标签**：统计低评分评论的负面标签频次（如"蓝牙不稳定"、"音质一般"）
- **查看 reviewPictureUrl 买家秀**：观察实际问题和质量问题
- 识别高频出现的抱怨点
- 制定产品改进计划

### 场景3：竞品对比
**目标**：对比不同商品的用户反馈

**操作方式**：
- 分别查询各竞品的评论
- 对比高评分和低评分评论
- 找出竞品优势和劣势

### 场景4：时间趋势分析
**目标**：分析用户反馈的时间变化

**操作方式**：
- 分时间段查询评论
- 对比不同时期的评论内容
- 评估产品改进效果

### 场景5：用户洞察
**目标**：深入理解用户需求和痛点

**筛选条件**：
```bash
--min-up-num 5 \
--sort-field "up_num" --sort-order "desc" \
--page-size 30
```

**分析要点**：
- 识别用户关注的核心需求
- 发现隐藏的使用场景
- 理解用户决策因素

## 输出示例

### 格式化输出（默认）

```
=== 商品评论查询结果 ===

查询条件:
  平台: amazon
  国家: US
  商品数: 1
  筛选: 评分 4.5-5.0, 最小点赞数 10

找到评论: 25 条
当前页: 1 / 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] ⭐ 5.0 | 👍 45 | 2025-01-15 10:30:00
商品: B08XYZ123
商品标题: Wireless Bluetooth Headphones with Noise Cancelling
标题: Great product!
内容: This is an amazing phone with excellent features...
评价图片: https://m.media-amazon.com/images/I/review123.jpg
标签: ["音质好", "降噪效果好", "佩戴舒适"]
评论者: John D. (ID: A1B2C3D4) ✓
翻译: 这是一款功能出色的耳机...

[2] ⭐ 5.0 | 👍 32 | 2025-01-14 20:15:00
商品: B08XYZ123
商品标题: Wireless Bluetooth Headphones with Noise Cancelling
标题: Love it!
内容: Best purchase ever. Highly recommended...
评价图片: https://m.media-amazon.com/images/I/review456.jpg
标签: ["性价比高", "电池续航长"]
评论者: Sarah M. (ID: E5F6G7H8) ✓
翻译: 迄今为止最好的购买...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
总计: 25 条评论
```

### JSON 输出

```json
{
  "success": true,
  "data": {
    "reviewList": [
      {
        "productId": "B08XYZ123",
        "productTitle": "Wireless Bluetooth Headphones with Noise Cancelling",
        "reviewTitle": "Great product!",
        "reviewContent": "This is an amazing phone...",
        "reviewPictureUrl": "https://m.media-amazon.com/images/I/review123.jpg",
        "rating": 5.0,
        "reviewTime": "2025-01-15 10:30:00",
        "upNum": 45,
        "author": "A1B2C3D4",
        "reviewerName": "John D.",
        "verifiedPurchase": true,
        "labelNames": ["音质好", "降噪效果好", "佩戴舒适"],
        "contentInfo": {
          "zh": "这是一款功能出色的耳机...",
          "en": "This is an amazing phone..."
        }
      }
    ],
    "totalCount": 25,
    "pageNum": 1,
    "pageSize": 10,
    "totalPages": 3,
    "targetPlatform": "amazon",
    "targetCountry": "US"
  }
}
```

## 错误处理

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| 商品ID列表不能为空 | 未提供商品ID | 使用 `--product-id` 参数 |
| 平台不合法 | 平台参数错误 | 只能是 amazon 或 tiktok |
| 国家不合法或与平台不匹配 | 国家与平台不匹配 | 检查平台支持的国家列表 |
| 评分范围非法 | minRating > maxRating | 检查评分范围设置 |
| 未找到符合条件的评论 | 筛选条件过严 | 放宽筛选条件 |
| 认证失败 | 凭证无效 | 检查 AccessKey 和 SecretKey |

## 性能说明

- **响应时间**：通常 < 500ms（单商品），< 1s（多商品）
- **建议并发**：单用户 QPS < 10
- **数据时效性**：评论数据每日更新
- **建议设置**：3秒超时

## 注意事项

1. **商品ID数量**：单次最多查询20个商品ID
2. **分页大小**：pageSize 建议 10-20，最大不超过 50
3. **筛选建议**：首次查询建议只用必填参数，根据结果调整筛选条件
4. **点赞数筛选**：用于找到最有代表性的评论
5. **时间格式**：支持 yyyy-MM-dd 格式（如 2025-01-01）
6. **排序组合**：按点赞数降序可以找到最受认可的评论
7. **评论语言**：返回原文，未翻译

## FAQ

### Q1: 如何提炼产品卖点？
**A**: 使用高评分、高点赞筛选，分析评论中的高频正面词汇和用户认可的功能点。

### Q2: 如何发现产品改进点？
**A**: 查询低评分评论（1-2星），分析用户抱怨的共性问题，制定改进计划。

### Q3: 评论是原文还是翻译？
**A**: 当前返回原文内容，如需翻译请使用其他翻译工具。

### Q4: 如何判断评论的代表性？
**A**: 关注点赞数（upNum）高的评论，以及已验证购买（verifiedPurchase）的评论。

### Q5: 可以搜索评论关键词吗？
**A**: 当前不支持关键词搜索，建议先获取评论后在本地进行关键词匹配。

### Q6: 如何分析竞品？
**A**: 分别查询各竞品商品ID的评论，对比高低评分评论的差异。

### Q7: 评论数据多久更新一次？
**A**: 评论数据每日更新，建议不要频繁查询同一商品。

### Q8: 如何使用评论标签（labelNames）？
**A**: labelNames 提供结构化的评论关键点提取：
- 统计正面标签（高评分评论）找卖点
- 统计负面标签（低评分评论）找改进点
- 对比竞品标签分布找差异化机会

### Q9: 如何筛选带图评论（买家秀）？
**A**: 当前API不支持直接筛选带图评论，建议：
1. 获取评论列表
2. 在本地过滤 `reviewPictureUrl` 不为空的评论
3. 带图评论通常更详细、更有参考价值

### Q10: contentInfo 包含哪些语言？
**A**: contentInfo 包含：
- `zh`: 中文翻译
- `en`: 英文原文
对于非英文评论，也会提供英文翻译



## 相关文档

- [API 参考文档](./references/api.md)
- [商品评论查询API文档](https://wiki.example.com/ProductReviewQueryAPI)
- [AlphaShop API 认证说明](https://api.alphashop.cn/docs/auth)

## 变更日志

### Version 1.1 (2026-03-25)
- **字段完整性提升**（60% → 90%+）
- 添加输出字段：
  - `reviewPictureUrl` - 评价图片URL（买家秀，高价值内容）
  - `labelNames` - 评论标签信息（结构化分析核心功能）
  - `productTitle` - 商品标题
  - `author` - 评价者ID
  - `contentInfo` - 多语言内容（中文/英文翻译）
- 新增详细字段说明表格
- 新增高价值字段使用指南
- 更新输出示例，包含所有字段
- 新增FAQ：标签使用、买家秀筛选、多语言支持


## 能力边界与约束

### ✅ 本 Skill 可以做什么

- ✅ 根据商机商品 ID 列表查询商品的用户评论
- ✅ 支持多维度筛选（评分、时间、点赞数、是否有图/视频等）
- ✅ 支持多字段排序（时间、评分、点赞数）
- ✅ 支持分页查询
- ✅ 返回评论详情（内容、评分、时间、点赞数、标签、买家秀等）
- ✅ 支持切换环境（预发/生产）
- ✅ 将评论数据保存到本地文件
- ✅ 可以多次调用，查询不同商品或应用不同筛选条件

### ❌ 本 Skill 不能做什么

- ❌ **不能批量查询多个商品**：一次调用只能查询一个商品的评论（虽然参数是列表，但建议单个查询）
- ❌ **不能分析评论**：只展示原始评论数据，不做情感分析、卖点提炼、改进点挖掘
- ❌ **不能回复评论**：只读查询，不能发表评论或回复用户
- ❌ **不能修改评论**：不能编辑或删除评论数据
- ❌ **不能访问其他 API**：只调用评论查询端点
- ❌ **不能实时更新**：评论数据有延迟，不是实时抓取

### 💡 合理的延伸问题示例

**✅ 推荐的延伸方向**（在能力范围内或可多次调用实现）：
- "换一个商品 ID 查询评论"
- "只查看 5 星好评"
- "筛选出有买家秀的评论"
- "按点赞数排序"
- "查看前 50 条评论"
- "将评论保存到文件"
- "对比这 3 个商品的评论"（提示：需要手动调用三次）
- "查看差评内容"（筛选 1-2 星）

**❌ 不推荐的延伸方向**（超出 skill 范围）：
- "分析这个商品的用户情感倾向"（需要情感分析工具）
- "自动提炼卖点和改进点"（需要 NLP 分析工具）
- "对比这 10 个商品的评论质量"（需要批量分析工具）
- "预测这个商品的评分趋势"（无预测能力）

**💡 后续处理建议**：
- 可以将评论保存后，手动阅读并提炼卖点和改进点
- 可以使用文本分析工具（如 Python NLP 库）进行情感分析
- 可以定期查询同一商品，跟踪评论变化和评分趋势

---

**维护者**: global-1688-ai-sel 团队
**最后更新**: 2026-03-25
**版本**: v1.1

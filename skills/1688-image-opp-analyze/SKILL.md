---
name: 1688-image-opp-analyze
description: >-
  遨虾图片市场机会分析SKILL：根据1688商品ID通过图片分析下游市场（Amazon/TikTok）销售机会。
  触发场景：用户说"市场机会分析"、"备货时机"、"商品机会评估"、"市场阶段判断"、"分析这个商品的市场机会"。
  提供市场阶段判断（黄金备货期/顺势增长期/市场空白期）、B2B采购趋势、C端销量分析等功能。
  必需参数：1688商品ID（如824905001277）或图片URL。
metadata:
  openclaw:
    primaryEnv: ALPHASHOP_ACCESS_KEY, ALPHASHOP_SECRET_KEY
    requires:
      env: []
---

# 1688图片市场机会分析SKILL

通过AI分析1688商品图片，识别该商品在下游跨境平台（Amazon/TikTok）的市场销售机会，帮助商家判断备货时机和出口潜力。

## 功能说明

本Skill封装了图片市场机会分析API，通过分析商品图片提供：

### 核心功能

1. **市场阶段智能判断**
   - 黄金备货期：B端采购激增，C端尚未爆发
   - 顺势增长期：B端或C端市场已经启动
   - 市场空白期：供需均处于低位，适合试卖

2. **多市场数据对比**
   - Amazon 美国/欧洲/日本等市场
   - TikTok 东南亚/美国/欧洲等市场
   - 近30天销量、12个月趋势、12周趋势

3. **B2B采购洞察**
   - 1688端采购销量趋势
   - 采购峰值识别
   - 与C端市场联动分析

4. **商品亮点提取**
   - 功能特性标签
   - 供应商优势标签
   - 辅助选品决策

## 安全声明

1. **数据安全**：本Skill不存储任何用户数据或商品信息，所有分析结果实时生成，不留存本地
2. **凭证安全**：API凭证通过环境变量管理，不在代码中硬编码，防止泄露
3. **权限控制**：使用JWT Token认证机制，支持用户级别限流（默认QPS=10）
4. **数据范围**：仅访问公开的市场数据和1688商品信息，不涉及PII或敏感个人信息
5. **网络限制**：仅访问 AlphaShop API 端点（pre-api.alphashop.cn / api.alphashop.cn），不访问生产数据库
6. **审计追踪**：每次API调用包含requestId，支持完整的请求链路追踪

## 配置

### 环境变量

需要配置 AlphaShop API 凭证。在 OpenClaw config 中设置：

```json5
{
  skills: {
    "1688-image-opp-analyze": {
      env: {
        ALPHASHOP_ACCESS_KEY: "your_access_key",
        ALPHASHOP_SECRET_KEY: "your_secret_key"
      }
    }
  }
}
```

或者使用 `.env` 文件：

```bash
ALPHASHOP_ACCESS_KEY=your_access_key
ALPHASHOP_SECRET_KEY=your_secret_key
```

### 获取凭证

访问 [AlphaShop开放平台](https://api.alphashop.cn) 注册并获取API凭证。

### 环境配置

本Skill支持预发和生产两个环境，通过环境变量 `ALPHASHOP_ENV` 切换。

#### 环境端点

| 环境 | 环境变量值 | 端点 |
|------|-----------|------|
| 生产环境 (默认) | `prod` | https://api.alphashop.cn/ai.sel.global1688.image.opp.analyze/1.0 |
| 预发环境 | `pre` | https://pre-api.alphashop.cn/ai.sel.global1688.image.opp.analyze/1.0 |

#### 切换环境

**默认生产环境**：
```bash
/1688-image-opp-analyze analyze 824905001277
```

**切换到预发环境**（用于测试）：
```bash
export ALPHASHOP_ENV=pre
/1688-image-opp-analyze analyze 824905001277
```

或单次使用：
```bash
ALPHASHOP_ENV=pre /1688-image-opp-analyze analyze 824905001277
```

## 使用方法

### 命令格式

```bash
# 方式1: 通过商品ID分析（自动获取商品图片）
/1688-image-opp-analyze analyze <item_id>

# 方式2: 通过商品ID + 指定图片URL
/1688-image-opp-analyze analyze <item_id> --image <image_url>

# 方式3: 仅通过图片URL分析（无需商品ID）
/1688-image-opp-analyze analyze --image <image_url>

# 方式4: 指定用户ID
/1688-image-opp-analyze analyze <item_id> --user-id <user_id>
```

### 参数说明

- `item_id`: 1688商品ID（可选），例如：720345678912
  - 与 `--image` 同时提供时：使用指定图片分析该商品
  - 单独提供时：自动获取商品白底图或主图分析
  - 不提供时：必须提供 `--image` 参数

- `--image` / `-i`: 商品图片URL（可选）
  - 支持完整的图片URL，例如：`https://cbu01.alicdn.com/img/xxx.jpg`
  - 不提供时：系统自动获取商品的白底图或主图

- `--user-id` / `-u`: 用户ID（可选）
  - 用于权限控制和限流
  - 默认值：`0`（表示匿名用户）
  - **注意**：必须是数字，服务端会将其转换为 Long 类型
  - 建议使用真实用户ID（数字）以获得更好的服务

### 使用示例

#### 示例 1: 通过商品ID分析（最常用）

```bash
/1688-image-opp-analyze analyze 720345678912
```

返回内容包括：
- 市场阶段标签和建议
- Amazon US 市场数据
- TikTok US 市场数据
- 1688 B2B采购数据
- 商品和供应商亮点

#### 示例 2: 指定图片URL分析商品

```bash
# 使用特定的商品图片（而非默认白底图）
/1688-image-opp-analyze analyze 720345678912 --image https://cbu01.alicdn.com/img/ibank/O1CN01xxx.jpg
```

#### 示例 3: 纯图片分析（无商品ID）

```bash
# 分析任意商品图片，无需提供商品ID
/1688-image-opp-analyze analyze --image https://example.com/product-image.jpg
```

**适用场景**：
- 分析竞品图片
- 分析未上架商品的样品图片
- 快速验证图片的市场潜力

#### 示例 4: 指定用户ID

```bash
# 使用特定用户ID进行分析
/1688-image-opp-analyze analyze 720345678912 --user-id 453326
```

**适用场景**：
- 需要记录用户行为
- 需要用户级别的限流控制
- 需要个性化的分析结果

#### 示例 5: 批量分析商品

```bash
# 可以多次调用分析不同商品
/1688-image-opp-analyze analyze 720345678912
/1688-image-opp-analyze analyze 720987654321
/1688-image-opp-analyze analyze 720123456789
```

## 输出格式

### 市场机会分析报告

```markdown
# 商品市场机会分析报告

## 商品基础信息
- **商品ID**: 720345678912
- **商品图片**: https://cbu01.alicdn.com/img/ibank/O1CN01xxx.jpg
- **1688商品链接**: https://detail.1688.com/offer/720345678912.html
- **类目路径**: 手机配件 > 手机壳 > 透明壳

---

## 市场阶段
**黄金备货期**
B端近期出现集中采购囤货，C端市场尚未爆发，建议立即备货

## 下游市场机会

### Amazon - US
- 近30天销量：156,789
- 相似款在售：3,450
- 售价：$23.99
- 评分：4.5 ⭐
- 销量涨幅：+30.5%

💡 **提示**: 可通过 AlphaShop 平台查看该商品在 Amazon 的相似商品详情

**近12个月销量趋势：**
📈 12,456 → 15,678 → 14,523 → 16,789 → 18,456 → 17,234 → 19,567 → 21,456 → 23,789 → 25,678 → 27,456 → 29,234

### TikTok - US
- 近30天销量：45,678
- 相似款在售：1,234
- 售价：$19.99
- 评分：4.3 ⭐
- 销量涨幅：+21.5%

💡 **提示**: 可通过 AlphaShop 平台查看该商品在 TikTok 的相似商品详情

## 1688 B2B采购数据

- 近30天采购量：245
- 近12周采购趋势：
  📊 18 → 22 → 25 → 28 → 135 ⚡ → 142 ⚡ → 158 ⚡ → 165 ⚡ → 32 → 28 → 25 → 23

⚡ 表示采购峰值（>100），说明B端商家集中囤货

## 商品亮点

### 功能特性
- 防水
- 速干
- 透气
- 高弹力

### 供应商优势
- 金牌供应商
- 15年外贸经验
- ISO认证

---

**分析结论**：
该商品处于黄金备货期，B端商家已开始集中采购，但C端市场尚未大规模爆发。
建议：立即备货，抢占市场先机。
```

## 输出字段说明

### 市场阶段

| 阶段 | 说明 | 建议 |
|------|------|------|
| 黄金备货期 | B端采购激增，C端未爆发 | 立即备货，抢占先机 |
| 顺势增长期 | 市场已开始爆发 | 立即备货，跟随趋势 |
| 市场空白期 | 供需均处低位 | 小批量试卖，观察市场 |

### 市场数据字段

- **soldCntLst30d**: 近30天销量
- **similarItemCount**: 相似款在售商品数
- **sellingPrice**: SPU售价（美元）
- **rating**: 商品评分（0-5）
- **salesGrowthRate**: 销量涨幅（百分比）
- **soldCntHisByM**: 近12个月月销量趋势
- **soldCntHisByW**: 近12周周销量趋势

## 错误处理

### 常见错误

1. **查看权限不足**
```
错误：isDisplay: false
说明：当前用户尚不符合查看资格，需要加白
解决：请联系遨虾选品技术团队 @昱晖 进行用户加白
```

> **重要提示**：`isDisplay: false` 表示用户未获得查看市场机会数据的权限，这不是商品数据问题，而是用户权限控制。加白后即可正常查看所有商品的市场分析数据。

2. **商品ID不存在**
```
错误：商品信息不存在
解决：检查商品ID是否正确
```

3. **无市场数据**
```
错误：当前商品无市场机会数据
解决：该商品可能无下游市场销售，尝试其他商品
```

4. **API凭证错误**
```
错误：Authentication failed
解决：检查 ALPHASHOP_ACCESS_KEY 和 ALPHASHOP_SECRET_KEY 配置
```

5. **超时错误**
```
错误：请求超时
解决：接口响应时间较长（最多120秒），请稍后重试
```

## 限制说明

1. **响应时间**：接口分析需要5-10秒，请耐心等待
2. **限流策略**：默认QPS=10，如需提高请联系AlphaShop
3. **数据更新**：市场数据每日更新一次
4. **缓存机制**：相同商品30分钟内查询会使用缓存数据

## 实用技巧

### 1. 批量选品流程

```bash
# Step 1: 搜索关键词获取候选商品
/1688-ai-selection search yoga pants

# Step 2: 对热门商品进行市场机会分析
/1688-image-opp-analyze analyze <商品ID1>
/1688-image-opp-analyze analyze <商品ID2>
/1688-image-opp-analyze analyze <商品ID3>

# Step 3: 根据市场阶段和销量趋势做出选品决策
```

### 2. 竞品图片分析流程

```bash
# 场景：发现竞争对手的商品图片，快速分析市场机会

# 直接用图片URL分析（无需知道1688商品ID）
/1688-image-opp-analyze analyze --image https://competitor-site.com/product.jpg

# 或者保存图片后使用本地路径（需先上传到CDN获取URL）
/1688-image-opp-analyze analyze --image https://cbu01.alicdn.com/uploaded/xxx.jpg
```

### 3. 样品图片快速验证

```bash
# 场景：供应商发来新品样品图片，想快速了解市场潜力

# 方式1: 如果图片已上传到网络
/1688-image-opp-analyze analyze --image https://example.com/sample.jpg

# 方式2: 如果有对应的1688商品，但想用特定角度的图片
/1688-image-opp-analyze analyze 720345678912 --image https://example.com/detail-view.jpg
```

### 2. 快速筛选策略

- **优先选择"黄金备货期"商品**：抢占市场先机
- **关注B端采购峰值**：峰值>100说明B端商家看好该商品
- **对比多个市场**：选择销量增长快、相似款少的市场
- **验证供应商实力**：金牌供应商+外贸经验是加分项

### 3. 趋势分析建议

- **月销量趋势**：观察是否持续上涨或季节性波动
- **周销量趋势**：近期增长说明市场热度提升
- **B2B vs C端**：B端先行通常是C端爆发的信号

## 技术说明

- **接口类型**: HTTP API（RESTful）
- **接口端点**: `https://pre-api.alphashop.cn/ai.sel.global1688.image.opp.analyze/1.0`
- **请求方法**: POST
- **Content-Type**: application/json
- **超时时间**: 120秒
- **数据来源**: AlphaShop AI选品平台
- **支持平台**: Amazon（多国）、TikTok（多国）

**底层服务**（仅供参考）：
- 底层 HSF 服务：`com.alibaba.global1688.ai.sel.api.hsf.OppSelectionHsfService`
- HSF 方法：`imageOppAnalyzeApi`

## 更新日志

### v1.1.0 (2026-03-19)
- 🔄 更新为正式 HSF 接口
- 🌐 接口端点：`https://pre-api.alphashop.cn/ai.sel.global1688.image.opp.analyze/1.0`
- ✨ 新增 userId 参数支持
- 📝 参数名称更新：`item_id` → `itemId`，`image_url` → `imageUrl`
- ⏱️ 超时时间延长至 120 秒
- 📚 完善 API 文档


## 相关资源

- [AlphaShop开放平台](https://api.alphashop.cn)
- [API接口文档](https://api.alphashop.cn/docs)
- [1688遨虾AI选品](https://www.alphashop.cn)

## 能力边界与约束

### ✅ 本 Skill 可以做什么

- ✅ 根据 1688 商品 ID，通过图片分析下游市场（Amazon/TikTok）销售机会
- ✅ 提供市场阶段判断（黄金备货期/顺势增长期/市场空白期）
- ✅ 返回 B2B 采购趋势和 C 端销量分析
- ✅ 识别商品亮点、功能特性、应用场景
- ✅ 支持切换环境（预发/生产）
- ✅ 将分析报告保存到本地文件
- ✅ 可以多次调用，分析不同的商品

### ❌ 本 Skill 不能做什么

- ❌ **不能批量分析**：一次调用只能分析一个商品 ID
- ❌ **不能自定义市场判断规则**：市场阶段由 AlphaShop 算法预定义
- ❌ **不能深度分析**：只展示 API 返回的机会点和趋势数据，不做策略建议
- ❌ **不能实时更新**：分析基于离线计算的数据，不是实时市场数据
- ❌ **不能修改数据**：只读查询，不能影响市场判断结果
- ❌ **不能访问其他 API**：只调用图片市场机会分析端点

### 💡 合理的延伸问题示例

**✅ 推荐的延伸方向**（在能力范围内或可多次调用实现）：
- "换一个商品 ID 分析看看"
- "分析商品 ID 12345 的市场机会"
- "切换到生产环境分析"
- "将分析报告保存到文件"
- "对比这 3 个商品的市场阶段"（提示：需要手动调用三次）
- "查看这个商品的 B2B 采购峰值"（在当前报告中）

**❌ 不推荐的延伸方向**（超出 skill 范围）：
- "分析这 20 个商品的综合市场机会"（需要批量分析工具）
- "预测这个商品下个月的销量"（无预测能力）
- "根据机会点自动推荐类似商品"（无推荐能力）
- "对比这个商品在不同国家的市场机会"（需要确认 API 是否支持）

**💡 后续处理建议**：
- 可以将多个商品的分析报告保存后，手动对比市场阶段和趋势
- 可以根据"黄金备货期"判断，在 1688 平台上联系供应商采购
- 可以定期分析同一商品，跟踪市场阶段变化

## 反馈与支持

如有问题或建议，请联系：
- GitHub Issues: [提交反馈](https://github.com/your-repo/issues)
- 技术支持：support@alphashop.cn

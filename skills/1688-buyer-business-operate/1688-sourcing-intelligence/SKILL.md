---
name: 1688-buyer-ops
version: 1.2.0
description: >-
  1688买家经营决策专家 —— 面向1688采购商/批发买家的综合经营分析平台。
  核心能力：选品搜索、供应商分析、询盘比价、商机洞察、素材加工、市场趋势分析、1688榜单分析。
  触发词：帮我找货、找1688货源、选品、找供应商、分析供应商、询盘、
  问供应商、联系商家、图片翻译、抠图、模特换肤、商机、热榜、趋势分析、
  Google趋势、搜索热度、市场热度分析、1688榜单、1688采购。
dependencies:
  - name: inquiry-1688
    source: https://clawhub.1688.com/skill/skill-ea9b968f5213ecec
    description: 询盘比价 - 向1688供应商发起询盘
  - name: alphashop-image
    source: https://clawhub.1688.com/skill/skill-7e2f425dbef5cb3a
    description: 素材加工 - 图片翻译、抠图、模特换肤
  - name: amazon-product-search
    source: https://clawhub.1688.com/skill/skill-4fb1b905ebaf6734
    description: 跨平台选品 - 亚马逊/TikTok平台商品搜索
  - name: query-1688-product-detail
    source: https://clawhub.1688.com/skill/skill-afcd63a8aa94e66e
    description: 商品详情 - 获取1688商品完整信息
  - name: 1688-google-trends
    source: https://clawhub.1688.com/skill/skill-f3de4a15056a585b
    description: 市场趋势 - Google Trends 搜索热度分析
  - name: 1688-ranking
    source: https://clawhub.1688.com/skill/skill-a07ec1ae25ee536c
    description: 1688榜单 - 平台热销榜单数据
---

# 1688 买家经营决策

面向1688采购商/批发买家的统一经营决策平台，整合选品、供应商分析、询盘比价、商机洞察、素材加工、市场趋势分析六大能力。

## 前置检查

⚠️ **首次使用前，系统会检测子 skill 是否已安装。**

### 自动检测机制

当用户请求某个能力时，skill 会自动检测对应的子 skill 是否已安装：

```
用户请求: "帮我向这个供应商询盘"
    │
    ├── 检测 inquiry-1688 是否已安装
    │
    ├── ✅ 已安装 → 正常执行
    │
    └── ❌ 未安装 → 提示用户安装
            │
            📦 缺少必要 skill
            │
            需要的 skill：inquiry-1688（询盘比价）
            │
            [安装 inquiry-1688](安装链接)
            │
            💡 安装后即可使用该能力
```

### 缺失时的处理

当检测到子 skill 未安装时，向用户展示：

```
⚠️ 缺少必要 skill

要使用「询盘比价」功能，需要先安装以下 skill：

| Skill | 功能 | 安装命令 |
|-------|------|---------|
| inquiry-1688 | 向1688供应商发起询盘 | 请安装 inquiry-1688 |

安装命令示例：
请帮我安装 skill：https://clawhub.alphashop.cn/skills/inquiry-1688

安装完成后告诉我，我将自动继续执行。
```

### 子 skill 依赖关系

| 能力 | 必需 skill | 安装链接 |
|------|-----------|---------|
| 选品搜索 | ❌ 无（内置） | - |
| 供应商分析 | ❌ 无（内置） | - |
| 商品详情查询 | ✅ query-1688-product-detail | https://clawhub.1688.com/skill/skill-afcd63a8aa94e66e |
| 询盘比价 | ✅ inquiry-1688 | https://clawhub.1688.com/skill/skill-ea9b968f5213ecec |
| 商机洞察 | ❌ 无（内置） | - |
| 1688榜单 | ✅ 1688-ranking | https://clawhub.1688.com/skill/skill-a07ec1ae25ee536c |
| 市场趋势分析 | ✅ 1688-google-trends | https://clawhub.1688.com/skill/skill-f3de4a15056a585b |
| 素材加工 | ✅ alphashop-image | https://clawhub.1688.com/skill/skill-7e2f425dbef5cb3a |
| 跨平台选品 | ✅ amazon-product-search | https://clawhub.1688.com/skill/skill-4fb1b905ebaf6734 |

---

## 快速安装

如果你刚安装 1688-buyer-ops，建议同时安装以下核心子 skill 以获得完整体验：

```
请帮我安装以下 skills：
1. inquiry-1688（询盘比价）：https://clawhub.1688.com/skill/skill-ea9b968f5213ecec
2. alphashop-image（素材加工）：https://clawhub.1688.com/skill/skill-7e2f425dbef5cb3a
3. amazon-product-search（跨平台选品）：https://clawhub.1688.com/skill/skill-4fb1b905ebaf6734
4. query-1688-product-detail（商品详情）：https://clawhub.1688.com/skill/skill-afcd63a8aa94e66e
5. 1688-google-trends（市场趋势）：https://clawhub.1688.com/skill/skill-f3de4a15056a585b
6. 1688-ranking（1688榜单）：https://clawhub.1688.com/skill/skill-a07ec1ae25ee536c
```

---

## 能力概览

| 能力 | 说明 | 入口脚本 |
|------|------|----------|
| **选品搜索** | 按关键词/链接/图片搜索1688商品和供应商 | `scripts/search.py` |
| **供应商分析** | 评估供应商资质、服务能力、标签 | `scripts/supplier_search.py` |
| **商品详情** | 获取商品完整信息（标题/价格/SKU/属性） | `query-1688-product-detail` skill |
| **询盘比价** | 向供应商发起询盘，20分钟后获取回复 | `inquiry-1688` skill |
| **商机洞察** | 商机热榜、趋势分析、价格分布 | `scripts/market_intelligence.py` |
| **1688榜单** | 平台热销榜单数据、行业排名 | `1688-ranking` skill |
| **市场趋势** | Google Trends 热搜、关键词对比、地区热度 | `1688-google-trends` skill |
| **素材加工** | 图片翻译、抠图、模特换肤、去水印 | `alphashop-image` skill |
| **跨平台选品** | 亚马逊/TikTok平台商品搜索分析 | `amazon-product-search` skill |

## 核心原则

⚠️ **所有选品推荐必须遵循以下原则：**

### 1. 推荐商品必须展示图片和URL

**必须展示的信息**：
| 信息类型 | 说明 |
|---------|------|
| 🖼️ 商品图片 | 使用 markdown 图片语法渲染 |
| 🔗 商品链接 | 使用 `[查看商品](URL)` 格式，禁止直接展示原始URL |
| 💰 价格 | 明确标注售价 |
| 📊 销量/评分 | 便于用户判断热度 |

**展示格式示例**：
```
![商品图片](图片URL)

**商品名称**
价格: ¥xxx / $xxx
评分: ⭐4.5 (xxx评价)
30天销量: xxx件

[查看商品](商品链接)
```

---

### 2. 1688搜索策略

**根据商品来源选择搜索方式**：

| 场景 | 搜索方式 | 说明 |
|-----|---------|------|
| **非1688商品**（Amazon/TikTok等） | 🖼️ **图片URL搜索** | 优先使用图片搜索，相似度最高 |
| **1688商品** | 🔗 商品链接 + 🖼️ 图片URL | 双重验证，可同时使用 |
| **无图片 + 非1688商品** | 🔤 关键词联想搜索 | 召回相似商品 |

**执行流程**：
1. 如果用户提供了**非1688商品链接或图片** → 优先提取图片URL进行以图搜货
2. 如果用户提供了**1688商品链接** → 可用链接搜索，同时尝试获取图片进行以图搜货
3. 如果无法获取图片且非1688商品 → 联想相关关键词进行搜索

---

### 3. 利润优先原则

**毛利是选品的核心指标**，如果不能盈利，对用户而言就不是一款好商品。

**毛利计算公式**：
```
毛利率 = (售价 - 拿货价 - 运费 - 平台费) / 售价 × 100%
```

**毛利评判标准**：

| 毛利区间 | 评价 | 说明 |
|---------|------|------|
| **≥70%** | ✅ 优秀 | 值得主推 |
| **50%-70%** | ✅ 良好 | 可考虑 |
| **30%-50%** | ⚠️ 一般 | 需谨慎评估 |
| **<30%** | ❌ 不建议 | 除非有特殊策略（如走量），否则不推荐 |

**1688拿货价参考**：
- Amazon API 返回的 `1688同款参考价` 可作为快速参考
- 精确拿货价需通过 `inquiry-1688` skill 向供应商询盘确认

**推荐时必须说明**：
- 1688拿货价（或1688同款参考价）
- 目标市场售价
- 预估毛利率
- 利润空间评级

---

## 决策路径

### 选品搜索路径

```
用户需求
    │
    ├── "找货/选品/搜商品" → 选品搜索
    │       │
    │       ├── 非1688商品 → 🖼️ 图片URL搜索
    │       ├── 1688商品 → 🔗 链接搜索 + 🖼️ 图片搜索
    │       └── 无法获取图片 → 🔤 关键词联想搜索
    │       │
    │       └── ✅ 展示结果时必须包含：图片 + URL + 价格 + 利润分析
    │
    ├── "看详情/规格参数" → 商品详情查询
    │       └── query-1688-product-detail skill
    │
    ├── "分析供应商/找工厂/看公司" → 供应商分析
    │       └── supplier_search.py
    │
    ├── "询盘/问供应商/联系商家" → 询盘比价
    │       └── inquiry-1688 skill
    │
    ├── "商机/热榜/趋势/行情" → 商机洞察
    │       └── market_intelligence.py
    │
    ├── "1688榜单/行业排名/热销榜" → 1688榜单
    │       └── 1688-ranking skill
    │
    ├── "Google趋势/搜索热度/市场热度" → 市场趋势分析
    │       └── 1688-google-trends skill
    │
    ├── "翻译图片/抠图/换模特" → 素材加工
    │       └── alphashop-image skill
    │
    └── "亚马逊/亚马逊选品/跨平台" → 跨平台选品
            └── amazon-product-search skill
```

### 市场趋势查询路径（数据降级策略）

当用户询问"细分市场趋势如何"时，按以下顺序尝试：

```
用户问：瑜伽裤的市场趋势怎么样？
    │
    ├── 1️⃣ 1688榜单数据 ← 优先使用
    │       │
    │       ├── ✅ 有数据 → 展示1688平台热销榜单
    │       │
    │       └── ❌ 无数据 → 降级到步骤2
    │
    ├── 2️⃣ Amazon/TikTok 销量数据
    │       │
    │       ├── ✅ 有数据 → 展示热销趋势
    │       │
    │       └── ❌ 无数据 → 降级到步骤3
    │
    ├── 3️⃣ Google Trends 搜索热度
    │       │
    │       ├── ✅ 有数据 → 展示搜索趋势 + 季节性分析
    │       │
    │       └── ❌ 无数据 → 降级到步骤4
    │
    └── 4️⃣ 1688站内趋势数据
            │
            ├── ✅ 有数据 → 展示1688热卖趋势
            │
            └── ❌ 无数据 → 坦诚告知用户，
                          建议用户提供更多关键词或品类信息
```

---

## 前置配置（必须先完成）

⚠️ **使用本 SKILL 前，必须先配置以下环境变量，否则 API 调用会失败。**

| 环境变量 | 说明 | 必填 | 获取方式 |
|---------|------|------|---------|
| `ALPHASHOP_ACCESS_KEY` | AlphaShop API 的 Access Key | ✅ 必填 | https://www.alphashop.cn/seller-center/apikey-management |
| `ALPHASHOP_SECRET_KEY` | AlphaShop API 的 Secret Key | ✅ 必填 | https://www.alphashop.cn/seller-center/apikey-management |

**⚠️ AlphaShop 接口欠费处理：** 如果调用 AlphaShop 接口时返回欠费/余额不足相关错误，**必须立即中断当前流程**，提示用户前往 https://www.alphashop.cn/seller-center/home/api-list 购买积分后再继续操作。

### 配置方式

在 OpenClaw config 中配置：
```json5
{
  skills: {
    entries: {
      "1688-buyer-ops": {
        env: {
          ALPHASHOP_ACCESS_KEY: "YOUR_AK",
          ALPHASHOP_SECRET_KEY: "YOUR_SK"
        }
      },
      "inquiry-1688": {
        env: {
          ALPHASHOP_ACCESS_KEY: "YOUR_AK",
          ALPHASHOP_SECRET_KEY: "YOUR_SK"
        }
      },
      "alphashop-image": {
        env: {
          ALPHASHOP_ACCESS_KEY: "YOUR_AK",
          ALPHASHOP_SECRET_KEY: "YOUR_SK"
        }
      }
    }
  }
}
```

---

## 能力详解

### 1. 选品搜索 (`search.py`)

**功能**：按关键词/1688链接/图片URL搜索商品和供应商。

```bash
# 关键词搜索
python3 scripts/search.py "连衣裙"

# 1688商品链接搜索（查找同类供应商）
python3 scripts/search.py "https://detail.1688.com/offer/945957565364.html"

# 图片搜索（以图搜货）
python3 scripts/search.py "https://example.com/product.jpg"

# 带筛选条件
python3 scripts/search.py "连衣裙" --max-price 50 --max-moq 100
```

**筛选条件**：
| 参数 | 说明 |
|------|------|
| `--max-price` | 最高单价 |
| `--max-moq` | 最大起批量 |
| `--min-ship-rate-48h` | 最低48H发货率 |

---

### 2. 供应商分析 (`supplier_search.py`)

**功能**：深入分析供应商资质、服务能力、公司背景。

```bash
python3 scripts/supplier_search.py "工厂名称或关键词"
```

---

### 3. 商品详情查询 (`query-1688-product-detail` skill)

**功能**：获取商品完整信息（标题、价格、图片、SKU、属性、供应商信息）。

**触发场景**：用户想看商品详情、规格参数、SKU信息时。

```bash
# 通过链接
python3 scripts/query.py "https://detail.1688.com/offer/945957565364.html"

# 通过商品ID
python3 scripts/query.py "945957565364"
```

---

### 4. 询盘比价 (`inquiry-1688` skill)

**功能**：向1688供应商发起询盘对话，20分钟后自动查询结果并推送。

**触发词**：询盘、问供应商、联系商家、咨询、起批量多少、能便宜吗、能定制吗

```bash
# 提交询盘
python3 scripts/inquiry.py submit "<商品链接>" "<询盘问题>"
```

**工作流程**：
1. 提交询盘 → 获取 taskId
2. 告知用户"已发起，20分钟后结果就绪"
3. 20分钟后 cron 查询结果 → 推送到钉钉
4. 用户下次发消息时 agent 检查并回复

---

### 5. 商机洞察 (`market_intelligence.py`)

**功能**：商机热榜、趋势分析、价格分布、行业洞察。

```bash
# 商机热榜
python3 scripts/market_intelligence.py opportunities

# 趋势分析
python3 scripts/market_intelligence.py trend --query "大码女装"

# 价格分布
python3 scripts/market_intelligence.py price-dist --query "露营椅"
```

---

### 6. 市场趋势分析 (`1688-google-trends` skill)

**功能**：监控分析 Google Trends 数据，支持热搜、关键词趋势对比、相关话题和地区热度分析。

**触发场景**：
- 用户询问"Google趋势"、"热搜"、"搜索热度"
- 用户询问"关键词趋势"、"市场热度分析"
- 需要对比多个关键词热度
- 需要分析地区热度分布
- 其他平台数据不足时的**降级补充**

**核心能力**：
| 能力 | 说明 |
|------|------|
| 每日热门搜索 | 获取任意国家/地区的当日热搜 |
| 关键词热度趋势 | 关键词的历史趋势数据 |
| 关键词对比 | 对比多个关键词的热度 |
| 相关主题和查询 | 发现相关搜索 |
| 地区热度分布 | 查看关键词在哪些地区最热门 |

```bash
# 获取美国每日趋势热搜
curl -s "https://trends.google.com/trending/rss?geo=US" | head -100

# 获取全球热搜
curl -s "https://trends.google.com/trending/rss?geo=" | head -100

# 关键词对比（在浏览器打开）
open "https://trends.google.com/trends/explore?q=yoga pants,fitness leggings&geo=US"
```

**常用国家代码**：
| 代码 | 国家 |
|------|------|
| US | 美国 |
| GB | 英国 |
| JP | 日本 |
| DE | 德国 |
| FR | 法国 |
| LT | 立陶宛 |
| (空) | 全球 |

**使用技巧**：
- 使用具体搜索词：用 "iPhone 15 Pro" 而非仅用 "iPhone"
- 关注季节性：某些趋势具有周期性
- 与基准对比：使用一个稳定的搜索词作为参照
- 查看相关查询：发现新机会

**限制**：
- Google Trends 不提供官方 API，频繁使用可能触发速率限制
- 数据为相对值（非绝对数字）

---

### 7. 素材加工 (`alphashop-image` skill)

**功能**：图片翻译、抠图、模特换肤、去水印、裁剪等。

**触发场景**：用户需要处理商品图片用于跨境电商、社交媒体等场景。

| 命令 | 功能 | 关键参数 |
|------|------|----------|
| `translate` | 图片翻译 | `--image-url`, `--source-lang`, `--target-lang` |
| `translate-pro` | 图片翻译PRO | `--image-url`, `--source-lang auto` |
| `enlarge` | 图片高清放大 | `--image-url`, `--factor` |
| `extract-object` | 抠图 | `--image-url`, `--transparent` |
| `remove-elements` | 去水印/文字 | `--image-url` |
| `change-model` | 模特换肤 | `--image-url`, `--model-type` |
| `virtual-try-on` | 虚拟试衣 | `--clothes`, `--model-images` |
| `crop` | 图像裁剪 | `--image-url`, `--target-width`, `--target-height` |

---

### 8. 跨平台选品 (`amazon-product-search` skill)

**功能**：在亚马逊/TikTok平台搜索商品，分析海外市场需求。

**触发场景**：用户想了解海外市场趋势、竞品分析、选品参考。

```bash
# Amazon美国市场搜索
python3 scripts/search.py --keyword "yoga pants" --platform amazon --region US

# TikTok印尼市场搜索
python3 scripts/search.py --keyword "露营椅" --platform tiktok --region ID
```

**筛选参数**：
| 参数 | 说明 |
|------|------|
| `--min-price`, `--max-price` | 价格区间 |
| `--min-sales`, `--max-sales` | 销量区间 |
| `--min-rating`, `--max-rating` | 评分区间 |
| `--listing-time` | 上架时间（90/180/365天） |
| `--count` | 返回数量（默认10） |

---

## 子 Skill 入口

以下能力由独立 Skill 提供，详情请参考各 Skill 的 SKILL.md：

| Skill | 负责能力 | 路径 |
|-------|---------|------|
| `query-1688-product-detail` | 商品详情查询 | `.qoder/skills/query-1688-product-detail/SKILL.md` |
| `inquiry-1688` | 询盘对话 | `.qoder/skills/inquiry-1688/SKILL.md` |
| `alphashop-image` | 图片处理 | `.qoder/skills/alphashop-image/SKILL.md` |
| `amazon-product-search` | 跨平台选品 | `.qoder/skills/amazon-product-search/SKILL.md` |
| `1688-google-trends` | 市场趋势分析 | ClawHub 安装：`https://clawhub.1688.com/skill/skill-f3de4a15056a585b` |
| `stock-info` | 股票/商机数据 | `.qoder/skills/stock-info/SKILL.md` |

---

## 使用示例

### 场景1：Amazon爆款 → 1688货源搜索

```
用户: 帮我找亚马逊卖得好的女装，我要找1688货源
    │
    ├── 1. 用 amazon-product-search 搜索 Amazon US 女装热销榜
    │
    ├── 2. 找到爆款 B0GCJTC58Z WIHOLL Button Front Midi Dress
    │       - 售价: $14.99-$28.49
    │       - 30天销量: 7,581件
    │       - 1688同款参考价: $4.54
    │       - 预估毛利: 80-92% ✅
    │
    ├── 3. 提取 Amazon 商品图片URL
    │
    └── 4. 用图片URL搜索1688货源（遵循"核心原则"）
            - ✅ 图片: ![商品图](https://xxx.jpg)
            - ✅ 链接: [查看1688商品](链接)
            - ✅ 毛利分析: ≥70% 优秀

推荐商品（毛利≥70%优先）：

| 供应商 | 1688价格 | 预估毛利 | 评价 |
|-------|:--------:|:--------:|:----:|
| 广州卿妍 ¥17 | 80-92% | ✅ 优秀 | [查看](链接) |
| 深圳萨莉莎曼 ¥29 | 75-86% | ✅ 良好 | [查看](链接) |
```

### 场景2：1688商品 → 供应商分析 + 询盘

```
用户: 这个商品能定制Logo吗？MOQ多少？
    │
    ├── 1. 展示商品信息（遵循"核心原则"）
    │       - ✅ 图片 + URL
    │       - ✅ 价格 + 利润分析
    │
    └── 2. 用 inquiry-1688 发起询盘
            - Task ID: kj-xxx
            - 告知用户: ✅ 询盘已发送，20分钟后结果就绪
```

### 场景3：选品+图片处理+跨境准备

```
用户: 帮我搜一下亚马逊美国市场的瑜伽裤，找出毛利高的
    │
    ├── 1. 用 amazon-product-search 搜索
    │
    ├── 2. 筛选毛利≥70%的商品优先推荐
    │
    └── 3. 用户确认后，用 alphashop-image 处理图片
            - 图片翻译成英文
            - 抠白底图

推荐商品（毛利≥70%优先）：

![商品图](图片URL)

**商品名称**
售价: $xx | 1688同款: ¥xx
预估毛利: xx% ✅ 优秀

[查看Amazon商品](链接) | [查看1688货源](链接)
```

### 场景4：市场趋势分析

```
用户: 瑜伽裤的市场趋势怎么样？现在入场合适吗？
    │
    ├── 1. 先尝试 1688榜单数据
    │       └── ✅ 有数据 → 展示1688平台热销榜单
    │
    ├── 2. Amazon/TikTok 销量数据
    │       └── ✅ 有数据 → 展示热销趋势
    │
    ├── 3. Google Trends 搜索热度（降级补充）
    │       ├── 获取美国热搜
    │       │   curl -s "https://trends.google.com/trending/rss?geo=US"
    │       │
    │       ├── 关键词趋势对比
    │       │   open "https://trends.google.com/trends/explore?q=yoga pants,fitness leggings&geo=US"
    │       │
    │       └── 分析季节性和热度
    │
    └── 4. 1688站内趋势数据
            └── ✅ 展示1688热卖趋势

Google Trends 趋势分析结果：

📊 关键词对比：yoga pants vs fitness leggings
   - yoga pants: 搜索热度较高，12月达到峰值
   - fitness leggings: 搜索热度稳定，四季皆有需求

🌍 地区热度分布：
   - 美国: ★★★★★ (最高)
   - 英国: ★★★★☆
   - 德国: ★★★☆☆

💡 趋势判断: 瑜伽裤类目搜索热度稳定，略有季节性波动（圣诞季+新年健身需求）
```
💡 建议: 常青品类，全年稳定，12月为旺季
```

### 场景5：多关键词对比选品

```
用户: 对比一下瑜伽裤、健身 leggings、运动短裤哪个更好卖？
    │
    └── 用 Google Trends 批量查询（最多5个关键词）
            python3 scripts/google_trends.py query \
              --keywords "yoga pants" "fitness leggings" "workout shorts" \
              --region US

对比结果：

| 关键词 | 当前热度 | 趋势 | 峰值月份 | 建议 |
|-------|:-------:|:----:|:-------:|------|
| yoga pants | 78 | 📈 上升 | 12月 | ✅ 主推 |
| fitness leggings | 65 | ➡️ 平稳 | 1月 | ✅ 可做 |
| workout shorts | 52 | 📉 下降 | 7月 | ⚠️ 谨慎 |
```

---

## 异常处理

| 错误类型 | 关键词 | 处理方式 |
|---------|-------|----------|
| API未配置 | "ALPHASHOP_ACCESS_KEY not set" | 提示用户配置密钥 |
| 接口欠费 | "欠费""余额不足""积分" | 引导购买积分 |
| 无结果 | "No offers match" | 告知用户并建议放宽条件 |
| 询盘超时 | 20分钟后未收到回复 | 可提前 query 查看 |

---

## API 参考文档

完整的 API 接口和数据结构文档请参阅：
- [references/api.md](references/api.md) - AlphaShop API 文档
- 各子 Skill 的 SKILL.md

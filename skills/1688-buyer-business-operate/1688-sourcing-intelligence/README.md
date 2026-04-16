# 1688-buyer-ops

🛒 1688买家经营决策专家 —— 面向1688采购商/批发买家的综合经营分析平台。

## 能做什么

| 能力 | 说明 |
|------|------|
| **选品搜索** | 按关键词/链接/图片搜索1688商品和供应商 |
| **供应商分析** | 评估供应商资质、服务能力、标签 |
| **商品详情** | 获取商品完整信息（标题/价格/SKU/属性） |
| **询盘比价** | 向供应商发起询盘，20分钟后获取回复 |
| **商机洞察** | 商机热榜、趋势分析、价格分布 |
| **素材加工** | 图片翻译、抠图、模特换肤、去水印 |
| **跨平台选品** | 亚马逊/TikTok平台商品搜索分析 |

## 安装

在 Claw 对话框里直接输入：
```
请帮我安装这个 skill：https://github.com/your-org/1688-buyer-ops.git
```

## 使用前准备

1. 获取 AlphaShop API 凭证
   - 访问 [AlphaShop](https://www.alphashop.cn/seller-center/apikey-management) 注册并获取 Access Key 和 Secret Key
2. 告诉 AI 你的 API 密钥，或在 OpenClaw config 中配置

## 快速上手

直接用自然语言和 AI 对话：

```
帮我找100元以内的露营椅，要起批量小的
这家供应商怎么样？
帮我问一下这个商品能不能定制logo
帮我把商品图翻译成英文
帮我搜一下亚马逊美国市场的瑜伽裤趋势
最近有什么商机热榜
```

## CLI 使用

### 选品搜索

```bash
# 关键词搜索
python3 scripts/search.py "蓝牙耳机"

# 1688商品链接搜索
python3 scripts/search.py "https://detail.1688.com/offer/945957565364.html"

# 图片搜索
python3 scripts/search.py "https://example.com/product.jpg"

# 带筛选条件
python3 scripts/search.py "蓝牙耳机" --max-price 50 --max-moq 100
```

### 供应商分析

```bash
python3 scripts/supplier_search.py "深圳蓝牙耳机工厂"
```

### 商机洞察

```bash
# 商机热榜
python3 scripts/market_intelligence.py opportunities

# 趋势分析
python3 scripts/market_intelligence.py trend --query "蓝牙耳机"

# 价格分布
python3 scripts/market_intelligence.py price-dist --query "露营椅"
```

### 子 Skill 入口

| Skill | 负责能力 | 触发词 |
|-------|---------|--------|
| `inquiry-1688` | 询盘对话 | 询盘、问供应商、联系商家 |
| `alphashop-image` | 图片处理 | 翻译图片、抠图、模特换肤 |
| `amazon-product-search` | 跨平台选品 | 亚马逊选品、TikTok搜索 |
| `query-1688-product-detail` | 商品详情 | 查看详情、规格参数 |

详细用法见各 Skill 的 SKILL.md。

## 典型使用场景

### 场景1：选品+供应商分析

```
用户：帮我找适合亚马逊卖的蓝牙耳机，100元以内
AI：搜索到15个商品...
    推荐：A款性价比最高，48H发货率95%...

用户：这家的供应商资质怎么样？
AI：分析供应商信息...
    结论：✅ 诚信通5年 ✅ 源头工厂 ✅ 回头率85%
          ⚠️ 起批量较高（100件起）
```

### 场景2：询盘比价

```
用户：帮我向这个供应商询盘，问一下MOQ和交期
AI：提交询盘请求...
    ✅ 询盘已发送，20分钟后给你结果

用户：（20分钟后）
AI：供应商回复：
    - MOQ: 50件起
    - 交期：7-15天
    - 大货价格：比样品低15%
```

### 场景3：素材准备

```
用户：帮我把1688商品图翻译成英文，再抠个白底
AI：处理中...
    ✅ 图片翻译完成
    ✅ 白底图生成完成
    📎 已准备好可用于亚马逊上架的图片
```

## 与 1688-shopkeeper 的区别

| 维度 | 1688-buyer-ops (本项目) | 1688-shopkeeper |
|-----|------------------------|------------------|
| 核心用户 | 1688采购商/批发买家 | 想铺货到抖店/拼多多的卖家 |
| 关键能力 | 选品→分析→询盘→素材 | 选品→铺货→店铺管理 |
| 铺货功能 | ❌ 不需要 | ✅ 必须有 |
| 目标账号 | 1688采购账号 | 抖店/拼多多/小红书/淘宝账号 |

## 常见问题

Q: 如何获取API密钥？
A: 访问 [AlphaShop API管理](https://www.alphashop.cn/seller-center/apikey-management) 注册并申请。

Q: 收费吗？
A: 使用AlphaShop API可能产生费用，具体以平台规则为准。

Q: 接口欠费了怎么办？
A: 前往 https://www.alphashop.cn/seller-center/home/api-list 购买积分。

## 反馈与支持

如有问题，请在 GitHub 提交 Issue。

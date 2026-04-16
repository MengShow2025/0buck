# 跨境电商内容合规审查 Skill

**版本：** 2.0.0  
**分类：** 跨境电商 / 合规审查 / 内容风险管理  

---

## 概述

本 Skill 为跨境电商卖家提供 AI 驱动的内容合规审查能力，覆盖产品标题、五点描述、产品描述、图片文案、后台关键词等各类内容，从**知识产权、广告法规、平台政策、跨境法规**四个维度进行系统性风险扫描，输出结构化审查报告并自动生成合规重写版本。

---

## 核心能力

| 能力 | 说明 |
|------|------|
| 商标/IP 侵权检测 | 识别直接使用、仿冒暗示、版权抄袭等风险 |
| 广告法合规检测 | 覆盖中国广告法、FTC、欧盟 UCPD、德国 UWG 等 |
| 平台政策合规检测 | Amazon / eBay / Shopee / Lazada / Shopify / Temu / Walmart |
| 跨境认证声称检测 | CE/FCC/PSE/KC/UL/FDA 等认证真实性核查 |
| 健康/医疗声称检测 | 识别膳食补充剂、医疗器械的非法功效声称 |
| 合规重写生成 | 自动输出去除违规内容的修改版本 |
| 上架前检查清单 | 结构化的发布前自查工具 |

---

## 支持的平台与市场

**平台：**
- Amazon（US / UK / DE / JP / CA / AU）
- eBay
- Shopee（东南亚各站）
- Lazada
- Shopify 独立站
- Temu
- Walmart Marketplace

**市场（法规体系）：**
- 美国（FTC / FDA / CPSC / FCC）
- 欧盟（CE / GDPR / UCPD / RoHS / WEEE）
- 英国（ASA / UKCA）
- 德国（UWG）
- 日本（PSE / Giteki / 景品表示法）
- 韩国（KC）
- 东南亚各国
- 中国（广告法 / 电商法）

---

## 文件结构

```
ecommerce-content-compliance-review/
│
├── skill.yaml                          # Skill 配置文件（名称、版本、入口、标签）
├── skill.md                            # 核心逻辑（工作流、检测规则、输出规范）
├── README.md                           # 本文件
├── LICENSE                             # 许可证
│
├── references/                         # 参考知识库（按需加载）
│   ├── ip-trademark.md                 # 知识产权与商标侵权规则
│   ├── platform-policies.md            # 各平台内容政策详规
│   ├── advertising-law.md              # 各市场广告法规（FTC/中国广告法/EU/德国/英国）
│   ├── cross-border-regulations.md     # 跨境合规：产品认证/进出口/危险品/标签
│   └── sensitive-words.md              # 敏感词与高风险词汇库
│
├── assets/                             # 输出模板与工具
│   ├── report-template.md              # 标准审查报告模板
│   └── risk-checklist.md               # 上架前合规自查清单
│
└── examples/                           # 完整审查示例
    └── sample-review.md                # 3个完整输入/输出示例（含违规/通过）
```

---

## 触发场景

以下描述/问题均会触发本 Skill：

```
「帮我检查这个 listing 有没有合规问题」
「这个标题会不会被 Amazon 下架？」
「检查一下有没有侵权风险」
「这个描述有没有违规？」
「审查一下广告文案」
「帮我做内容合规」
「这样写会不会违反平台政策？」
「有没有用到禁用词？」
「这个保健品描述合规吗？」
```

---

## 输出示例

### 输入
```
Amazon 美国站标题：
Apple Style ANC Wireless Headphones - Best Noise Cancelling Ever! 
Save 30% Today Only! Contact: support@example.com
```

### 输出（摘要）
```
🔴 整体评级：严重

发现 5 项违规：
• [HIGH] 商标侵权：使用「Apple Style」引用他人注册商标
• [HIGH] 平台禁用：标题含促销词「Save 30%」
• [HIGH] 平台禁用：标题含联系方式 support@example.com
• [MEDIUM] 广告违规：「Best... Ever」无依据最高级声称
• [LOW] 平台规范：感叹号「!」在 Amazon 标题中禁用

✏️ 合规重写：
TechPro ANC Wireless Headphones, Bluetooth 5.3 Over-Ear Noise 
Cancelling Headset, 40H Battery, Foldable Design for Travel Work
```

---

## 风险等级说明

| 等级 | 含义 | 建议操作 |
|------|------|---------|
| 🔴 严重（HIGH） | 直接违规，面临下架/封号/法律诉讼 | 发布前**必须**修改 |
| 🟡 中等（MEDIUM） | 违反平台政策，存在被处罚风险 | 强烈建议修改 |
| 🟢 低风险（LOW） | 潜在风险，影响排名/效果 | 建议优化 |
| 🔵 提示（INFO） | 最佳实践建议 | 可选改进 |

---

## 局限性与免责说明

1. **不构成法律建议**：本 Skill 提供合规风险提示，不替代专业法律咨询。
2. **规则动态变化**：各平台政策持续更新，本 Skill 参考文件的截止日期为 2025 年，请定期核实最新平台政策。
3. **地区差异**：同一内容在不同市场的合规性可能不同，跨市场销售建议分别审查。
4. **AI 局限**：本 Skill 基于规则库进行模式匹配，可能存在漏报或误报，高风险情况请人工复核。

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 2.0.0 | 2025-03 | 完整重写：增加 references/ 知识库、examples/、完整输出模板 |
| 1.0.0 | 2024 | 初始版本（基础骨架）|

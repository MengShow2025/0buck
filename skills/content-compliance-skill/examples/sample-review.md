# 合规审查示例集

本文件包含 3 个完整审查示例，用于测试 skill 效果及作为输出参考。

---

## 示例 1：电子产品标题（多项严重违规）

### 用户输入

**平台：** Amazon 美国  
**内容：** 产品标题

```
Apple Style ANC Wireless Headphones - Best Noise Cancelling Headset Ever! 
100% Guaranteed Sound Quality, Buy Now & Save 30%! Contact: support@xxxx.com
```

---

### 期望输出

## 📋 合规审查报告

**审查平台：** Amazon 美国  
**目标市场：** 美国  
**内容类型：** 产品标题  
**产品品类：** 电子 > 耳机  

---

### ⚡ 整体风险等级

> 🔴 **严重**

发现 5 项违规（3 项严重、1 项中等、1 项低风险），**不得以现有内容发布**，建议参照合规重写版本修改后再发布。

---

### 📊 风险摘要

| 风险等级 | 数量 | 主要问题 |
|---------|------|---------|
| 🔴 严重（HIGH） | 3 项 | 商标侵权、平台禁用词、联系方式 |
| 🟡 中等（MEDIUM） | 1 项 | 无依据质量保证 |
| 🟢 低风险（LOW） | 1 项 | 特殊符号 |

---

### 🔍 逐条问题详情

#### 问题 1｜🔴 严重｜商标侵权（知识产权）

**原文定位：**
> "**Apple Style** ANC Wireless Headphones"

**违规依据：**
「Apple」为苹果公司全球注册商标。使用「Apple Style」暗示产品与苹果公司存在关联或相似性，构成商标性使用，可能引发侵权投诉。Amazon 品牌注册用户（Apple）可通过 Project Zero 直接发起 Takedown，无需平台审核。

**风险说明：**
苹果公司具有高度积极的品牌保护策略，此类 listing 平均 24-48 小时内即被下架，账号收到侵权警告，积累 3 次可能导致账号暂停。

**修改建议：**
- 方案 A：删除「Apple Style」，改为具体产品特性描述，如「Premium Foldable ANC Wireless Headphones」
- 方案 B：如确需声称兼容苹果设备，改为「Compatible with iPhone/iPad（Not manufactured by Apple）」

---

#### 问题 2｜🔴 严重｜平台禁用词（促销词汇）

**原文定位：**
> "Buy Now & **Save 30%**!"

**违规依据：**
Amazon 标题规范明确禁止在标题中出现任何价格或促销信息，包括折扣百分比。参见 Amazon 卖家帮助：「Product title requirements」。

**风险说明：**
触发 Amazon 自动合规审查，listing 可能被拒绝发布或被临时下架，需修改后重新提交。

**修改建议：**
- 删除「Buy Now & Save 30%!」，促销信息通过 Coupon / Lightning Deal 途径展示，不在标题呈现。

---

#### 问题 3｜🔴 严重｜联系方式（平台禁用）

**原文定位：**
> "Contact: **support@xxxx.com**"

**违规依据：**
Amazon 严格禁止在 listing 任何字段中包含卖家联系方式（邮箱、电话、网址等），目的是防止卖家绕过平台直接与买家交易。

**风险说明：**
触发此规则的 listing 会被立即拒绝上架；已上架的 listing 包含联系方式会导致账号收到违规警告。

**修改建议：**
- 删除所有联系信息，通过 Amazon Buyer-Seller Messaging 与买家沟通。

---

#### 问题 4｜🟡 中等｜无依据保证声称（广告违规）

**原文定位：**
> "**100% Guaranteed** Sound Quality"

**违规依据：**
FTC 广告真实性原则要求所有声称需有证据支撑。「100% Guaranteed」为绝对保证承诺，在没有退款/换货政策支撑时构成虚假广告。Amazon 标题规范同时禁止使用「Guaranteed」等主观词汇。

**修改建议：**
- 方案 A：改为具体参数声称，如「Hi-Fi 40mm Driver」「aptX HD Audio」
- 方案 B：如确有售后保障，通过产品描述说明「30-day money-back guarantee」

---

#### 问题 5｜🟢 低风险｜特殊符号（平台规范）

**原文定位：**
> "... Headset **Ever!**" / "**Buy Now!**"

**违规依据：**
Amazon 标题规范禁止使用感叹号「!」，违规不会直接下架，但影响 listing 搜索展示权重。

**修改建议：**
- 删除所有感叹号，改为句号或直接省略标点。

---

### ✏️ 合规重写版本

**【标题】**
```
TechPro ANC Wireless Headphones, Bluetooth 5.3 Over-Ear Noise Cancelling Headset, 
40-Hour Battery, Foldable Design Compatible with iPhone, Android, PC
```

---

### 📌 后续行动建议

**🔴 立即处理：**
1. 删除「Apple Style」，替换为具体产品特性描述
2. 删除「Save 30%」等促销词
3. 删除邮箱联系方式

**🟡 近期优化：**
4. 修改「100% Guaranteed」为具体技术规格

**🟢 长期建议：**
- 注册自有品牌并申请 Amazon Brand Registry，以保护品牌资产
- 建立 listing 发布前的标准合规审查流程

---

## 示例 2：保健品描述（健康声称违规）

### 用户输入

**平台：** Amazon 美国  
**内容：** 五点描述

```
• BOOSTS IMMUNE SYSTEM - Our vitamin C supplement treats common colds and cures flu symptoms. Clinically proven to fight all viruses.
• WEIGHT LOSS GUARANTEED - Scientifically proven to burn fat 3x faster than diet alone. Results guaranteed in 30 days.
• FDA APPROVED FORMULA - This product has been approved by the FDA for daily use.
• DOCTOR RECOMMENDED - 9 out of 10 doctors recommend our formula for daily wellness.
• 100% NATURAL & ORGANIC - All ingredients are certified organic with zero side effects guaranteed.
```

---

### 期望输出（摘要）

🔴 **整体评级：严重**  
发现 6 项严重违规，全部涉及虚假医疗/健康声称及虚假认证声称。**此描述如发布将面临 FDA 执法行动和 Amazon 强制下架。**

**问题清单：**
| # | 等级 | 问题 |
|---|------|------|
| 1 | 🔴 | 「treats / cures」疾病声称——膳食补充剂不得有疾病治疗声称（FDA DSHEA） |
| 2 | 🔴 | 「Clinically proven」——无临床研究来源，虚假科学声称（FTC） |
| 3 | 🔴 | 「WEIGHT LOSS GUARANTEED」——无法证实的绝对减重保证（FTC） |
| 4 | 🔴 | 「FDA APPROVED」——FDA 不批准膳食补充剂，虚假认证声称 |
| 5 | 🔴 | 「9 out of 10 doctors」——未披露调研来源，虚假背书（FTC） |
| 6 | 🟡 | 「zero side effects guaranteed」——不合实际的绝对保证 |

**合规重写方向：**
- 疾病词替换为结构功能声称（「有助于支持免疫系统健康」）
- 删除所有「FDA Approved」声称，改为「FDA Registered Facility」（如属实）
- 删除「Clinically proven」，改为「Formulated with clinically-studied ingredients」（有研究支撑时）
- 添加 FDA 免责声明：「These statements have not been evaluated by the FDA...」

---

## 示例 3：合规 listing（通过审查）

### 用户输入

**平台：** Amazon 美国  
**内容：** 完整 listing

```
Title: ANKER Soundcore Q45 Wireless Headphones, Adaptive Active Noise Cancelling, 
LDAC Hi-Res Audio, 50H Playtime, Bluetooth 5.3, Foldable Over-Ear Headset for Travel

Bullet Points:
• ADAPTIVE ANC - Automatically adjusts noise cancellation levels based on your environment, 
  reducing up to 98% of ambient noise for commutes, flights, and work.
• LDAC HI-RES AUDIO - Certified for Hi-Res Audio Wireless, LDAC transmits up to 3x more data 
  than standard Bluetooth for studio-quality sound.
• 50-HOUR PLAYTIME - Enjoy up to 50 hours of music with ANC on, or 65 hours without. 
  5-minute quick charge gives 5 hours of playtime.
• MULTI-POINT CONNECTION - Seamlessly switch between 2 devices simultaneously. 
  Compatible with iOS, Android, and PC.
• FOLDABLE & LIGHTWEIGHT - Ultra-foldable design with carrying pouch included for easy travel storage.
```

---

### 期望输出

## 📋 合规审查报告

**整体风险等级：** ✅ **合规通过**

未发现违规问题，内容可安全发布。

### 🔵 提示（INFO，非违规）

#### 提示 1｜🔵 提示｜最佳实践建议

**原文：**
> "reducing up to **98%** of ambient noise"

**说明：** 具体噪音消除百分比声称（98%）为可接受的量化表达，但建议在产品技术文档中保留该数据的测试依据，以备品牌投诉或平台询问时提供。不构成违规，仅作提示。

#### 提示 2｜🔵 提示｜最佳实践建议

**说明：** 建议在 Search Terms 中补充长尾关键词（如「over ear headphones for studying」「noise cancelling headphones for office」），可提升搜索曝光。不涉及合规问题。

---

### 📌 后续行动建议

**🟢 长期建议：**
- 此 listing 合规质量较高，建议作为团队模板参考
- 继续保持「具体技术参数 + 使用场景」的描述风格，避免主观形容词堆砌

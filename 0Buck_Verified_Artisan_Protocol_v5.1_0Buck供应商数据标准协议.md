## 0. 0Buck 选品标准作业程序 (Selection SOP v2.0 - Data-Driven Pulse)
0Buck 的选品逻辑从“商品驱动”全面转向“数据脉冲驱动”，旨在捕捉全球最真实、最急迫的用户痛点与消费热点。

### 八步选品法 (The 8-Step Method)
1. **多维度需求感应 (Multi-Channel Pulse Sensing)**:
   - **搜索趋势 (Search Trends)**: 监测 Google Keywords / Google Trends 的关键词搜索量激增及季节性变化。
   - **广告投放 (Ad Intelligence)**: 分析 Google Ads、Facebook Ads、TikTok Ads 的投放广度、视频播放量及预估转化率（通过高频出现的爆款广告判定痛点）。
   - **竞端增长 (Growth Platforms)**: 分析 Temu、Shein、TikTok Shop、Amazon Best Sellers 中快速增长（MoM > 30%）的黑马类目与热销单品。
2. **痛点与方案定义 (Pain Point & Solution)**: 根据感应到的热点，定义能解决具体问题的“产品方案”（例如：针对电费激增，寻找“分时段智能能耗管理插座”）。
3. **1688 深度溯源 (1688 Deep Sourcing)**: 在 1688 寻找质量、起订量及利润空间（Margin）符合 0Buck 高标准的同款。
4. **全球市场审计 (Global Market Audit)**: 对比 Amazon/eBay 同类商品（优选同供应商）的零售价。
5. **返现规则预判 (Profit Pre-audit)**: 预估利润空间，初步划分返现规则。
6. **商家全量入库 (Merchant Onboarding)**: 锁定供应商及其全店产品线。
7. **目录利润精算 (Catalog Analysis)**: 逐一审计该店商品的利润率，执行分流：
   - **Discard**: < 1.5x (毛利过低，舍弃)。
   - **TRAFFIC**: 1.5x - 4.0x (普通商品)。
   - **PROFIT**: >= 4.0x (返现商品，标记 **"100% BACK"**)。
8. **优化、去敏与上线 (Polish & Launch)**: 执行 v3.5 脱敏、润色、多币种转换，正式发布。

## 1. 核心愿景 (Core Vision)
构建“供应无感化”的 AI 驱动跨境电商平台。通过对上游 1688 供应链的深度脱敏、品牌重塑与 100% 返现激励，为全球用户提供极致性价比的智能生活体验。

## 2. 智理入库规范 (The Brain Protocol)

-  2.1 **影子数据库 (0Buck DB)**:
  - **链接同步**: 建立 `shopify_product_id` 与 0Buck `Candidate_ID` 的 1:1 映射。
  - **情报集成**: 将 0Buck 的 Amazon/eBay 比价数据作为后续定价的硬性输入源。
- **点睛操作**: 利用 `DesireEngine` 实现“高转化内容覆盖”，变工厂信息为品牌故事。

   2.2 业务闭环与物流追踪 (Full-Loop Logistics)

- **采购下单**: 利用铺货工具（DSers/妙手）的一键下单功能，自动化向供应商采购。
- **单号回传**: 供应商单号 -> 铺货工具 -> Shopify -> 0Buck 数据库 -> 用户 App 端展示。
- **物流雷达**: 0Buck 实时跟踪物流轨迹，触发用户状态变更。


## 3. 汇率与多币种基础设施 (Currency Infrastructure)
0Buck 系统采用三阶段汇率转换逻辑，并强制执行 **+0.5% 汇率风险对冲方案 (Exchange Risk Buffer)**，以确保全球供应链成本与用户支付的精准对接：
1. **第一阶段：采集入库 (Scraping - CNY to USD)**
   - 抓取 1688 商品时，将人民币（CNY）成本价实时转换为美元（USD）存入 0Buck 私有服务器。
   - **风险对冲**: 在实时汇率基础上增加 **0.5% 的安全垫**（即 $USD\_Cost = (CNY\_Price / Rate) \times 1.005$）。
2. **第二阶段：前端展示 (Display - USD to Local)**
   - 根据用户所在地区的地理位置或首选币种，将服务器存储的美元价格动态转换为本地货币展示。
3. **第三阶段：支付结算 (Settlement - Local to USD)**
   - 用户使用本地货币完成支付，系统需确保结算金额能够精准转换回对应的美元支付金额。

## 4. 定价与分流策略 (Market-Driven Pricing & Logic)
0Buck 的销售价格并非由成本简单加成决定，而是由全球市场（Amazon/eBay/AliExpress）的零售价驱动。

### A. 定价逻辑流
1. **市场对标**: 查找 Amazon/eBay/AliExpress 零售价 ($Market\_Price$)。
2. **设定销售价**: $Sale\_Price = Market\_Price \times 0.6$。
3. **计算成本倍率**: $Ratio = Sale\_Price / Cost_{USD}$。

### B. 商品分流标准
- **Discard**: $Ratio < 1.5$ (直接舍弃)。
- **TRAFFIC (普通商品)**: $1.5 \le Ratio < 4.0$。
- **PROFIT (返现商品)**: $Ratio \ge 4.0$。
    - **标签策略**: 统一使用 **"20-Phase Check-in Rebate"** (20 期签到返现) 或 **"Signature 100% Back"**。严禁使用廉价煽动性词汇。

## 5. “心理狙击”文案润色法 (The Sniper Methodology v2.0)
文案不再是功能堆砌，而是基于 SOP v2.0 捕获的痛点数据执行的心理转化架构：

### 九点润色框架 (The 9-Point Framework)
1. **痛点钩子 (Pain Hook)**: 利用搜索热词唤起用户对当前痛点的强烈共鸣。
2. **方案桥梁 (Solution Bridge)**: 将技术转化为解决痛点的“超能力”，满足用户期望。
3. **魔法时刻 (Aha! Moment)**: 描述用户使用后最惊艳的瞬间及带来的正心向情绪改变。
4. **热点对齐 (Trend Alignment)**: 结合最新热门话题、观点或 TikTok/Google 爆款事件。
5. **仪式感激励 (Sophisticated Incentive)**: 以“20 期契约任务”形式引出返现，避免廉价感。
6. **未来期待 (Future-Proofing)**: 强调技术前瞻性与长期价值，确保“不过时”。
7. **身份认同 (Identity & Community)**: 强调“智能先锋”圈层归属感，对齐精英价值观。
8. **匠心背书 (Artisan Backing)**: 宣导 **0Buck Verified Artisan** 严苛的选品价值观与品质。
9. **透明价值 (Final Call)**: 逻辑闭环，引导用户参与 20 期计划，致敬品质生活。

## 6. 先锋众筹与定制化执行流 (Vanguard Crowdfunding & Customization Workflow)
针对冷门、特定人群及特定地区的商业机会，执行“由人及物”的深度定制闭环：

1. **人群与机会感应 (Niche Discovery)**: 通过全局搜索（Reddit/Discord/SNS）发现特定人群、特定地区、特定痛点的商品机会。
2. **蓝海深度分析 (Gap Analysis)**: 搜索分析竞品、替代品、常规品，发现蓝海（Blue Ocean）或现有产品不易满足的特定需求。
3. **方案设计 (Solution Design)**: 设计符合该特定需求的商品形态与整体解决方案。
4. **供应初审与利润精算 (Sourcing & Margin Audit)**: 
   - 寻找潜在供应商，必须获取**大概拿货成本**，作为制定预售/众筹方案的基础。
   - **财务门槛**: 众筹/定制商品的利润倍率（$Market\_Price / Cost_{USD}$）必须达到 **10x 或以上**。
   - **一票否决 (Discard)**: 若初选阶段测算利润倍率达不到 10x，直接放弃该次众筹计划。
5. **机制建模 (Workflow Modeling)**: 制定详细的 `预售/众筹 -> 采购/定制 -> 发货跟踪` 闭环执行机制。
6. **活动发布 (Launch & Collection)**: 发起预售/众筹活动，利用“九点心理狙击”文案收集需求与真实订单。
7. **闭环交付 (Execution & Delivery)**: 众筹成功后启动采购/定制，并按预设流程完成全球交付。

---
*版本: v5.0 (智理中控版) | 状态: 生产基准 (Master Benchmark)*

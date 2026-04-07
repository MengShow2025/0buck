# 0Buck 终极技术手册 v3.4 (VCC Edition)

## 1. 核心愿景：Vortex Chat Container (VCC)
0Buck v3.4 彻底实现了“对话即系统” (Conversational OS) 的设计理念。所有功能模块（商城、订单、资产、社交）均作为聊天流中的交互式卡片 (BAP Cards) 存在。

### 核心特性：
- **脑嘴分离架构 (Brain-Mouth Split)**: 后端 (Brain) 处理逻辑与意图提取，前端 (Mouth/VCC) 仅负责渲染流式对话与功能卡片。
- **BAP 业务卡片协议 (Business Attachment Protocol)**: 标准化 JSON Schema 定义功能组件，支持实时交互。
- **意图锚点 (Intent Anchors)**: 利用 Stream Webhooks 捕捉用户意图，自动触发业务流程。

## 2. 核心逻辑架构

### A. 双轨存储模型 (Dual-Track Storage)
- **心智层 (0Buck DB)**: 存储结构化事实、用户画像、订单状态。
- **日志层 (GetStream Cloud)**: 存储原始聊天记录、媒体文件与上下文。

### B. 20期全额返现 (The Golden Pack)
- **Phase 1-2**: 固定阶段，快速建立信任。
- **Phase 3-20**: 随机组合阶段，包含 8% & 10% 的“爆点单元”。
- **补偿机制**: 积分兑换“续签卡”可补救断签，但单期仅限一次。

## 3. 供应端选品逻辑 (IDS v3.1)
- **4.0x 利润红线**: 售价必须满足 `售价 >= 成本 * 4.0` 以覆盖 100% 返现成本与分销。
- **多规格同步**: 穿透同步 1688 的变体 (Color/Size/Spec) 至 Shopify。
- **AI 详情注入**: 自动生成美式英语 SEO 优化的 HTML 详情页。

## 4. 安全与隔离
- **物理隔离**: 所有查询强制绑定 `user_id`。
- **私有投影 (Private Projection)**: 群聊中涉及个人的敏感卡片（如返现进度）仅对该用户可见。
- **BYOK (Bring Your Own Key)**: 支持用户配置自定义 Gemini/MiniMax API Key。

## 9. 0Buck IM 智理网关 (v5.5 - The Sensory Extension)

0Buck AI 大脑通过统一 IM 网关 (Unified IM Gateway) 延伸至第三方通讯平台，实现“对话即商业”的闭环。

### 9.1 架构设计
- **多端适配器 (Adapters)**: 针对飞书、WhatsApp、Telegram 提供标准化 Webhook 接入。
- **身份隧道 (Identity Bridge)**: 通过 `UserIMBinding` 建立 `platform_uid` 与 `customer_id` 的 1:1 映射。
- **大脑代理 (IMBrainProxy)**: 将 IM 上下文（消息 ID、媒体类型）透明转发给 LangGraph Agent 核心。

### 9.2 核心能力
- **个性化共生**: 共享 L1/L2/L3 Persona OS 架构，记忆跨端同步。
- **主动式脉冲**: 基于全网热点感应，主动向高好感度 (`Affinity > 80`) 用户推送痛点对齐商品。
- **无感化工具**: 在 IM 聊天中直接调用物流雷达、签到返现、C2M 许愿池等后端 Skills。

---
*Last Updated: 2026-04-05*

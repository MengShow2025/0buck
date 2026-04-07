# 0Buck (v5.3) 供应链履约决策与记录文档 (Decision Matrix)

## 1. 核心定价准则 (Pricing Protocol)
*   **划线价 (Compare at)** = Amazon 原始 List Price (无则取成交价)。
*   **0Buck 售价 (Sale Price)** = Amazon 当前成交价 * 0.6。
*   **安全红线**: ROI (售价/落地成本) >= 1.5x。低于此值自动 PASS。

## 2. 履约路径决策树 (Routing Logic)

### 方案 A: CJ Safe-Path (当前默认首选)
*   **触发条件**: 商品在 CJ 库中存在同款，且标记为 `CJ's Choice` 或库存 > 100。
*   **优势**: API 完美通、物流确定性高、全托管、无调包风险。
*   **缺点**: 非 1688 1:1 镜像，SKU 可能存在微小视觉差异。
*   **记录**: [cj_audit_logs.json](./logs/cj_audit_logs.json)

### 方案 B: BuckyDrop Mirror (高保装备选)
*   **触发条件**: CJ 找不到同款，或用户对 1:1 镜像有极致要求（如特定工厂私模）。
*   **优势**: 1:1 像素级同步 1688 素材、工厂直发。
*   **缺点**: API 签名算法复杂（当前 70000016 调试中），物流费用计算较 CJ 略复杂。
*   **记录**: [buckydrop_test_logs.json](./logs/buckydrop_test_logs.json)

### 方案 C: Mabang + YunExpress (货代直连模式)
*   **触发条件**: 单品起量（> 50单/日），或该品类适合通过私人货代（Forwarder）集货降低成本。
*   **优势**: 直连 1688 厂家底价，利用云途专线优化成本，利润最大化（ROI 可达 2.5x+）。
*   **物流引擎 - 云途 (YunExpress)**:
    *   **API Key**: `1f369c903ef54496a37087f54750b704`
    *   **APPID**: `dfc1ca258327`
    *   **客户代码**: `CN0C426905`
    *   **开发指南**: [云途 API 文档](https://open.yunexpress.cn/openApi/doc?type=article&mid=1651108581694787586&pid=1651109970932158466&id=1651110265481351169)
*   **记录**: [mabang_api_status.json](./logs/mabang_api_status.json)

## 3. 选品审计记录表 (Audit Record)

| 日期 | 品类 | 商品 ID | 采购渠道 | ROI | 状态 | 判定理由 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-04-07 | 精华液 | CAND-001 | CJ Choice | 1.88x | 已上架 | CJ 现货，物流稳，ROI 合格 |
| 2026-04-07 | LED 面罩 | CAND-003 | CJ Choice | 2.40x | 已上架 | 高客单价，CJ 优势明显 |
| 2026-04-07 | 宠物智能 | CAND-006 | CJ Choice | 1.63x | 已上架 | CJ 视频款，ROI 1.5+ |
| 2026-04-07 | 智能穿戴 | CAND-004 | CJ Choice | 1.91x | 已上架 | S12 Ultra+ 同款，利润稳 |
| 2026-04-07 | 智能家电 | CAND-X | 1688 | N/A | **PASS** | CJ 找不到同款，根据“不敢赌”原则剔除 |

---
*本文档由 0Buck Brain-Hub 自动维护，记录每一笔决策的财务与供应链逻辑。*

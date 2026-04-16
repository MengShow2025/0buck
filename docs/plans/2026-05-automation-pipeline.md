# 0Buck 自动化流水线优化计划
# 选品 → 优化润色 → 上架 → 跟踪

> **执行说明：** 使用 subagent-driven-development skill 逐 Phase 推进。每个 Task 独立可测试。

**目标：** 构建一条从「发现商品」到「持续监控盈利」的全自动化流水线，目标 **500 SKU/天上架，98% 无人工干预**。

**当前状态（已有）：**
- `CJDropshippingService` — CJ 商品搜索 + 物流计算
- `BuckyDropService` — 1688/淘宝爬取采购
- `AutoAuditRobot` — 定价法则 + ROI 计算
- `BatchUploader` — Shopify 批量上架
- `MeltingService` — 价格/库存熔断监控
- AlphaShop skills — 榜单/关键词查询
- `CandidateProduct` 状态机：new→reviewing→approved→synced

**核心问题（需修复）：**
1. 选品：各数据源孤立，无统一编排器
2. 润色：标题/描述全靠人工，无 LLM copywriting
3. 上架：approved 状态仍需人工触发批量上传
4. 跟踪：Melting Radar 未接入 cron + 无告警推送

---

## 架构总览

```
[AlphaShop榜单] ──┐
[CJ搜索]        ──┼──→ [统一候选池 candidate_products]
[BuckyDrop]    ──┘      ↓
                    [AutoAuditRobot: ROI过滤]
                         ↓ approved (ROI≥2.0)
                    [LLM润色引擎]
                         ↓
                    [BatchUploader: 上架Shopify]
                         ↓
                    [MeltingRadar: 持续监控]
                         ↓ 告警
                    [飞书/WhatsApp通知]
```

---

## Phase 1：统一选品编排器 (Unified Sourcing Orchestrator)

> 目标：将 AlphaShop/CJ/BuckyDrop 三路数据源汇聚成一条标准化 pipeline，每日自动跑批。

### Task 1.1：创建 `UnifiedSourcingPipeline` 类

**目标：** 单入口编排三路数据源，输出标准化 `CandidateProduct` 列表

**文件：**
- 创建：`backend/app/services/unified_sourcing.py`

**实现代码：**

```python
# backend/app/services/unified_sourcing.py
import asyncio
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.cj_service import CJDropshippingService
from app.services.buckydrop_service import BuckyDropService
from app.services.auto_audit import AutoAuditRobot
from app.models.product import CandidateProduct

logger = logging.getLogger(__name__)

class UnifiedSourcingPipeline:
    """
    统一选品编排器 - 三路数据源 → 标准候选池
    目标: 500 SKU/天，ROI ≥ 2.0 自动入池
    """
    MIN_ROI = 2.0
    MAX_SHIPPING_RATIO = 0.40

    def __init__(self, db: Session):
        self.db = db
        self.cj = CJDropshippingService()
        self.bucky = BuckyDropService()
        self.auditor = AutoAuditRobot(db)

    async def run_daily_batch(
        self,
        keywords: List[str],
        alphashop_data: Optional[List[Dict]] = None,
        batch_size: int = 167
    ) -> Dict[str, Any]:
        """
        每日主批次任务（建议分三次运行：9点/14点/19点）
        1. 从 AlphaShop 榜单 + 关键词搜索聚合候选
        2. 自动去重（视觉指纹 + product_id）
        3. AutoAuditRobot 过滤 ROI < 2.0
        4. 写入 candidate_products
        """
        logger.info(f"🏭 统一选品启动: keywords={keywords}, alphashop={len(alphashop_data or [])} items")
        
        all_raw = []
        
        # 1. CJ 多关键词搜索（并发）
        cj_tasks = [self.cj.search_products(kw, size=50) for kw in keywords]
        cj_results = await asyncio.gather(*cj_tasks, return_exceptions=True)
        for kw, result in zip(keywords, cj_results):
            if isinstance(result, list):
                for p in result:
                    all_raw.append(self._normalize_cj(p, keyword=kw))

        # 2. 合并 AlphaShop 榜单数据
        if alphashop_data:
            for item in alphashop_data:
                all_raw.append(self._normalize_alphashop(item))

        # 3. 去重（product_id_1688 + image fingerprint）
        deduped = self._deduplicate(all_raw)
        logger.info(f"✅ 去重后候选数: {len(deduped)} (原始: {len(all_raw)})")

        # 4. AutoAudit 过滤
        audited = await self.auditor.audit_and_inject(deduped[:batch_size])
        passed = [x for x in audited if x.get("profit_ratio", 0) >= self.MIN_ROI
                  and x.get("shipping_ratio", 1.0) <= self.MAX_SHIPPING_RATIO]
        
        # 5. 将通过的候选自动标记为 approved
        self._auto_approve(passed)
        
        logger.info(f"🎯 最终 approved: {len(passed)}/{len(audited)}")
        return {
            "raw_count": len(all_raw),
            "deduped_count": len(deduped),
            "audited_count": len(audited),
            "approved_count": len(passed),
        }

    def _normalize_cj(self, p: Dict, keyword: str = "") -> Dict:
        """CJ 数据标准化"""
        return {
            "product_id_1688": p.get("id") or p.get("pid", ""),
            "title_en": p.get("nameEn") or p.get("productName", ""),
            "title_zh": p.get("nameZh", ""),
            "images": [p.get("bigImage") or p.get("productImage", "")],
            "primary_image": p.get("bigImage") or p.get("productImage", ""),
            "cost_cny": float(p.get("sellPrice", "0").split("--")[-1].strip()) * 7.0,
            "cj_pid": p.get("id") or p.get("pid", ""),
            "platform_tag": "CJ",
            "source_platform": "CJ",
            "discovery_source": f"CJ_KEYWORD:{keyword}",
        }

    def _normalize_alphashop(self, item: Dict) -> Dict:
        """AlphaShop 榜单数据标准化"""
        return {
            "product_id_1688": item.get("itemId", ""),
            "title_en": item.get("itemTitle", ""),
            "images": [item.get("itemImage", "")],
            "primary_image": item.get("itemImage", ""),
            "cost_cny": float(item.get("price", 0)),
            "amazon_link": item.get("amazonLink", ""),
            "amazon_sale_price": float(item.get("amazonPrice", 0) or 0),
            "platform_tag": "1688",
            "source_platform": "alphashop",
            "discovery_source": "ALPHASHOP_RANKING",
        }

    def _deduplicate(self, items: List[Dict]) -> List[Dict]:
        """基于 product_id_1688 去重"""
        seen = set()
        unique = []
        for item in items:
            pid = item.get("product_id_1688", "")
            if pid and pid not in seen:
                seen.add(pid)
                unique.append(item)
        # 同时过滤已在 DB 中的
        db_pids = {c.product_id_1688 for c in self.db.query(CandidateProduct.product_id_1688).all()}
        return [x for x in unique if x.get("product_id_1688") not in db_pids]

    def _auto_approve(self, passed: List[Dict]):
        """高 ROI 候选自动 approved"""
        pids = [x["product_id_1688"] for x in passed]
        self.db.query(CandidateProduct).filter(
            CandidateProduct.product_id_1688.in_(pids)
        ).update({"status": "approved"}, synchronize_session=False)
        self.db.commit()
```

**验证：** 运行后 `candidate_products` 表中出现 status=approved 记录。

---

### Task 1.2：添加每日定时选品 API 端点

**文件：**
- 修改：`backend/app/api/admin.py`（追加路由）

**实现代码：**

```python
# 追加到 admin.py
from app.services.unified_sourcing import UnifiedSourcingPipeline

@router.post("/sourcing/run-daily")
async def run_daily_sourcing(
    keywords: List[str] = ["LED light therapy", "portable fan", "yoga mat"],
    db: Session = Depends(get_db)
):
    """触发每日选品批次（可由 Hermes cron 调用）"""
    pipeline = UnifiedSourcingPipeline(db)
    result = await pipeline.run_daily_batch(keywords=keywords)
    return {"status": "ok", "result": result}
```

---

### Task 1.3：配置 Hermes Cron 每日三次触发选品

**文件：**
- 创建：`backend/scripts/cron_sourcing.sh`

```bash
#!/bin/bash
# 触发后端选品接口（由 Hermes cron 调度）
curl -s -X POST "http://localhost:8000/api/v1/admin/sourcing/run-daily" \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["LED therapy mask", "portable blender", "resistance bands", "turmeric supplement", "solar light"]}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'✅ 选品完成: {d[\"result\"][\"approved_count\"]} 个 approved')"
```

**Hermes Cron 配置（在 Hermes 中执行）：**
```
每天 09:00、14:00、19:00 运行脚本 backend/scripts/cron_sourcing.sh
并将结果推送到飞书/当前对话
```

---

## Phase 2：LLM 润色引擎 (AI Copywriting Engine)

> 目标：对 approved 候选自动生成 EN 标题、SEO 描述、Desire Hook、Truth UI HTML，全程无人工干预。

### Task 2.1：创建 `ProductCopyEngine` 润色服务

**文件：**
- 创建：`backend/app/services/copy_engine.py`

**实现代码：**

```python
# backend/app/services/copy_engine.py
import logging
import json
from typing import Dict, Any, Optional
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.product import CandidateProduct

logger = logging.getLogger(__name__)

COPYWRITING_PROMPT = """你是一名专业的跨境电商文案专家，精通亚马逊和 Shopify SEO。

商品信息：
- 中文标题：{title_zh}
- 类目：{category}
- 成本：${source_cost_usd:.2f} USD
- 售价：${sell_price:.2f} USD
- Amazon 参考价：${amazon_sale_price:.2f} USD

请输出以下 JSON（不要 markdown 包裹）：
{{
  "title_en": "英文标题（≤80字符，含核心关键词，不含品牌）",
  "seo_description": "SEO 描述（150-200字，含3个核心关键词，自然流畅）",
  "desire_hook": "欲望钩子（1句话，触发购买冲动，英文）",
  "bullet_points": ["特点1（英文）", "特点2", "特点3", "特点4", "特点5"],
  "tags": ["tag1", "tag2", "tag3（最多8个相关标签）"],
  "truth_badge": "对比文案（如: Save 40% vs Amazon）"
}}"""

class ProductCopyEngine:
    """
    LLM 驱动的商品文案润色引擎
    输入: CandidateProduct (approved 状态)
    输出: 补全 title_en, description_en, desire_hook, tags, body_html
    """
    def __init__(self, db: Session):
        self.db = db
        genai.configure(api_key=settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    async def enrich_single(self, candidate: CandidateProduct) -> bool:
        """润色单个候选商品，回写到 DB"""
        try:
            prompt = COPYWRITING_PROMPT.format(
                title_zh=candidate.title_zh or candidate.title_en or "Unknown",
                category=candidate.category_name or "General",
                source_cost_usd=candidate.source_cost_usd or 0,
                sell_price=candidate.sell_price or 0,
                amazon_sale_price=candidate.amazon_sale_price or 0,
            )
            response = self.model.generate_content(prompt)
            raw = response.text.strip()
            
            # 清理可能的 markdown 包裹
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            
            data = json.loads(raw)
            
            # 回写到 CandidateProduct
            candidate.title_en = data.get("title_en", candidate.title_en)
            candidate.description_en = data.get("seo_description", "")
            candidate.desire_hook = data.get("desire_hook", "")
            candidate.tags = data.get("tags", [])
            
            # 构建 Truth UI HTML（body_html）
            candidate.body_html = self._build_truth_html(candidate, data)
            
            self.db.commit()
            logger.info(f"✅ 润色完成: {candidate.id} - {candidate.title_en[:40]}")
            return True
        except Exception as e:
            logger.error(f"❌ 润色失败 {candidate.id}: {e}")
            return False

    async def enrich_batch(self, batch_size: int = 50) -> Dict[str, int]:
        """批量润色 approved 状态的候选"""
        candidates = self.db.query(CandidateProduct).filter(
            CandidateProduct.status == "approved",
            CandidateProduct.description_en == None  # 未润色的
        ).limit(batch_size).all()
        
        success, failed = 0, 0
        for c in candidates:
            ok = await self.enrich_single(c)
            if ok: success += 1
            else: failed += 1
        
        return {"success": success, "failed": failed, "total": len(candidates)}

    def _build_truth_html(self, c: CandidateProduct, data: Dict) -> str:
        """构建 Truth UI HTML（产品详情页内容）"""
        bullets = "".join(f"<li>{b}</li>" for b in data.get("bullet_points", []))
        badge = data.get("truth_badge", "")
        
        return f"""
<div class="truth-ui">
  <div class="truth-badge">🏷️ {badge}</div>
  <h2>{c.title_en}</h2>
  <p class="desire-hook">✨ {data.get('desire_hook', '')}</p>
  <p>{data.get('seo_description', '')}</p>
  <ul class="bullets">{bullets}</ul>
  <div class="amazon-compare">
    <span>Amazon: <del>${c.amazon_sale_price or 0:.2f}</del></span>
    <span class="our-price">0Buck: <strong>${c.sell_price or 0:.2f}</strong></span>
  </div>
</div>"""
```

---

### Task 2.2：润色 API 端点

**文件：**
- 修改：`backend/app/api/admin.py`

```python
from app.services.copy_engine import ProductCopyEngine

@router.post("/copy/enrich-batch")
async def enrich_batch_copy(
    batch_size: int = 50,
    db: Session = Depends(get_db)
):
    """批量润色 approved 商品的标题和描述"""
    engine = ProductCopyEngine(db)
    result = await engine.enrich_batch(batch_size=batch_size)
    return {"status": "ok", "result": result}
```

---

### Task 2.3：图片清洗 + 视觉去重

**文件：**
- 修改：`backend/app/services/unified_sourcing.py`（追加 `_check_image_fingerprint`）

```python
import hashlib, httpx

async def _compute_image_fingerprint(self, image_url: str) -> Optional[str]:
    """下载图片计算 MD5 指纹，用于去重"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(image_url)
            if resp.status_code == 200:
                return hashlib.md5(resp.content).hexdigest()
    except:
        pass
    return None
```

---

## Phase 3：全自动上架 (Auto-Listing Engine)

> 目标：润色完成后无需人工点击，自动三班批量上架 Shopify。

### Task 3.1：上架触发器 — 润色完成自动触发

**文件：**
- 修改：`backend/app/services/copy_engine.py` 中 `enrich_batch` 方法末尾

```python
# 在 enrich_batch() 成功后，直接调用 BatchUploader
from app.services.batch_uploader import BatchUploader

async def enrich_and_upload_batch(self, batch_size: int = 50) -> Dict[str, Any]:
    """润色 + 立即上架的一体化方法"""
    enrich_result = await self.enrich_batch(batch_size)
    
    # 获取刚润色完成的候选 IDs
    enriched_ids = [
        c.id for c in self.db.query(CandidateProduct).filter(
            CandidateProduct.status == "approved",
            CandidateProduct.description_en != None
        ).limit(batch_size).all()
    ]
    
    uploader = BatchUploader(self.db)
    upload_results = await uploader.upload_batch(enriched_ids, concurrency=3)
    
    success_count = sum(1 for r, _ in upload_results if r)
    return {
        **enrich_result,
        "uploaded": success_count,
        "upload_failed": len(upload_results) - success_count
    }
```

---

### Task 3.2：Shopify 上架质量增强

**文件：**
- 修改：`backend/app/services/batch_uploader.py` → `upload_single` 方法

**改进点（在 sync_to_shopify 调用前注入）：**

```python
# 上架前确保以下字段已填充
pre_checks = {
    "title_en": bool(candidate.title_en),
    "description_en": bool(candidate.description_en),
    "images": bool(candidate.images),
    "sell_price": bool(candidate.sell_price and candidate.sell_price > 0),
    "cj_pid": bool(candidate.cj_pid),
}
if not all(pre_checks.values()):
    missing = [k for k,v in pre_checks.items() if not v]
    return False, f"❌ 上架前置检查失败，缺少: {missing}"
```

---

### Task 3.3：上架后自动设置 Shopify Metafields

**文件：**
- 修改：`backend/app/services/sync_shopify.py`（在 `sync_to_shopify` 末尾追加）

```python
async def _inject_metafields(self, shopify_product_id: str, candidate: CandidateProduct):
    """
    上架后注入 Truth Engine Metafields:
    - amazon_price: 竞品价格锚点
    - profit_badge: '40% OFF vs Amazon'
    - entry_tag: Promotion / Rebate
    """
    import httpx
    headers = {
        "X-Shopify-Access-Token": self.access_token,
        "Content-Type": "application/json"
    }
    metafields = [
        {"namespace": "truth", "key": "amazon_price",
         "value": str(candidate.amazon_sale_price or 0), "type": "number_decimal"},
        {"namespace": "truth", "key": "entry_tag",
         "value": candidate.entry_tag or "Promotion", "type": "single_line_text_field"},
        {"namespace": "truth", "key": "hot_rating",
         "value": str(candidate.hot_rating or 4.5), "type": "number_decimal"},
    ]
    url = f"https://{self.shop_url}/admin/api/2024-01/products/{shopify_product_id}/metafields.json"
    async with httpx.AsyncClient() as client:
        for mf in metafields:
            await client.post(url, json={"metafield": mf}, headers=headers)
```

---

## Phase 4：智能跟踪与告警系统 (Intelligent Monitoring)

> 目标：上架后持续监控成本/库存变动，异常自动告警 + 自动处理。

### Task 4.1：增强 MeltingService —— 集成飞书告警

**文件：**
- 修改：`backend/app/services/melting_service.py`

```python
import httpx
from app.core.config import settings

async def _send_feishu_alert(self, product: Product, reason: str):
    """熔断事件 → 飞书 Webhook 告警"""
    webhook_url = getattr(settings, "FEISHU_MELT_WEBHOOK", "")
    if not webhook_url:
        return
    
    msg = {
        "msg_type": "text",
        "content": {
            "text": f"⚠️ 【0Buck 熔断告警】\n"
                    f"商品: {product.title_en or product.id}\n"
                    f"Shopify ID: {product.shopify_product_id}\n"
                    f"原因: {reason}\n"
                    f"已自动下架，请检查供应商。"
        }
    }
    try:
        async with httpx.AsyncClient() as client:
            await client.post(webhook_url, json=msg, timeout=5)
    except Exception as e:
        logger.warning(f"飞书告警发送失败: {e}")

# 在 _melt_product 中调用:
await self._send_feishu_alert(product, reason)
```

---

### Task 4.2：销售速度跟踪 (Velocity Tracker)

**文件：**
- 创建：`backend/app/services/velocity_tracker.py`

```python
# backend/app/services/velocity_tracker.py
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.product import Product
from app.models.ledger import Order

logger = logging.getLogger(__name__)

class VelocityTracker:
    """
    销售速度跟踪器
    - 计算每个 SKU 过去 7 天销量
    - 识别滞销品（7天0销量）
    - 识别爆品（日均销量 > 5）
    - 自动调整 scan_priority
    """
    def __init__(self, db: Session):
        self.db = db

    def compute_weekly_velocity(self) -> List[Dict[str, Any]]:
        """计算所有上架商品的周销售速度"""
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        # 统计每个 shopify_product_id 的订单量（需 Order 模型有 line_items JSONB）
        results = []
        products = self.db.query(Product).filter(
            Product.is_active == True,
            Product.shopify_product_id != None
        ).all()
        
        for p in products:
            # 简化：通过 structural_data 中的 weekly_sales 字段
            sales = (p.structural_data or {}).get("weekly_sales", 0)
            velocity = sales / 7.0
            
            # 自动调整扫描优先级
            if velocity > 5:
                p.scan_priority = 1  # 爆品: 每小时扫描
            elif velocity > 0:
                p.scan_priority = 2  # 正常: 每4小时
            else:
                p.scan_priority = 3  # 滞销: 每12小时
            
            results.append({
                "product_id": p.id,
                "shopify_id": p.shopify_product_id,
                "title": p.title_en,
                "weekly_sales": sales,
                "daily_velocity": round(velocity, 2),
                "scan_priority": p.scan_priority,
                "status": "🔥爆品" if velocity > 5 else ("✅正常" if velocity > 0 else "❄️滞销"),
            })
        
        self.db.commit()
        return results

    def get_kpi_summary(self) -> Dict[str, Any]:
        """生成 KPI 日报"""
        velocity_data = self.compute_weekly_velocity()
        total_active = len(velocity_data)
        hot = sum(1 for x in velocity_data if x["daily_velocity"] > 5)
        normal = sum(1 for x in velocity_data if 0 < x["daily_velocity"] <= 5)
        cold = sum(1 for x in velocity_data if x["daily_velocity"] == 0)
        
        return {
            "total_active_skus": total_active,
            "hot_products": hot,
            "normal_products": normal,
            "cold_products": cold,
            "hot_rate": f"{hot/total_active*100:.1f}%" if total_active else "0%",
        }
```

---

### Task 4.3：自动重定价引擎 (Auto-Repricing)

**文件：**
- 创建：`backend/app/services/reprice_engine.py`

```python
# backend/app/services/reprice_engine.py
"""
自动重定价引擎：
- 当 CJ 采购成本变化 > 5% 时，触发重定价
- 基于新成本重算 sell_price（保持 60% Amazon MSRP 法则）
- 同步到 Shopify
"""
import logging, httpx
from typing import List
from sqlalchemy.orm import Session
from app.models.product import Product
from app.services.finance_engine import calculate_final_price
from app.core.config import settings

logger = logging.getLogger(__name__)

class RepriceEngine:
    COST_CHANGE_THRESHOLD = 0.05  # 5% 成本变动触发重定价

    def __init__(self, db: Session):
        self.db = db

    async def reprice_if_needed(self, product: Product, new_cost_usd: float) -> bool:
        """
        检测成本变动，必要时重定价
        返回 True 表示已触发重定价
        """
        old_cost = product.source_cost_usd or 0
        if old_cost == 0:
            return False

        change_rate = abs(new_cost_usd - old_cost) / old_cost
        if change_rate < self.COST_CHANGE_THRESHOLD:
            return False

        # 重算价格
        pricing = calculate_final_price(
            cost_cny=new_cost_usd / 0.14,  # 反推 CNY
            exchange_rate=0.14,
            comp_price_usd=product.amazon_sale_price or product.sale_price * 1.7,
            sale_price_ratio=0.6,
            compare_at_price_ratio=1.0,
            shipping_cost_usd=product.freight_fee or 8.0
        )

        new_price = pricing["final_price_usd"]
        logger.info(f"📈 重定价 {product.id}: ${old_cost:.2f} → ${new_cost_usd:.2f} | 售价 ${product.sale_price:.2f} → ${new_price:.2f}")

        # 同步到 Shopify
        await self._sync_price_to_shopify(product.shopify_variant_id, new_price)

        # 更新 DB
        product.source_cost_usd = new_cost_usd
        product.sale_price = new_price
        if pricing["is_reward_eligible"]:
            product.entry_tag = "Rebate"
        self.db.commit()
        return True

    async def _sync_price_to_shopify(self, variant_id: str, new_price: float):
        url = f"https://{settings.SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/variants/{variant_id}.json"
        headers = {"X-Shopify-Access-Token": settings.SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json"}
        async with httpx.AsyncClient() as client:
            await client.put(url, json={"variant": {"id": variant_id, "price": f"{new_price:.2f}"}}, headers=headers)
```

---

### Task 4.4：每日 KPI 日报 Cron

**文件：**
- 创建：`backend/scripts/cron_kpi_report.sh`

```bash
#!/bin/bash
# 每日 08:00 发送 KPI 日报到飞书
curl -s "http://localhost:8000/api/v1/admin/reports/daily-kpi" | python3 -c "
import sys, json
d = json.load(sys.stdin)
kpi = d.get('kpi', {})
print(f'''📊 0Buck 日报
━━━━━━━━━━━━━━━━━━━
🏬 在架 SKU: {kpi.get('total_active_skus', 0)}
🔥 爆品: {kpi.get('hot_products', 0)}
✅ 正常: {kpi.get('normal_products', 0)}
❄️ 滞销: {kpi.get('cold_products', 0)}
📈 热销率: {kpi.get('hot_rate', 'N/A')}
━━━━━━━━━━━━━━━━━━━''')
"
```

---

## Phase 5：全流程一键运行 API

**文件：**
- 修改：`backend/app/api/admin.py`（追加总控端点）

```python
@router.post("/pipeline/run-full")
async def run_full_pipeline(
    keywords: List[str] = ["portable fan", "LED mask", "yoga mat"],
    db: Session = Depends(get_db)
):
    """
    全流程一键运行：选品 → 润色 → 上架
    （适合 Hermes cron 每日三次调用）
    """
    results = {}
    
    # Step 1: 选品
    pipeline = UnifiedSourcingPipeline(db)
    results["sourcing"] = await pipeline.run_daily_batch(keywords=keywords)
    
    # Step 2: 润色 + 上架
    copy_engine = ProductCopyEngine(db)
    results["copy_and_upload"] = await copy_engine.enrich_and_upload_batch(batch_size=50)
    
    # Step 3: Melting Radar 扫描
    from app.services.melting_service import MeltingService
    melting = MeltingService(db)
    await melting.run_radar_scan(batch_size=100, priority=2)
    results["melting_scan"] = "done"
    
    return {"status": "ok", "results": results}
```

---

## 部署与调度方案

### Hermes Cron 配置

在 Hermes 中创建以下 3 个定时任务：

| 任务 | 时间 | 命令 |
|------|------|------|
| 选品+润色+上架 | 每天 09:00 | `POST /api/v1/admin/pipeline/run-full` |
| 选品+润色+上架 | 每天 14:00 | `POST /api/v1/admin/pipeline/run-full` |
| 选品+润色+上架 | 每天 19:00 | `POST /api/v1/admin/pipeline/run-full` |
| KPI 日报 | 每天 08:00 | `GET /api/v1/admin/reports/daily-kpi` |
| 熔断雷达(高频) | 每小时 | `POST /api/v1/admin/melting/scan?priority=1` |

### 环境变量补充（`backend/.env`）

```bash
# 新增
FEISHU_MELT_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/xxx
BUCKYDROP_APP_CODE=xxx
BUCKYDROP_APP_SECRET=xxx
BUCKYDROP_DOMAIN=https://api.buckydrop.com
```

---

## 优先级与时间估算

| Phase | 模块 | 工时 | 优先级 |
|-------|------|------|--------|
| 1 | 统一选品编排器 | 1天 | P0 🔴 |
| 2 | LLM 润色引擎 | 1天 | P0 🔴 |
| 3 | 全自动上架 | 0.5天 | P0 🔴 |
| 4.1 | 飞书熔断告警 | 0.5天 | P1 🟡 |
| 4.2 | 销售速度跟踪 | 1天 | P1 🟡 |
| 4.3 | 自动重定价 | 1天 | P2 🟢 |
| 5 | 全流程总控 API | 0.5天 | P0 🔴 |
| 调度 | Hermes Cron 配置 | 0.5天 | P0 🔴 |

**总估算：4-6天完成 P0+P1，可实现 500 SKU/天全自动化目标。**

---

## 验收标准

- [ ] Phase 1: `POST /admin/sourcing/run-daily` 成功返回 approved_count > 0
- [ ] Phase 2: `POST /admin/copy/enrich-batch` 成功生成英文标题和描述
- [ ] Phase 3: BatchUploader 自动将 approved 商品同步到 Shopify（status→synced）
- [ ] Phase 4: 库存不足时飞书收到告警消息
- [ ] Phase 5: `POST /admin/pipeline/run-full` 端到端跑通，全流程无人工干预

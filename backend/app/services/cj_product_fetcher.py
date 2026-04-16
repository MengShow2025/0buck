# backend/app/services/cj_product_fetcher.py
import logging
import asyncio
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.services.cj_service import CJDropshippingService

logger = logging.getLogger(__name__)


class CJProductFetcher:
    """
    CJ 商品完整字段采集器。
    两步采集：listV2 摘要 → query 详情，严格校验必要字段后入库。

    设计原则：
    - 价格范围取 min（最保守成本）
    - 运费按实际重量计算，不用固定值
    - 汇率统一用 settings.EXCHANGE_RATE
    - 缺必要字段则跳过，不入库
    """

    # listV2 摘要字段映射：api_key -> (field, type, default)
    LIST_FIELD_MAP = {
        "id":                    ("cj_pid",           str,   None),
        "pid":                   ("cj_pid",           str,   None),  # fallback
        "nameEn":                ("title_en_raw",     str,   ""),
        "productName":           ("title_en_raw",     str,   ""),  # fallback
        "bigImage":              ("primary_image",    str,   ""),
        "productImage":          ("primary_image",    str,   ""),  # fallback
        "categoryId":            ("category_id",      str,   ""),
        "categoryName":          ("category_name",    str,   ""),
        "sellPrice":             ("sell_price_raw",   str,   "0"),
        "productWeight":         ("product_weight",   float, 0.0),
        "packingWeight":         ("packing_weight",   float, 0.0),
        "warehouseInventoryNum": ("inventory_total",  int,   0),
    }

    # query 详情补充字段：api_key -> (field, type, default)
    DETAIL_FIELD_MAP = {
        "description":    ("description_zh",  str,   ""),
        "productLength":  ("_len",            float, 0.0),
        "productWidth":   ("_wid",            float, 0.0),
        "productHeight":  ("_hei",            float, 0.0),
        "entryNameEn":    ("entry_name",      str,   ""),
        "entryCode":      ("entry_code",      str,   ""),
    }

    # 必要字段：任何一个缺失则跳过商品
    REQUIRED_FIELDS = ["cj_pid", "primary_image", "source_cost_usd", "variant_vid"]

    def __init__(self, cj_service: CJDropshippingService = None):
        self.cj = cj_service or CJDropshippingService()

    @staticmethod
    def parse_sell_price(raw: str) -> float:
        """
        解析 sellPrice 字符串，取最小值（最保守成本估算）。
        例如 "3.50 -- 7.20" → 3.50
        例如 "5.00"         → 5.00

        注意：故意取第一个（最低）值，而非最大值或平均值。
        这是最保守的成本估算，确保不低估采购成本。
        """
        if not raw:
            return 0.0
        raw = raw.strip()
        # 范围格式：如 "3.50 -- 7.20" 或 "3.50-7.20"
        for sep in [" -- ", "--", " - ", "-"]:
            if sep in raw:
                parts = raw.split(sep)
                try:
                    # 只取第一个元素（min），最保守成本估算
                    return float(parts[0].strip())
                except ValueError:
                    break
        # 单值格式
        try:
            return float(raw)
        except ValueError:
            logger.warning(f"[CJProductFetcher] parse_sell_price: 无法解析 '{raw}'，返回 0.0")
            return 0.0

    def _map_list_fields(self, p: Dict) -> Dict:
        """
        映射 listV2 接口返回的单条商品摘要字段。
        按 LIST_FIELD_MAP 规则逐字段映射，支持 fallback key。
        返回初始 result 字典（未包含详情补充字段）。
        """
        result: Dict[str, Any] = {}

        # 已处理的目标字段，用于 fallback 逻辑
        already_set: set = set()

        for api_key, (field, ftype, default) in self.LIST_FIELD_MAP.items():
            raw_val = p.get(api_key)
            if raw_val is not None and raw_val != "":
                # 若目标字段已被主 key 设置，跳过 fallback key
                if field in already_set:
                    continue
                try:
                    result[field] = ftype(raw_val)
                    already_set.add(field)
                except (ValueError, TypeError):
                    result.setdefault(field, default)
            else:
                # 仅在目标字段尚未设置时，应用 default
                if field not in already_set:
                    result.setdefault(field, default)

        # 解析 sellPrice 范围字符串，取 min（最保守成本估算）
        sell_price_raw = result.get("sell_price_raw", "0")
        result["sell_price_usd"] = self.parse_sell_price(str(sell_price_raw))

        return result

    def _enrich_from_detail(self, result: Dict, detail: Dict) -> None:
        """
        用 query 详情接口返回的数据补充 result，原地修改。
        补充内容：
        1. DETAIL_FIELD_MAP 中的字段（description、尺寸、entryCode 等）
        2. variants：取最低价 variant，提取 vid + 精确价格，计算 source_cost_usd
        3. 图片列表（productImages）和 variant 差异图（variantImages）
        4. 尺寸拼成 dimensions_display
        5. 库存从 variants 汇总
        """
        # 1. 映射 DETAIL_FIELD_MAP 字段
        for api_key, (field, ftype, default) in self.DETAIL_FIELD_MAP.items():
            raw_val = detail.get(api_key)
            if raw_val is not None and raw_val != "":
                try:
                    result[field] = ftype(raw_val)
                except (ValueError, TypeError):
                    result[field] = default
            else:
                result.setdefault(field, default)

        # 2. 尺寸拼合：长×宽×高（单位 cm）
        l = result.pop("_len", 0.0)
        w = result.pop("_wid", 0.0)
        h = result.pop("_hei", 0.0)
        if l or w or h:
            result["dimensions_display"] = f"{l}×{w}×{h} cm"
        else:
            result["dimensions_display"] = ""

        # 3. 图片列表：商品画廊图
        product_images = detail.get("productImages", []) or detail.get("productImgs", []) or []
        if isinstance(product_images, list):
            result["images"] = [img.get("imageUrl", img) if isinstance(img, dict) else str(img)
                                for img in product_images]
        else:
            result["images"] = []

        # 4. Variant 处理：取最低价 variant
        variants_raw: List[Dict] = detail.get("variants", []) or detail.get("productVariants", []) or []

        variant_images: List[str] = []
        lowest_price: Optional[float] = None
        best_variant: Optional[Dict] = None
        inventory_total = 0

        for v in variants_raw:
            # 累加库存
            v_inventory = v.get("variantInventory", 0) or v.get("inventory", 0) or 0
            try:
                inventory_total += int(v_inventory)
            except (ValueError, TypeError):
                pass

            # 取 variant 差异图
            v_img = v.get("variantImage", "") or v.get("imageUrl", "")
            if v_img and v_img not in variant_images:
                variant_images.append(v_img)

            # 解析 variant 精确价格（不用 sellPrice 范围概算）
            v_price_raw = (
                v.get("variantSellPrice")
                or v.get("sellPrice")
                or v.get("variantPrice")
                or v.get("price")
                or "0"
            )
            v_price = self.parse_sell_price(str(v_price_raw))

            # 找最低价 variant
            if v_price > 0 and (lowest_price is None or v_price < lowest_price):
                lowest_price = v_price
                best_variant = v

        result["variant_images"] = variant_images

        # 若 detail 有库存汇总则优先使用，否则用 variants 累加
        if inventory_total > 0:
            result["inventory_total"] = inventory_total

        # 5. 从最低价 variant 提取 vid 和精确成本
        if best_variant:
            vid = (
                best_variant.get("vid")
                or best_variant.get("variantId")
                or best_variant.get("id")
                or ""
            )
            result["variant_vid"] = str(vid) if vid else ""

            # source_cost_usd：精确 variant 价格 × 汇率（settings.EXCHANGE_RATE）
            # 注意：lowest_price 已是 USD（CJ 报价单位），直接换算
            # 若 CJ 报价是 CNY，则除以 EXCHANGE_RATE；若是 USD，则直接使用
            # 根据 CJ API 文档，sellPrice 单位为 USD
            result["source_cost_usd"] = round(lowest_price, 4) if lowest_price else None
            result["variant_price_usd"] = result["source_cost_usd"]
        else:
            # 详情无 variants，回退到 listV2 的 sellPrice min 值
            fallback_price = result.get("sell_price_usd", 0.0)
            result["variant_vid"] = ""
            result["source_cost_usd"] = round(fallback_price, 4) if fallback_price else None
            result["variant_price_usd"] = result["source_cost_usd"]

    def _validate_required(self, result: Dict, pid: str) -> bool:
        """
        校验必要字段，任何一个为空/None 则返回 False，记录 warning。
        """
        for field in self.REQUIRED_FIELDS:
            val = result.get(field)
            if val is None or val == "" or val == 0:
                logger.warning(
                    f"[CJProductFetcher] pid={pid} 缺少必要字段 '{field}'（值={val!r}），跳过入库。"
                )
                return False
        return True

    async def fetch_full(self, pid: str) -> Optional[Dict]:
        """
        Step2：调 query 接口获取完整商品详情，完成字段映射与校验。
        返回完整 result 字典，或 None（缺少必要字段时）。
        """
        detail = await self.cj.get_product_detail(pid)
        if not detail:
            logger.warning(f"[CJProductFetcher] pid={pid} query 接口返回空，跳过。")
            return None

        # 先用 listV2 摘要字段初始化（detail 本身也包含摘要字段）
        result = self._map_list_fields(detail)

        # 补充详情字段（variants、图片、尺寸等）
        self._enrich_from_detail(result, detail)

        # 必要字段校验
        if not self._validate_required(result, pid):
            return None

        return result

    async def fetch_with_freight(
        self,
        pid: str,
        vid: str,
        dest_country: str = "US",
    ) -> Optional[Dict]:
        """
        在 fetch_full 基础上，调用 calculate_shipping_and_tax 获取实际运费。
        运费按实际重量计算，不使用固定值 $8 或 $10。
        """
        result = await self.fetch_full(pid)
        if result is None:
            return None

        # 使用传入的 vid（或 result 中的 variant_vid）
        effective_vid = vid or result.get("variant_vid", "")

        try:
            shipping_info = await self.cj.calculate_shipping_and_tax(
                pid=pid,
                vid=effective_vid,
                country_code=dest_country,
            )
            result["shipping_usd"] = shipping_info.get("freight", 0.0)
            result["tax_usd"] = shipping_info.get("tax", 0.0)
            result["shipping_total_usd"] = shipping_info.get("total_extra", 0.0)
            result["shipping_method"] = shipping_info.get("method", "")
            result["shipping_days"] = shipping_info.get("days", "")
        except Exception as e:
            logger.warning(
                f"[CJProductFetcher] pid={pid} vid={effective_vid} "
                f"calculate_shipping_and_tax 失败：{e}，运费字段置空。"
            )
            result["shipping_usd"] = None
            result["tax_usd"] = None
            result["shipping_total_usd"] = None
            result["shipping_method"] = ""
            result["shipping_days"] = ""

        return result

    async def fetch_batch(
        self,
        pids: List[str],
        dest_country: str = "US",
        concurrency: int = 3,
    ) -> List[Dict]:
        """
        并发批量采集，Semaphore 控制并发数，避免触发 CJ API 限流。
        对每个 pid 调用 fetch_with_freight，收集非 None 结果返回。
        """
        semaphore = asyncio.Semaphore(concurrency)

        async def _fetch_one(pid: str) -> Optional[Dict]:
            async with semaphore:
                try:
                    # fetch_full 已包含 query 步骤；vid 从 result 获取
                    result = await self.fetch_full(pid)
                    if result is None:
                        return None
                    vid = result.get("variant_vid", "")
                    # 追加运费
                    try:
                        shipping_info = await self.cj.calculate_shipping_and_tax(
                            pid=pid,
                            vid=vid,
                            country_code=dest_country,
                        )
                        result["shipping_usd"] = shipping_info.get("freight", 0.0)
                        result["tax_usd"] = shipping_info.get("tax", 0.0)
                        result["shipping_total_usd"] = shipping_info.get("total_extra", 0.0)
                        result["shipping_method"] = shipping_info.get("method", "")
                        result["shipping_days"] = shipping_info.get("days", "")
                    except Exception as e:
                        logger.warning(
                            f"[CJProductFetcher] batch pid={pid} 运费计算失败：{e}"
                        )
                        result["shipping_usd"] = None
                        result["tax_usd"] = None
                        result["shipping_total_usd"] = None
                        result["shipping_method"] = ""
                        result["shipping_days"] = ""
                    return result
                except Exception as e:
                    logger.error(f"[CJProductFetcher] batch pid={pid} 采集异常：{e}")
                    return None

        tasks = [_fetch_one(pid) for pid in pids]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        # 过滤 None，只返回成功采集的商品
        return [r for r in results if r is not None]

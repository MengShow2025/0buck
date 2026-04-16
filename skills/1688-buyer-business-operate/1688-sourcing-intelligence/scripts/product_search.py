"""
商品搜索模块
调用AlphaShop API进行1688商品搜索
"""

import os
import json
import hashlib
import time
import requests
from typing import Optional


class ProductSearch:
    """商品搜索类"""
    
    BASE_URL = "https://api.alphashop.cn/v1"
    
    def __init__(self):
        self.access_key = os.environ.get("ALPHASHOP_ACCESS_KEY") or self._load_from_config("ALPHASHOP_ACCESS_KEY")
        self.secret_key = os.environ.get("ALPHASHOP_SECRET_KEY") or self._load_from_config("ALPHASHOP_SECRET_KEY")
    
    def _load_from_config(self, key: str) -> Optional[str]:
        """从配置文件加载"""
        config_file = os.path.join(os.path.dirname(__file__), "..", ".env")
        if os.path.exists(config_file):
            with open(config_file) as f:
                for line in f:
                    if line.startswith(f"{key}="):
                        return line.split("=", 1)[1].strip()
        return None
    
    def _generate_signature(self, params: dict) -> str:
        """生成签名"""
        sorted_params = sorted(params.items())
        param_str = "&".join([f"{k}={v}" for k, v in sorted_params])
        sign_str = f"{param_str}{self.secret_key}"
        return hashlib.md5(sign_str.encode()).hexdigest()
    
    def _make_request(self, endpoint: str, params: dict) -> dict:
        """发送请求"""
        if not self.access_key:
            return {
                "success": False,
                "markdown": "AK 未配置，请先运行: python3 cli.py configure --ak YOUR_AK --sk YOUR_SK",
                "data": {"error": "AK_NOT_CONFIGURED"}
            }
        
        params["access_key"] = self.access_key
        params["timestamp"] = int(time.time())
        params["signature"] = self.generate_signature(params)
        
        try:
            response = requests.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                timeout=30
            )
            
            if response.status_code == 401:
                return {
                    "success": False,
                    "markdown": "签名无效 (401)，请检查 AK/SK 是否正确",
                    "data": {"error": "AUTH_FAILED"}
                }
            elif response.status_code == 429:
                return {
                    "success": False,
                    "markdown": "请求被限流 (429)，请等待 1-2 分钟后重试",
                    "data": {"error": "RATE_LIMITED"}
                }
            elif response.status_code != 200:
                return {
                    "success": False,
                    "markdown": f"请求失败 ({response.status_code}): {response.text}",
                    "data": {"error": "HTTP_ERROR"}
                }
            
            result = response.json()
            
            if result.get("code") != 0:
                return {
                    "success": False,
                    "markdown": result.get("message", "未知错误"),
                    "data": result
                }
            
            return {
                "success": True,
                "data": result.get("data", {})
            }
            
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "markdown": "请求超时，请检查网络连接后重试",
                "data": {"error": "TIMEOUT"}
            }
        except Exception as e:
            return {
                "success": False,
                "markdown": f"网络异常: {str(e)}",
                "data": {"error": "NETWORK_ERROR"}
            }
    
    def generate_signature(self, params: dict) -> str:
        """生成签名（兼容方法）"""
        return self._generate_signature(params)
    
    def check_config(self) -> dict:
        """检查配置状态"""
        if not self.access_key:
            return {"configured": False, "message": "AK未配置"}
        
        # 尝试一个简单请求验证
        result = self._make_request("product/search", {"keyword": "test", "page": 1, "page_size": 1})
        
        return {
            "configured": True,
            "ak_valid": result.get("success", False),
            "message": "配置正常" if result.get("success") else result.get("markdown", "未知错误")
        }
    
    def search(self, query: str, channel: str = "", limit: int = 20) -> dict:
        """
        搜索商品
        
        Args:
            query: 搜索关键词
            channel: 目标渠道 (douyin/taobao/pinduoduo/xiaohongshu)
            limit: 返回数量
        
        Returns:
            标准JSON输出
        """
        params = {
            "keyword": query,
            "page": 1,
            "page_size": min(limit, 50)
        }
        
        if channel:
            params["channel"] = channel
        
        result = self._make_request("product/search", params)
        
        if not result.get("success"):
            return result
        
        products = result.get("data", {}).get("products", [])
        
        # 构建markdown表格
        if products:
            table_rows = []
            for i, p in enumerate(products[:limit], 1):
                table_rows.append(
                    f"| {i} | [{p.get('title', '商品')}]({p.get('url', '')}) | "
                    f"¥{p.get('price', 'N/A')} | "
                    f"{p.get('sales', 'N/A')} | "
                    f"{p.get('goodsRate', 'N/A')}% | "
                    f"{p.get('rePurchaseRate', 'N/A')}% |"
                )
            
            markdown = f"找到 **{len(products)}** 个商品：\n\n"
            markdown += "| # | 商品 | 价格 | 销量 | 好评率 | 复购率 |\n"
            markdown += "|---|------|------|------|--------|--------|\n"
            markdown += "\n".join(table_rows)
        else:
            markdown = "未找到符合条件的商品，建议调整关键词后重试"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": {
                "query": query,
                "channel": channel,
                "product_count": len(products),
                "products": products
            }
        }
    
    def get_detail(self, product_id: str) -> dict:
        """
        获取商品详情
        
        Args:
            product_id: 商品ID
        
        Returns:
            标准JSON输出
        """
        result = self._make_request("product/detail", {
            "product_id": product_id
        })
        
        if not result.get("success"):
            return result
        
        product = result.get("data", {})
        
        # 构建详情markdown
        markdown = f"### {product.get('title', '商品详情')}\n\n"
        markdown += f"**价格**: ¥{product.get('price', 'N/A')}\n\n"
        markdown += f"**供应商**: {product.get('supplier_name', 'N/A')}\n\n"
        markdown += f"**30天销量**: {product.get('sales_30d', 'N/A')}\n\n"
        markdown += f"**好评率**: {product.get('goods_rate', 'N/A')}%\n\n"
        
        if product.get("skus"):
            markdown += "**SKU信息**:\n"
            for sku in product.get("skus", [])[:5]:
                markdown += f"- {sku.get('name', '规格')}: ¥{sku.get('price', 'N/A')}\n"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": product
        }

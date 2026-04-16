"""
供应商搜索模块
调用AlphaShop API进行1688供应商搜索
"""

import os
import json
import hashlib
import time
import requests
from typing import Optional


class SupplierSearch:
    """供应商搜索类"""
    
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
        params["signature"] = self._generate_signature(params)
        
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
            
            result = response.json()
            return {
                "success": result.get("code") == 0,
                "data": result.get("data", {}),
                "message": result.get("message", "")
            }
            
        except Exception as e:
            return {
                "success": False,
                "markdown": f"请求失败: {str(e)}",
                "data": {"error": str(e)}
            }
    
    def search(self, query: str, method: str = "keyword", limit: int = 10) -> dict:
        """
        搜索供应商
        
        Args:
            query: 搜索关键词/URL/图片URL
            method: 搜索方式 (keyword/url/image)
            limit: 返回数量
        
        Returns:
            标准JSON输出
        """
        params = {
            "q": query,
            "method": method,
            "limit": min(limit, 20)
        }
        
        result = self._make_request("supplier/search", params)
        
        if not result.get("success"):
            return result
        
        suppliers = result.get("data", {}).get("suppliers", [])
        
        # 构建markdown表格
        if suppliers:
            table_rows = []
            for i, s in enumerate(suppliers[:limit], 1):
                table_rows.append(
                    f"| {i} | [{s.get('name', '供应商')}]({s.get('url', '')}) | "
                    f"{s.get('location', 'N/A')} | "
                    f"{s.get('year', 'N/A')}年 | "
                    f"{s.get('good_rate', 'N/A')}% | "
                    f"{s.get('response_time', 'N/A')} |"
                )
            
            markdown = f"找到 **{len(suppliers)}** 家供应商：\n\n"
            markdown += "| # | 供应商 | 所在地 | 经营年限 | 好评率 | 响应时间 |\n"
            markdown += "|---|--------|--------|---------|--------|----------|\n"
            markdown += "\n".join(table_rows)
        else:
            markdown = "未找到符合条件的供应商"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": {
                "query": query,
                "method": method,
                "supplier_count": len(suppliers),
                "suppliers": suppliers
            }
        }
    
    def get_detail(self, supplier_id: str) -> dict:
        """
        获取供应商详情
        
        Args:
            supplier_id: 供应商ID
        
        Returns:
            标准JSON输出
        """
        result = self._make_request("supplier/detail", {
            "supplier_id": supplier_id
        })
        
        if not result.get("success"):
            return result
        
        supplier = result.get("data", {})
        
        # 构建详情markdown
        markdown = f"### {supplier.get('name', '供应商详情')}\n\n"
        markdown += f"**所在地**: {supplier.get('location', 'N/A')}\n\n"
        markdown += f"**经营模式**: {supplier.get('model', 'N/A')}\n\n"
        markdown += f"**经营年限**: {supplier.get('year', 'N/A')}年\n\n"
        markdown += f"**主营类目**: {supplier.get('category', 'N/A')}\n\n"
        markdown += f"**好评率**: {supplier.get('good_rate', 'N/A')}%\n\n"
        markdown += f"**复购率**: {supplier.get('re_purchase_rate', 'N/A')}%\n\n"
        markdown += f"**响应时间**: {supplier.get('response_time', 'N/A')}\n\n"
        
        if supplier.get("certifications"):
            markdown += f"**资质认证**: {', '.join(supplier.get('certifications', []))}\n"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": supplier
        }

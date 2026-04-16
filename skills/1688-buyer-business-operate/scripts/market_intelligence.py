"""
市场洞察模块
商机热榜、趋势分析
"""

import os
import json
import hashlib
import time
import requests
from typing import Optional


class MarketIntelligence:
    """市场洞察类"""
    
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
    
    def opportunities(self, category: str = "", time_range: str = "day") -> dict:
        """
        获取商机热榜
        
        Args:
            category: 类目筛选
            time_range: 时间范围 (hour/day/week/month)
        
        Returns:
            标准JSON输出
        """
        params = {
            "time_range": time_range
        }
        
        if category:
            params["category"] = category
        
        result = self._make_request("opportunities", params)
        
        if not result.get("success"):
            return result
        
        opportunities = result.get("data", {}).get("opportunities", [])
        
        if opportunities:
            table_rows = []
            for i, opp in enumerate(opportunities, 1):
                table_rows.append(
                    f"| {i} | [{opp.get('name', '商品')}]({opp.get('url', '')}) | "
                    f"{opp.get('category', 'N/A')} | "
                    f"↑{opp.get('growth', 'N/A')}% | "
                    f"{opp.get('hot_score', 'N/A')} |"
                )
            
            markdown = f"### 商机热榜\n\n"
            markdown += f"**时间范围**: {self._get_time_range_text(time_range)}\n\n"
            markdown += "| # | 商品 | 类目 | 热度涨幅 | 热门指数 |\n"
            markdown += "|---|------|------|---------|----------|\n"
            markdown += "\n".join(table_rows)
            
            markdown += "\n\n**分析建议**: \n"
            markdown += "- 热度涨幅 > 50%: 热门上升中，建议重点关注\n"
            markdown += "- 热门指数 > 80: 高需求品类\n"
            markdown += "- 结合自身资源选择切入时机\n"
        else:
            markdown = "暂无线上商机"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": {
                "time_range": time_range,
                "category": category,
                "count": len(opportunities),
                "opportunities": opportunities
            }
        }
    
    def trend(self, query: str, time_range: str = "month") -> dict:
        """
        市场趋势分析
        
        Args:
            query: 搜索关键词
            time_range: 时间范围 (week/month/3month/year)
        
        Returns:
            标准JSON输出
        """
        params = {
            "keyword": query,
            "time_range": time_range
        }
        
        result = self._make_request("trend", params)
        
        if not result.get("success"):
            return result
        
        trend_data = result.get("data", {})
        
        # 构建趋势markdown
        markdown = f"### 市场趋势: {query}\n\n"
        markdown += f"**时间范围**: {self._get_time_range_text(time_range)}\n\n"
        
        if trend_data.get("trend_points"):
            markdown += "**趋势数据**:\n"
            for point in trend_data.get("trend_points", [])[:7]:
                markdown += f"- {point.get('date', 'N/A')}: {point.get('value', 'N/A')}\n"
        
        if trend_data.get("summary"):
            markdown += f"\n**分析摘要**:\n{trend_data.get('summary')}\n"
        
        if trend_data.get("recommendations"):
            markdown += "\n**选品建议**:\n"
            for rec in trend_data.get("recommendations", []):
                markdown += f"- {rec}\n"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": trend_data
        }
    
    def _get_time_range_text(self, time_range: str) -> str:
        """获取时间范围文本"""
        time_map = {
            "hour": "近1小时",
            "day": "近24小时",
            "week": "近7天",
            "month": "近30天",
            "3month": "近3个月",
            "year": "近1年"
        }
        return time_map.get(time_range, time_range)

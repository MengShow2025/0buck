"""
询盘模块
调用AlphaShop API进行1688询盘
"""

import os
import json
import hashlib
import time
import requests
from typing import Optional, List


class Inquiry:
    """询盘类"""
    
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
    
    def _make_request(self, endpoint: str, params: dict, method: str = "GET") -> dict:
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
            if method == "POST":
                response = requests.post(
                    f"{self.BASE_URL}/{endpoint}",
                    json=params,
                    timeout=30
                )
            else:
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
            
            # 检查业务错误
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
            
        except Exception as e:
            return {
                "success": False,
                "markdown": f"请求失败: {str(e)}",
                "data": {"error": str(e)}
            }
    
    def submit(self, product_url: str, product_id: str = None, 
                questions: str = "", quantity: str = None) -> dict:
        """
        提交询盘
        
        Args:
            product_url: 商品链接
            product_id: 商品ID（可选）
            questions: 询盘问题
            quantity: 期望数量（可选）
        
        Returns:
            标准JSON输出
        """
        params = {
            "product_url": product_url,
            "question": questions
        }
        
        if product_id:
            params["product_id"] = product_id
        if quantity:
            params["quantity"] = quantity
        
        result = self._make_request("inquiry/submit", params, method="POST")
        
        if not result.get("success"):
            return result
        
        task_id = result.get("data", {}).get("task_id")
        
        return {
            "success": True,
            "markdown": f"询盘已提交，任务ID: `{task_id}`\n\n请在20分钟后查询结果。",
            "data": {
                "task_id": task_id,
                "status": "submitted",
                "estimated_time": "20分钟"
            }
        }
    
    def query(self, task_id: str) -> dict:
        """
        查询询盘结果
        
        Args:
            task_id: 询盘任务ID
        
        Returns:
            标准JSON输出
        """
        result = self._make_request("inquiry/query", {"task_id": task_id})
        
        if not result.get("success"):
            return result
        
        inquiry_data = result.get("data", {})
        status = inquiry_data.get("status")
        
        if status == "pending":
            return {
                "success": True,
                "markdown": "询盘结果还在处理中，请稍后再试。",
                "data": inquiry_data
            }
        
        # 构建结果markdown
        markdown = f"### 询盘结果\n\n"
        markdown += f"**商品**: {inquiry_data.get('product_name', 'N/A')}\n\n"
        markdown += f"**供应商**: {inquiry_data.get('supplier_name', 'N/A')}\n\n"
        markdown += f"**状态**: {'已回复' if status == 'completed' else '处理中'}\n\n"
        
        if inquiry_data.get("answers"):
            markdown += "| 问题 | 回复 |\n|------|------|\n"
            for qa in inquiry_data.get("answers", []):
                markdown += f"| {qa.get('question', '')} | {qa.get('answer', '')} |\n"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": inquiry_data
        }
    
    def list_pending(self) -> dict:
        """
        列出待处理的询盘
        
        Returns:
            标准JSON输出
        """
        result = self._make_request("inquiry/list", {"status": "pending"})
        
        if not result.get("success"):
            return result
        
        inquiries = result.get("data", {}).get("inquiries", [])
        
        if inquiries:
            markdown = f"**待处理询盘 ({len(inquiries)}个)**:\n\n"
            for i, inquiry in enumerate(inquiries, 1):
                markdown += f"{i}. {inquiry.get('product_name', '商品')} - "
                markdown += f"提交时间: {inquiry.get('submit_time', 'N/A')}\n"
        else:
            markdown = "暂无待处理的询盘"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": {
                "count": len(inquiries),
                "inquiries": inquiries
            }
        }

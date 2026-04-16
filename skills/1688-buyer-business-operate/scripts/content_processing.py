"""
素材加工模块
图片处理、文本生成、翻译
"""

import os
import json
import hashlib
import time
import requests
from typing import Optional


class ContentProcessing:
    """素材加工类"""
    
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
                    timeout=60
                )
            else:
                response = requests.get(
                    f"{self.BASE_URL}/{endpoint}",
                    params=params,
                    timeout=60
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
    
    def process_image(self, image_url: str, operation: str) -> dict:
        """
        图片处理
        
        Args:
            image_url: 图片URL
            operation: 操作类型 (translate/enhance/remove_bg/try_on)
        
        Returns:
            标准JSON输出
        """
        params = {
            "image_url": image_url,
            "operation": operation
        }
        
        result = self._make_request("image/process", params, method="POST")
        
        if not result.get("success"):
            return result
        
        image_data = result.get("data", {})
        
        operation_text = {
            "translate": "翻译",
            "enhance": "优化",
            "remove_bg": "抠图",
            "try_on": "试穿"
        }
        
        markdown = f"### 图片{operation_text.get(operation, '处理')}完成\n\n"
        markdown += f"**处理类型**: {operation_text.get(operation, operation)}\n\n"
        
        if image_data.get("result_url"):
            markdown += f"**结果图片**: ![处理结果]({image_data.get('result_url')})\n\n"
            markdown += f"[点击下载]({image_data.get('result_url')})\n"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": image_data
        }
    
    def generate_text(self, product_name: str, language: str = "en", 
                      purpose: str = "listing") -> dict:
        """
        文本生成
        
        Args:
            product_name: 商品名称
            language: 目标语言
            purpose: 用途 (listing/description/tagline)
        
        Returns:
            标准JSON输出
        """
        params = {
            "product_name": product_name,
            "language": language,
            "purpose": purpose
        }
        
        result = self._make_request("text/generate", params, method="POST")
        
        if not result.get("success"):
            return result
        
        text_data = result.get("data", {})
        
        purpose_text = {
            "listing": "商品标题",
            "description": "商品描述",
            "tagline": "卖点文案"
        }
        
        markdown = f"### {purpose_text.get(purpose, '文本')}生成\n\n"
        markdown += f"**商品**: {product_name}\n\n"
        markdown += f"**语言**: {language.upper()}\n\n"
        
        if text_data.get("content"):
            markdown += f"---\n\n{text_data.get('content')}\n\n---"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": text_data
        }
    
    def translate(self, text: str, target_lang: str) -> dict:
        """
        文本翻译
        
        Args:
            text: 待翻译文本
            target_lang: 目标语言
        
        Returns:
            标准JSON输出
        """
        params = {
            "text": text,
            "target_lang": target_lang
        }
        
        result = self._make_request("text/translate", params, method="POST")
        
        if not result.get("success"):
            return result
        
        translate_data = result.get("data", {})
        
        markdown = f"### 翻译结果\n\n"
        markdown += f"**原文**: {text}\n\n"
        markdown += f"**目标语言**: {target_lang.upper()}\n\n"
        markdown += f"---\n\n**译文**:\n\n{translate_data.get('translated_text', '')}\n\n---"
        
        return {
            "success": True,
            "markdown": markdown,
            "data": translate_data
        }

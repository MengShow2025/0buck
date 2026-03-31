import os
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from backend.app.core.config import settings

class VectorSearchService:
    def __init__(self):
        self.client = QdrantClient(host="localhost", port=6333) # 默认配置
        self.collection_name = "products_1688"
        self._ensure_collection()

    def _ensure_collection(self):
        """确保 Qdrant 集合存在"""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=768, # SigLIP 常见维度
                        distance=models.Distance.COSINE
                    )
                )
        except Exception as e:
            print(f"Qdrant collection error: {e}")

    def upsert_product(self, product_id: str, vector: List[float], payload: Dict[str, Any]):
        """将商品向量和元数据写入 Qdrant"""
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                models.PointStruct(
                    id=product_id,
                    vector=vector,
                    payload=payload
                )
            ]
        )

    def search(self, vector: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        """执行向量搜索"""
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=limit
        )
        return [r.payload for r in results]

    async def get_embedding(self, text: Optional[str] = None, image_url: Optional[str] = None) -> List[float]:
        """
        获取 SigLIP 嵌入向量 (Mock)
        实际开发中应调用推理 API 或本地模型。
        """
        # 模拟生成一个 768 维的随机向量
        import random
        return [random.uniform(-1, 1) for _ in range(768)]

vector_search_service = VectorSearchService()

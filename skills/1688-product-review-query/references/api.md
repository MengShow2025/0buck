# 商品评论查询API参考文档

完整的API文档请参考：
`/Users/mcluo/Documents/javaProject/global-1688-ai-sel/docs/api/ProductReviewQueryAPI.md`

## 快速参考

### API 端点
```
POST https://api.alphashop.cn/opp.selection.productreview.query/1.0
```

### 认证方式
JWT Token (Bearer 认证)

### 核心参数
- `productIdList`: 商品ID列表（必填）
- `targetPlatform`: amazon/tiktok（必填）
- `targetCountry`: 国家代码（必填）
- `pageNum`: 页码（可选，默认1）
- `pageSize`: 每页数量（可选，默认10）

### 筛选参数
- `minRating`, `maxRating`: 评分范围
- `startTime`, `endTime`: 时间范围
- `minUpNum`: 最小点赞数
- `sortField`: 排序字段（review_time/review_score/up_num）
- `sortOrder`: 排序方向（asc/desc）

### 返回数据
```json
{
  "success": true,
  "code": "SUCCESS",
  "data": {
    "reviewList": [...],
    "totalCount": 25,
    "pageNum": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

更多详情请查看完整文档。

# 市场洞察指南

## CLI 调用

### 商机热榜

```
python3 {baseDir}/cli.py opportunities [--category 类目] [--time-range 范围]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --category | 空 | 类目筛选 |
| --time-range | day | hour/day/week/month |

### 市场趋势

```
python3 {baseDir}/cli.py trend --query "关键词" [--time-range 范围]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --query | 必填 | 搜索关键词 |
| --time-range | month | week/month/3month/year |

## 输出结构

### 商机热榜

```json
{
  "success": true,
  "markdown": "### 商机热榜\n\n| # | 商品 | 类目 | 热度涨幅 | 热门指数 |...",
  "data": {
    "time_range": "day",
    "opportunities": [
      {
        "name": "蓝牙耳机",
        "category": "消费电子",
        "growth": 35,
        "hot_score": 88,
        "url": "https://..."
      }
    ]
  }
}
```

### 市场趋势

```json
{
  "success": true,
  "markdown": "### 市场趋势: 蓝牙耳机\n\n**分析摘要**: ...\n\n**选品建议**: ...",
  "data": {
    "trend_points": [...],
    "summary": "...",
    "recommendations": ["...", "..."]
  }
}
```

## 商机分析规则

### 热度评级

| 热度涨幅 | 评级 | 建议 |
|---------|------|------|
| > 50% | 🔥热门爆发 | 重点关注，快速入场 |
| 20-50% | 📈稳步上升 | 持续观察，择机入场 |
| 0-20% | ➡平稳 | 谨慎入场，寻找细分 |
| < 0 | ⬇下降 | 不建议入场 |

### 热门指数

| 指数范围 | 含义 | 建议 |
|---------|------|------|
| > 80 | 高需求 | 竞争激烈，需差异化 |
| 60-80 | 中等需求 | 有机会，适合切入 |
| < 60 | 低需求 | 需培育，风险较高 |

## 展示规范

Agent 回复必须包含：
1. 商机/趋势概览
2. 关键数据解读
3. 分析建议
4. 具体选品建议
5. 下一步行动

## 异常处理

| 场景 | 表现 | Agent 应对 |
|------|------|-----------|
| 无商机数据 | opportunities: [] | 建议扩大类目范围 |
| 趋势数据不足 | trend_points: [] | 建议换更通用的关键词 |

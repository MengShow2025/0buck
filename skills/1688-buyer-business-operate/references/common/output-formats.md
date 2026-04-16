# 输出格式规范

## 标准输出格式

所有 CLI 命令统一输出 JSON 格式：

```json
{
  "success": true,
  "markdown": "用户可读的展示内容",
  "data": {}
}
```

## markdown 字段规范

### 必须包含

1. **标题**：清晰说明展示内容
2. **数据表格**：使用 Markdown 表格格式
3. **超链接**：关键信息需可点击

### 格式示例

```markdown
### 商品搜索结果

找到 **18** 个商品：

| # | 商品 | 价格 | 30天销量 | 好评率 |
|---|------|------|---------|--------|
| 1 | [商品A](url) | ¥45 | 12680 | 96.2% |

**分析**：推荐商品A，理由是...
```

## data 字段规范

### 必含字段

| 字段 | 说明 |
|------|------|
| count | 结果数量 |
| items | 结果列表 |

### 可选字段

| 字段 | 说明 |
|------|------|
| summary | 分析摘要 |
| scores | 评分数据 |
| recommendations | 建议列表 |
| risk_alerts | 风险提示 |

## 决策卡片格式

```json
{
  "type": "decision_card",
  "scene": "场景类型",
  "recommendation": {
    "winner": "推荐项",
    "score": 85,
    "reason": "推荐理由"
  },
  "alternatives": [...],
  "risk_alerts": [...],
  "action_items": [...]
}
```

## 行动清单格式

```json
{
  "type": "action_list",
  "context": "背景信息",
  "actions": [
    {
      "step": 1,
      "task": "任务描述",
      "priority": "P0/P1/P2",
      "command": "CLI命令",
      "depends_on": null
    }
  ]
}
```

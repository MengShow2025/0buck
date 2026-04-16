# 报告导出指南

## CLI 调用

```
python3 {baseDir}/cli.py export --report-type 类型 --format 格式 [--output 路径]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --report-type | 必填 | 报告类型 |
| --format | json | 输出格式 |
| --output | 自动生成 | 输出路径 |

**报告类型**：
- `decision`：决策卡片
- `comparison`：对比分析
- `action`：行动清单

**输出格式**：
- `json`：JSON结构化数据
- `markdown`：Markdown文档
- `pdf`：PDF文档（需要安装wkhtmltopdf）
- `csv`：CSV表格（仅对比数据）

## 输出结构

### 决策卡片

```json
{
  "type": "decision_card",
  "scene": "选品决策",
  "context": {
    "user_goal": "找到适合亚马逊的蓝牙耳机",
    "phase": "evaluation"
  },
  "recommendation": {
    "winner": "商品A",
    "score": 82,
    "reason": "综合评分最高，适合新手"
  },
  "alternatives": [...],
  "risk_alerts": [...],
  "action_items": [...]
}
```

### 行动清单

```json
{
  "type": "action_list",
  "context": {
    "goal": "完成蓝牙耳机采购",
    "timeline": "2-4周"
  },
  "actions": [
    {
      "step": 1,
      "task": "联系TOP3供应商",
      "priority": "P0",
      "command": "supplier --query ...",
      "depends_on": null
    },
    {
      "step": 2,
      "task": "发起询盘确认价格",
      "priority": "P0",
      "command": "inquiry submit ...",
      "depends_on": 1
    }
  ]
}
```

## 文件命名规则

| 类型 | 格式 | 示例 |
|------|------|------|
| decision | decision_[category]_[timestamp].json | decision_headphone_20260322.json |
| comparison | compare_[type]_[timestamp].json | compare_supplier_20260322.json |
| action | action_[category]_[timestamp].json | action_procurement_20260322.json |

## 异常处理

| 场景 | 表现 | Agent 应对 |
|------|------|-----------|
| 格式不支持 | 不支持的格式 | 提示支持的格式列表 |
| 写入失败 | 权限错误 | 建议更换输出路径 |
| 生成失败 | 数据不足 | 提示先完成必要分析 |

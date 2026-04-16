# 询盘操作指南

## CLI 调用

### 提交询盘

```
python3 {baseDir}/cli.py inquiry submit --product-url "URL" --questions "问题" [--quantity 数量]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --product-url | 必填 | 1688商品链接 |
| --questions | 必填 | 询盘问题 |
| --quantity | 可选 | 期望采购数量 |

### 查询结果

```
python3 {baseDir}/cli.py inquiry query --task-id "任务ID"
```

### 列出待处理

```
python3 {baseDir}/cli.py inquiry list
```

## 输出结构

### 提交询盘

```json
{
  "success": true,
  "markdown": "询盘已提交，任务ID: `task_xxx`\n\n请在20分钟后查询结果。",
  "data": {
    "task_id": "task_xxx",
    "status": "submitted",
    "estimated_time": "20分钟"
  }
}
```

### 查询结果

```json
{
  "success": true,
  "markdown": "### 询盘结果\n\n**商品**: 蓝牙耳机\n**供应商**: 深圳XX厂\n**状态**: 已回复\n\n| 问题 | 回复 |\n|------|------|",
  "data": {
    "status": "completed",
    "answers": [
      {"question": "MOQ多少？", "answer": "200件起"},
      {"question": "交期多久？", "answer": "15天"}
    ]
  }
}
```

## 询盘问题建议

### 必问问题

1. **MOQ（最低起订量）**
2. **单价（含税/不含税）**
3. **交期（生产周期+发货时间）**
4. **样品流程和费用**

### 推荐问题

1. 支持哪些定制（Logo/包装）
2. 有哪些认证（CE/FCC/ROHS）
3. 月产能多少
4. 付款方式
5. 退换货政策

### 价格谈判

1. 批量采购是否有折扣
2. 长期合作政策
3. 首单优惠

## 异常处理

| 场景 | 表现 | Agent 应对 |
|------|------|-----------|
| 提交失败 | success: false | 输出错误信息，提示检查商品链接 |
| 结果待处理 | status: pending | 告知用户等待，定时提醒查询 |
| 商品下架 | 商品不可用 | 建议用户重新搜索同类商品 |

## 展示规范

Agent 回复必须包含：
1. 询盘状态说明
2. 供应商回复内容
3. 关键信息提取（价格/MOQ/交期）
4. 下一步建议（确认样品/谈判价格）

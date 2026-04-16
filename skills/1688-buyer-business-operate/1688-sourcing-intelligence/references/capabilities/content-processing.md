# 素材加工指南

## CLI 调用

### 图片处理

```
python3 {baseDir}/cli.py content image --image-url "URL" --operation 操作
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --image-url | 必填 | 图片URL |
| --operation | 必填 | 操作类型 |

**操作类型**：
- `translate`：图片翻译
- `enhance`：图片优化
- `remove_bg`：背景去除
- `try_on`：虚拟试衣

### 文本生成

```
python3 {baseDir}/cli.py content text --product-name "商品名" [--language 语言] [--purpose 用途]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --product-name | 必填 | 商品名称 |
| --language | en | 目标语言 |
| --purpose | listing | 用途 |

**用途类型**：
- `listing`：商品标题
- `description`：商品描述
- `tagline`：卖点文案

### 文本翻译

```
python3 {baseDir}/cli.py content translate --text "文本" --target-lang 语言
```

| 参数 | 默认 | 说明 |
|------|------|------|
| --text | 必填 | 待翻译文本 |
| --target-lang | 必填 | 目标语言 |

## 输出结构

### 图片处理

```json
{
  "success": true,
  "markdown": "### 图片翻译完成\n\n![处理结果](url)\n\n[点击下载](url)",
  "data": {
    "result_url": "https://...",
    "operation": "translate"
  }
}
```

### 文本生成

```json
{
  "success": true,
  "markdown": "### 商品标题生成\n\n---\n\n生成的标题内容...\n\n---",
  "data": {
    "content": "生成的标题内容...",
    "language": "en",
    "purpose": "listing"
  }
}
```

### 文本翻译

```json
{
  "success": true,
  "markdown": "### 翻译结果\n\n**原文**: xxx\n\n**译文**:\n\n翻译后的内容...",
  "data": {
    "original": "...",
    "translated": "...",
    "target_lang": "en"
  }
}
```

## 异常处理

| 场景 | 表现 | Agent 应对 |
|------|------|-----------|
| 图片处理失败 | success: false | 检查图片URL是否可访问 |
| 文本生成失败 | success: false | 简化商品名称后重试 |
| 翻译失败 | success: false | 检查文本长度是否超限 |

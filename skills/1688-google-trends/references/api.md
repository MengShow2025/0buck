# Google Trends 趋势分析 API 参考

## 概述

本文档提供 Google Trends 趋势分析 API 的详细技术参考。

## HSF 接口

### 服务信息

- **服务名称**: `com.alibaba.global1688.ai.sel.api.hsf.OppSelectionHsfService`
- **接口版本**: `1.0.0`
- **协议**: HSF

### 方法定义

```java
ApiResultModel<GoogleTrendsReportExecuteApiResponse> googleTrendsReportExecuteApi(
    GoogleTrendsReportExecuteApiRequest request,
    String userId
)
```

## 请求模型

### GoogleTrendsReportExecuteApiRequest

```java
public class GoogleTrendsReportExecuteApiRequest {
    /**
     * 关键词列表（最多5个）
     */
    private List<String> keywords;

    /**
     * 目标区域代码（两位国家代码）
     */
    private String region;

    /**
     * 查询月份（可选，格式：yyyy-MM）
     */
    private String queryMonth;
}
```

#### 字段说明

| 字段名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| keywords | List&lt;String&gt; | 是 | 关键词列表，最多5个 |
| region | String | 是 | 目标区域代码（ISO 3166-1 alpha-2） |
| queryMonth | String | 否 | 查询月份（格式：yyyy-MM），不指定则查询近12个月 |

## 响应模型

### ApiResultModel&lt;GoogleTrendsReportExecuteApiResponse&gt;

```java
public class ApiResultModel<T> {
    /**
     * 是否成功
     */
    private Boolean success;

    /**
     * 状态码
     */
    private String code;

    /**
     * 消息
     */
    private String msg;

    /**
     * 响应数据
     */
    private T data;
}
```

### GoogleTrendsReportExecuteApiResponse

```java
public class GoogleTrendsReportExecuteApiResponse {
    /**
     * Google Trends 信息列表
     */
    private List<GoogleTrendsInfoVO> trendsList;
}
```

### GoogleTrendsInfoVO

```java
public class GoogleTrendsInfoVO {
    /**
     * 关键词
     */
    private String keyword;

    /**
     * 趋势数据（时间序列字符串）
     * 格式："2025-03: 45, 2025-04: 52, ..."
     */
    private String trendData;

    /**
     * 峰值搜索月（格式：yyyy-MM）
     */
    private String heatMonth;
}
```

## 状态码

| 状态码 | 说明 |
|--------|------|
| SUCCESS | 操作成功 |
| REQUEST_PARAM_EMPTY | 请求参数为空 |
| KEYWORD_EMPTY | 关键词列表为空 |
| REQUEST_PARAM_ILLEGAL | 请求参数不合法 |
| TARGET_COUNTRY_EMPTY | 目标区域为空 |
| TARGET_COUNTRY_ILLEGAL | 目标区域代码格式错误 |
| GOOGLE_TRENDS_QUERY_FAILED | Google Trends 查询失败 |

## 使用示例

### Java 调用示例

```java
import com.alibaba.global1688.ai.sel.api.hsf.OppSelectionHsfService;
import com.alibaba.global1688.ai.sel.api.hsf.request.GoogleTrendsReportExecuteApiRequest;
import com.alibaba.global1688.ai.sel.api.hsf.response.ApiResultModel;
import com.alibaba.global1688.ai.sel.api.hsf.response.GoogleTrendsReportExecuteApiResponse;
import com.alibaba.global1688.ai.sel.api.hsf.response.GoogleTrendsInfoVO;

import java.util.Arrays;

public class GoogleTrendsExample {

    private OppSelectionHsfService oppSelectionHsfService;

    public void queryGoogleTrends() {
        // 1. 构建请求
        GoogleTrendsReportExecuteApiRequest request = GoogleTrendsReportExecuteApiRequest.builder()
            .keywords(Arrays.asList("wireless earbuds", "bluetooth headphones"))
            .region("US")
            .build();

        // 2. 调用接口
        ApiResultModel<GoogleTrendsReportExecuteApiResponse> result =
            oppSelectionHsfService.googleTrendsReportExecuteApi(request, "userId123");

        // 3. 处理响应
        if (result.isSuccess()) {
            GoogleTrendsReportExecuteApiResponse response = result.getData();
            for (GoogleTrendsInfoVO trends : response.getTrendsList()) {
                System.out.println("关键词: " + trends.getKeyword());
                System.out.println("趋势数据: " + trends.getTrendData());
                System.out.println("峰值月份: " + trends.getHeatMonth());
                System.out.println();
            }
        } else {
            System.err.println("查询失败: " + result.getMsg());
            System.err.println("错误代码: " + result.getCode());
        }
    }
}
```

### 请求示例 (JSON)

```json
{
    "keywords": [
        "wireless earbuds",
        "bluetooth headphones"
    ],
    "region": "US"
}
```

### 响应示例 (JSON)

```json
{
    "success": true,
    "code": "SUCCESS",
    "msg": "操作成功",
    "data": {
        "trendsList": [
            {
                "keyword": "wireless earbuds",
                "trendData": "2025-03: 45, 2025-04: 52, 2025-05: 60, 2025-06: 58, 2025-07: 55, 2025-08: 62, 2025-09: 68, 2025-10: 72, 2025-11: 85, 2025-12: 100, 2026-01: 78, 2026-02: 65",
                "heatMonth": "2025-12"
            },
            {
                "keyword": "bluetooth headphones",
                "trendData": "2025-03: 42, 2025-04: 48, 2025-05: 55, 2025-06: 52, 2025-07: 50, 2025-08: 58, 2025-09: 65, 2025-10: 70, 2025-11: 82, 2025-12: 100, 2026-01: 75, 2026-02: 62",
                "heatMonth": "2025-12"
            }
        ]
    }
}
```

## 技术细节

### 数据来源
- Google Trends API
- 数据更新频率：每日更新
- 数据延迟：1-3天

### 性能指标
- 单次查询响应时间：< 5秒（P99）
- 批量查询（5个关键词）：< 8秒（P99）
- 并发支持：根据系统限流配置

### 限制说明
1. **关键词数量**：最多5个关键词/次
2. **查询频率**：建议控制查询频率，避免频繁调用
3. **数据范围**：默认近12个月数据

## 注意事项

1. **区域代码**：必须使用标准的 ISO 3166-1 alpha-2 代码
2. **关键词语言**：建议使用目标市场的主要语言
3. **数据解读**：趋势数据是相对值，需结合业务数据综合判断
4. **错误处理**：实现适当的重试机制和降级方案

## 相关文档

- [Google Trends 报告 API 完整文档](../../global-1688-ai-sel/docs/api/google-trends-report-api.md)
- [测试方案](../../global-1688-ai-sel/docs/test/google-trends-report-test-plan.md)
- [SKILL 使用说明](../SKILL.md)

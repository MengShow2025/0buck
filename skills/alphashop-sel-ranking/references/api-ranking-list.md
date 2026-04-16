# 榜单服务 API 文档

## 变更历史

| 版本 | 变更说明 | 变更时间 |
|------|---------|---------|
| V1.0 | 上线 | 2026-03-24 |

---

## 接口概述

本文档描述了 1688 选品系统的榜单服务 API，提供关键词榜单、商品榜单和类目查询功能。

**API 基础信息**:
- **请求方式**: POST
- **Content-Type**: application/json
- **响应耗时**: 5秒内
- **API 前缀**: https://api.alphashop.cn/ai.agent.global1688.sel

---

## 接口列表

### 1. 获取总榜列表 API

#### 接口概述
- **接口名称**: 获取总榜列表
- **接口功能**: 返回关键词榜单和商品榜单的元数据配置，包含榜单标题、子榜单列表、平台国家映射等信息
- **请求方式**: POST
- **Endpoint**: `https://api.alphashop.cn/ai.agent.global1688.sel.getOverallList/1.0`

#### 入参

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| userId | Long | 是 | 用户ID | 123456 |
| platform | String | 是 | 平台标识（amazon/tiktok，小写） | "amazon" |
| country | String | 是 | 国家代码（大写） | "US" |

**入参约束**:
- platform 合法值: `amazon`, `tiktok`
- country 合法值根据 platform 不同而不同:
  - **Amazon**: US, GB, ES, FR, DE, IT, CA, JP
  - **TikTok**: ID, VN, MY, TH, PH, US, SG, BR, MX, GB, ES, FR, DE, IT, JP

#### 出参

返回数组包含两个榜单配置对象:
1. **机会赛道榜** (关键词榜)
2. **全网商品榜** (商品榜)

**外层结构**:
```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": [
    { /* 商品榜配置 */ },
    { /* 关键词榜配置 */ }
  ]
}
```

**榜单配置对象结构**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| listTitle | String | 总榜单标题 |
| hoverText | String | 总榜单描述（悬浮提示） |
| rankingList | Array | 子榜单列表 |
| platformCountryMapping | Array | 平台国家映射 |
| categoryData | Object | 类目信息（可选） |

**rankingList 子榜单结构**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| rankingType | String | 榜单类型代码 |
| rankingName | String | 榜单名称 |
| updateTime | String | 更新时间（格式: YYYY-MM-DD HH:mm:ss） |

**platformCountryMapping 平台国家映射**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| platform | String | 平台代码 (amazon/tiktok) |
| platformCn | String | 平台中文名称 |
| countryList | Array | 支持的国家列表 |

**countryList 国家信息**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| code | String | 国家代码 |
| name | String | 国家中文名称 |

#### 响应示例

```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": [
    {
      "listTitle": "全网商品榜",
      "hoverText": "基于销量、评分等多维度筛选的优质商品榜单",
      "rankingList": [
        {
          "rankingType": "HOT_SELL_LIST",
          "rankingName": "热销榜",
          "updateTime": "2026-03-23 10:00:00"
        },
        {
          "rankingType": "SALE_GROW_LIST",
          "rankingName": "销量飙升榜",
          "updateTime": "2026-03-23 10:00:00"
        },
        {
          "rankingType": "NEW_ITM_LIST",
          "rankingName": "趋势新品榜",
          "updateTime": "2026-03-23 10:00:00"
        },
        {
          "rankingType": "IMPROVE_LIST",
          "rankingName": "微创新机会榜",
          "updateTime": "2026-03-23 10:00:00"
        }
      ],
      "platformCountryMapping": [
        {
          "platform": "amazon",
          "platformCn": "亚马逊",
          "countryList": [
            {"code": "US", "name": "美国"},
            {"code": "GB", "name": "英国"},
            {"code": "DE", "name": "德国"}
          ]
        },
        {
          "platform": "tiktok",
          "platformCn": "TikTok",
          "countryList": [
            {"code": "US", "name": "美国"},
            {"code": "ID", "name": "印度尼西亚"}
          ]
        }
      ]
    },
    {
      "listTitle": "机会赛道榜",
      "hoverText": "基于市场机会分析的关键词榜单",
      "rankingList": [
        {
          "rankingType": "sold_cnt",
          "rankingName": "热销词榜",
          "updateTime": "2026-03-23 10:00:00"
        },
        {
          "rankingType": "new_itm",
          "rankingName": "蓝海词榜",
          "updateTime": "2026-03-23 10:00:00"
        }
      ],
      "platformCountryMapping": [ /* 同上 */ ]
    }
  ]
}
```

---

### 2. 查询关键词榜单明细 API

#### 接口概述
- **接口名称**: 查询关键词榜单明细
- **接口功能**: 根据平台、国家、类目和榜单类型查询关键词榜单的详细数据，包含关键词市场指标、销售数据、商品图片等
- **请求方式**: POST
- **Endpoint**: `https://api.alphashop.cn/ai.agent.global1688.sel.getKeywordList/1.0`
- **特别说明**:
  - 榜单采用**随机洗牌策略**，每次查询结果顺序可能不同，避免榜单固化
  - 候选池500个关键词，展示前100个

#### 入参

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| userId | Long | 是 | 用户ID | 123456 |
| platform | String | 是 | 平台标识（amazon/tiktok） | "amazon" |
| country | String | 是 | 国家代码 | "US" |
| cateId | String | 是 | 类目ID（一级类目） | "123456" |
| rankingType | String | 是 | 榜单类型（见附录） | "sold_cnt" |
| cateName | String | 否 | 类目名称 | "Clothing" |
| cateLevel | String | 否 | 类目层级（关键词榜单固定为1） | "1" |

**入参约束**:
- **关键词榜单仅支持一级类目**（cateLevel 固定为 "1"）
- rankingType 合法值:
  - `sold_cnt` - 热销词榜
  - `new_itm` - 蓝海词榜

#### 出参

**外层结构**:
```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": [
    { /* 关键词详情1 */ },
    { /* 关键词详情2 */ }
  ]
}
```

**关键词详情结构**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| keyword | String | 关键词（英文） |
| keywordCn | String | 关键词（中文） |
| platform | String | 平台标识 |
| country | String | 国家代码 |
| oppScore | String | 机会分（数值越高机会越大） |
| oppScoreDesc | String | 机会分描述 |
| rank | String | 榜单排名 |
| priceAvg | PropertyVO | 平均价格 |
| itemCount | PropertyVO | 在售商品数 |
| brandMonopolyCoefficient | PropertyVO | 品牌垄断系数（TikTok无此字段） |
| cnSellerPct | PropertyVO | 中国卖家占比（TikTok无此字段） |
| newProductSalesPct | PropertyVO | 新品销售占比 |
| soldCnt30d | PropertyVO | 30天销量 |
| soldCnt30dGrowthRate | PropertyVO | 30天销量环比 |
| marketHeatLevel | PropertyVO | 市场搜索指数 |
| marketHeatGrowthLevel | PropertyVO | 市场搜索增速 |
| marketCompeteLevel | PropertyVO | 市场竞争指数 |
| productImgList | Array[String] | 商品图片列表（最多3张） |

**PropertyVO 属性结构**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| name | String | 属性名称 |
| desc | String | 属性描述 |
| value | String | 属性值 |

#### 响应示例

```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": [
    {
      "keyword": "yoga pants",
      "keywordCn": "瑜伽裤",
      "platform": "amazon",
      "country": "US",
      "oppScore": "42.5",
      "oppScoreDesc": "击败同一级类目85.3%关键词",
      "rank": "1",
      "priceAvg": {
        "name": "平均价格",
        "desc": "该关键词下商品的平均售价",
        "value": "US$25.99"
      },
      "itemCount": {
        "name": "商品量",
        "desc": "亚马逊在售商品数量",
        "value": "15K"
      },
      "brandMonopolyCoefficient": {
        "name": "品牌垄断系数",
        "desc": "TOP3品牌销售额占比",
        "value": "35%"
      },
      "cnSellerPct": {
        "name": "中国卖家占比",
        "desc": "中国卖家数量占比",
        "value": "68%"
      },
      "newProductSalesPct": {
        "name": "新品垄断系数",
        "desc": "新品(上架180天内)销售额占比",
        "value": "12%"
      },
      "soldCnt30d": {
        "name": "月销量",
        "desc": "近30天累计销量",
        "value": "113.7K"
      },
      "soldCnt30dGrowthRate": {
        "name": "月销量环比",
        "desc": "近30天销量与上期相比的增长率",
        "value": "15%"
      },
      "marketHeatLevel": {
        "name": "高热度",
        "value": "HIGH"
      },
      "marketHeatGrowthLevel": {
        "name": "快速增长",
        "value": "FAST_GROWTH"
      },
      "marketCompeteLevel": {
        "name": "中等竞争",
        "value": "MEDIUM"
      },
      "productImgList": [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
        "https://example.com/img3.jpg"
      ]
    }
  ]
}
```

---

### 3. 查询商品榜单明细 API

#### 接口概述
- **接口名称**: 查询商品榜单明细
- **接口功能**: 根据平台、国家、类目层级和榜单类型查询商品榜单的详细数据，包含商品基本信息、销售数据、评分等
- **请求方式**: POST
- **Endpoint**: `https://api.alphashop.cn/ai.agent.global1688.sel.getProductList/1.0`
- **特别说明**:
  - 榜单采用**随机洗牌策略**，每次查询结果顺序可能不同
  - 候选池大小根据类目层级动态调整:
    - 一级类目: 候选池500，展示100
    - 二级类目: 候选池200，展示50
    - 三级类目: 候选池100，展示30

#### 入参

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| userId | Long | 是 | 用户ID | 123456 |
| platform | String | 是 | 平台标识（amazon/tiktok） | "amazon" |
| country | String | 是 | 国家代码 | "US" |
| rankingType | String | 是 | 榜单类型（见附录） | "HOT_SELL_LIST" |
| cateId | String | 否 | 类目ID | "123456" |
| cateName | String | 否 | 类目名称 | "Clothing" |
| cateLevel | String | 否 | 类目层级（1/2/3） | "1" |

**入参约束**:
- rankingType 合法值:
  - `HOT_SELL_LIST` - 热销榜
  - `SALE_GROW_LIST` - 销量飙升榜
  - `NEW_ITM_LIST` - 趋势新品榜
  - `IMPROVE_LIST` - 微创新机会榜

#### 出参

**外层结构**:
```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": [
    { /* 商品详情1 */ },
    { /* 商品详情2 */ }
  ]
}
```

**商品详情结构**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| platform | String | 平台标识 |
| country | String | 国家代码 |
| productId | String | 商品ID (ASIN/商品编号) |
| productImg | String | 商品主图URL |
| productTitle | String | 商品标题 |
| productUrl | String | 商品详情页链接 |
| oppScore | String | 机会分 |
| oppScoreDesc | String | 机会分描述 |
| soldCnt | PropertyVO | 月销量 |
| soldCntGrowthRate | PropertyVO | 月销量环比 |
| sameItemCnt | PropertyVO | 下游同款数 |
| rating | PropertyVO | 评分 |
| reviewCnt | String | 评论数 |
| launchTime | String | 上架时间（格式: YYYY/MM/DD） |
| price | String | 价格（带货币符号） |
| ranking | String | 榜单排名 |
| productTag | String | 商品标签 |

#### 响应示例

```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": [
    {
      "platform": "amazon",
      "country": "US",
      "productId": "B0ABC12345",
      "productImg": "https://m.media-amazon.com/images/I/example.jpg",
      "productTitle": "Women's High Waist Yoga Pants - Tummy Control",
      "productUrl": "https://www.amazon.com/dp/B0ABC12345",
      "oppScore": "78.5",
      "oppScoreDesc": "",
      "soldCnt": {
        "name": "月销量",
        "desc": "近30天累计销量",
        "value": "5.2K"
      },
      "soldCntGrowthRate": {
        "name": "月销量环比",
        "value": "125%"
      },
      "sameItemCnt": {
        "name": "下游同款数",
        "value": "8"
      },
      "rating": {
        "name": "评分",
        "value": "4.5"
      },
      "reviewCnt": "1523",
      "launchTime": "2025/10/15",
      "price": "US$29.99",
      "ranking": "1",
      "productTag": ""
    }
  ]
}
```

---

### 4. 查询商品类目 API

#### 接口概述
- **接口名称**: 查询商品类目
- **接口功能**: 获取指定平台和国家的商品类目树结构（最多3层），按商品数量降序排列
- **请求方式**: POST
- **Endpoint**: `https://api.alphashop.cn/ai.agent.global1688.sel.getProductCategory/1.0`
- **特别说明**:
  - 类目采用**轮播策略**，当前轮播的类目会排在最前面
  - 过滤掉类目ID为 265523 的一级类目

#### 入参

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| userId | Long | 是 | 用户ID | 123456 |
| platform | String | 是 | 平台标识（amazon/tiktok） | "amazon" |
| country | String | 是 | 国家代码 | "US" |

#### 出参

**外层结构**:
```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": {
    "categories": [ /* 类目树数组 */ ]
  }
}
```

**类目节点结构**（支持递归嵌套）:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| cateId | String | 类目ID |
| cateName | String | 类目名称（英文） |
| cateNameCn | String | 类目名称（中文） |
| level | Integer | 类目层级（1/2/3） |
| count | Long | 该类目下的商品数（包含子类目） |
| order | Integer | 排序值（可为null） |
| children | Array | 子类目列表（三级类目为null） |

#### 响应示例

```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": {
    "categories": [
      {
        "cateId": "1001",
        "cateName": "Clothing, Shoes & Jewelry",
        "cateNameCn": "服装鞋包",
        "level": 1,
        "count": 125000,
        "order": null,
        "children": [
          {
            "cateId": "1001-01",
            "cateName": "Women's Clothing",
            "cateNameCn": "女装",
            "level": 2,
            "count": 85000,
            "order": null,
            "children": [
              {
                "cateId": "1001-01-01",
                "cateName": "Activewear",
                "cateNameCn": "运动装",
                "level": 3,
                "count": 15000,
                "order": null,
                "children": null
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

### 5. 查询关键词类目 API

#### 接口概述
- **接口名称**: 查询关键词类目
- **接口功能**: 获取指定平台和国家的关键词类目列表（仅一级类目），按关键词数量降序排列
- **请求方式**: POST
- **Endpoint**: `https://api.alphashop.cn/ai.agent.global1688.sel.getKeywordCategory/1.0`
- **特别说明**:
  - 仅返回**一级类目**
  - 过滤掉关键词数量小于5的类目
  - 类目采用**轮播策略**，当前轮播的类目会排在最前面

#### 入参

| 字段 | 类型 | 必填 | 说明 | 示例值 |
|------|------|------|------|--------|
| userId | Long | 是 | 用户ID | 123456 |
| platform | String | 是 | 平台标识（amazon/tiktok） | "amazon" |
| country | String | 是 | 国家代码 | "US" |

#### 出参

**外层结构**:
```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": {
    "categories": [ /* 类目数组 */ ]
  }
}
```

**类目结构**:

| 字段 | 数据类型 | 说明 |
|------|---------|------|
| cateId | String | 类目ID |
| cateName | String | 类目名称（英文） |
| cateNameCn | String | 类目名称（中文，可能为空） |
| level | Integer | 类目层级（固定为1） |
| count | Integer | 该类目下的关键词数量 |
| children | Array | 子类目列表（固定为null） |

#### 响应示例

```json
{
  "success": true,
  "code": "SUCCESS",
  "msg": "",
  "model": {
    "categories": [
      {
        "cateId": "2001",
        "cateName": "Clothing",
        "cateNameCn": "",
        "level": 1,
        "count": 1580,
        "children": null
      },
      {
        "cateId": "2002",
        "cateName": "Home & Kitchen",
        "cateNameCn": "",
        "level": 1,
        "count": 1250,
        "children": null
      }
    ]
  }
}
```

---

## 附录

### 响应码枚举

| 响应码 | 响应码描述 | message |
|--------|-----------|---------|
| SUCCESS | 执行成功 | 执行成功 |
| REQUEST_PARAM_EMPTY | 请求参数为空 | 请求参数不能为空 |
| platform or country is empty! | 平台或国家为空 | platform or country is empty! |
| cateId is empty! | 类目ID为空 | cateId is empty! |
| rankingType is empty! | 榜单类型为空 | rankingType is empty! |
| Invalid ranking type | 榜单类型不合法 | Invalid ranking type: {rankingType} |
| Invalid country code | 国家代码不合法 | Invalid country code: {country} |

### 平台国家支持表

#### Amazon 平台支持的国家

| 国家代码 | 国家名称 |
|---------|---------|
| US | 美国 |
| GB | 英国 |
| ES | 西班牙 |
| FR | 法国 |
| DE | 德国 |
| IT | 意大利 |
| CA | 加拿大 |
| JP | 日本 |

#### TikTok 平台支持的国家

| 国家代码 | 国家名称 |
|---------|---------|
| ID | 印度尼西亚 |
| VN | 越南 |
| MY | 马来西亚 |
| TH | 泰国 |
| PH | 菲律宾 |
| US | 美国 |
| SG | 新加坡 |
| BR | 巴西 |
| MX | 墨西哥 |
| GB | 英国 |
| ES | 西班牙 |
| FR | 法国 |
| DE | 德国 |
| IT | 意大利 |
| JP | 日本 |

### 榜单类型说明

#### 商品维度榜单

| 榜单类型 | 代码 | 说明 | 适用场景 |
|---------|------|------|---------|
| 热销榜 | HOT_SELL_LIST | 验证过的成熟爆款 | 适合跟卖或寻找供应链 |
| 销量飙升榜 | SALE_GROW_LIST | 短期爆发型商品 | 适合捕捉季节性趋势或网红效应 |
| 趋势新品榜 | NEW_ITM_LIST | 处于上升期的新潜力股 | 适合早期切入 |
| 微创新机会榜 | IMPROVE_LIST | 存在痛点改进空间的高销商品 | 适合差异化开发 |

#### 关键词维度榜单

| 榜单类型 | 代码 | 说明 | 适用场景 |
|---------|------|------|---------|
| 热销词榜 | sold_cnt | 高流量大词 | 适合投放广告或SEO布局 |
| 蓝海词榜 | new_itm | 高需求低竞争词 | 适合中小卖家突围 |

### 特殊策略说明

#### 1. 随机洗牌策略
- **适用接口**: getKeywordList、getProductList
- **目的**: 避免榜单固化，给更多商品/关键词展示机会
- **实现**: 从候选池中随机抽取指定数量的结果
- **影响**: 每次查询相同参数，返回的榜单顺序可能不同

#### 2. 类目轮播策略
- **适用接口**: getProductCategory、getKeywordCategory
- **目的**: 根据时间段轮播展示不同类目，避免首位类目过度曝光
- **实现**: 基于当前时段计算轮播索引，将对应类目排在第一位
- **影响**: 不同时间段查询，类目排序可能不同

#### 3. 候选池配置

**关键词榜单**:
- 候选池大小: 500
- 展示数量: 100
- 仅支持一级类目

**商品榜单**:
| 类目层级 | 候选池大小 | 展示数量 |
|---------|-----------|---------|
| 一级类目 | 500 | 100 |
| 二级类目 | 200 | 50 |
| 三级类目 | 100 | 30 |

---

## 注意事项

1. **响应时间**: 所有接口响应时间在5秒内
2. **数据更新**: 榜单数据每天更新，updateTime 字段显示上次更新时间
3. **数据量**:
   - 关键词榜单返回最多100条
   - 商品榜单返回最多30-100条（根据类目层级）
   - 类目树最多3层
4. **平台差异**: Amazon 和 TikTok 的部分字段不同（如 brandMonopolyCoefficient、cnSellerPct 仅 Amazon 有）
5. **类目限制**:
   - 关键词榜单仅支持一级类目
   - 商品榜单支持1-3级类目
6. **随机性**: 由于随机洗牌策略，相同查询参数多次请求可能返回不同的结果顺序

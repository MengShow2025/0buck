```mermaid
graph TD
    subgraph Frontend (自定义前端 UI - Next.js/React)
        FE[用户交互 (浏览, 搜索, 对话, 购物)] --> FE_SFAPI(Shopify Storefront API)
        FE --> FE_CB(自定义后端 API - AI/规则)
    end

    subgraph Shopify (Shopify 平台 - 核心商业逻辑层)
        direction LR
        SFAPI(Storefront API) --> SF_B(Shopify Core Backend)
        ADMAPI(Admin API) --> SF_B
        WEBHOOKS(Webhooks) --> SF_B
        SF_B -- 产品, 订单, 客户管理 --> SF_DB(Shopify 数据库)
    end

    subgraph Custom Backend (自定义后端 - AI代理层 & 集成编排层)
        direction LR
        CB_R(AI代理层: 意图识别, 多轮对话, 规则引擎)
        CB_PROD(产品数据处理: 抓取, 翻译, 定价)
        CB_ORD(订单履约: 1688采购, 物流追踪)
        CB_PAY(支付协调: WorldFirst)
        CB_KG(知识图谱/知识库服务)

        CB_R -- AI查询 --> QD(Qdrant 向量数据库)
        CB_R -- 商品/订单数据 --> CB_PROD
        CB_R -- 知识查询 --> CB_KG
        CB_PROD -- 定时同步/管理 --> ADMAPI
        CB_PROD -- 定时抓取 --> Alibaba[1688/阿里巴巴 API]
        WEBHOOKS -- 订单事件 --> CB_ORD
        CB_ORD -- 采购指令 --> Alibaba
        CB_ORD -- 物流更新 --> ADMAPI
        CB_ORD -- 支付 --> WF(WorldFirst API)
        CB_ORD -- 物流追踪 --> ShippyPro[ShippyPro API]
        CB_PROD -- 数据存储 --> CB_DB(自定义后端数据库)
        CB_R -- 数据存储 --> CB_DB
        CB_KG -- 数据存储 --> CB_DB
    end

    FE_SFAPI --> SFAPI
    FE_CB --> CB_R
    CB_R --> ADMAPI
    CB_PROD --> ADMAPI
    CB_ORD --> ADMAPI

    Alibaba -- 商品数据 --> CB_PROD
    ShippyPro -- 物流数据 --> CB_ORD

    style Frontend fill:#e0f7fa,stroke:#0097a7,stroke-width:2px,color:#000
    style Shopify fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#000
    style Custom Backend fill:#e8f5e9,stroke:#4caf50,stroke-width:2px,color:#000
    style QD fill:#f3e5f5,stroke:#9c27b0,stroke-width:1px,color:#000
    style Alibaba fill:#ffebee,stroke:#f44336,stroke-width:1px,color:#000
    style WF fill:#e3f2fd,stroke:#2196f3,stroke-width:1px,color:#000
    style ShippyPro fill:#e3f2fd,stroke:#2196f3,stroke-width:1px,color:#000
    style CB_DB fill:#f0f4c3,stroke:#cddc39,stroke-width:1px,color:#000
    style SF_DB fill:#f0f4c3,stroke:#cddc39,stroke-width:1px,color:#000
```

---

**流程图解释：**

1.  **自定义前端 UI (Frontend):**
    *   用户通过自定义 UI 进行各种交互，如浏览商品、AI 对话、下单等。
    *   **FE --> FE_SFAPI (Shopify Storefront API):** 对于直接与电商核心功能（如显示产品详情、添加到购物车、客户登录）相关的请求，前端直接调用 Shopify 的 Storefront API。
    *   **FE --> FE_CB (自定义后端 API - AI/规则):** 对于需要 AI 处理（如对话、推荐）、执行自定义销售规则（如复杂定价、奖励计算）或触发 1688 自动采购的功能，前端调用自定义后端提供的 API。

2.  **Shopify 平台 (Shopify):**
    *   **Shopify Core Backend (SF_B):** Shopify 的核心系统，管理产品、订单、客户、支付等核心电商数据。
    *   **Storefront API (SFAPI):** 供您的自定义前端查询公开数据（产品、集合）和执行购物车/结账流程。
    *   **Admin API (ADMAPI):** 供您的自定义后端管理 Shopify 内部数据，如创建产品、更新订单状态、管理库存、创建折扣码等。
    *   **Webhooks (WEBHOOKS):** Shopify 在特定事件发生时（如新订单创建、订单状态更新）向您的自定义后端发送通知，实现实时数据同步。

3.  **自定义后端 (Custom Backend - 编排层/AI层):**
    *   **AI 代理层 (CB_R):**
        *   处理前端发来的 AI 相关的请求（用户对话、图片识别找货、推荐等）。
        *   **CB_R --> QD (Qdrant 向量数据库):** AI 代理层进行向量检索，以实现商品匹配、知识库 RAG 等功能。
        *   **CB_R --> ADMAPI:** AI 代理可能会根据其逻辑更新 Shopify 的数据（例如，更新客户标签以优化推荐）。
    *   **产品数据处理 (CB_PROD):**
        *   **CB_PROD --> Alibaba [1688/阿里巴巴 API]:** 定期从 1688/阿里巴巴 API 抓取商品数据。
        *   对抓取到的数据进行清洗、AI 翻译、定价（差价策略）等处理。
        *   **CB_PROD --> ADMAPI:** 将处理后的商品数据通过 Shopify Admin API 同步到 Shopify（作为 Shopify 产品，并使用 Metafields 存储 1688 原始信息）。
    *   **订单履约 (CB_ORD):**
        *   **WEBHOOKS --> CB_ORD:** 接收 Shopify 发送的订单创建 Webhook 通知。
        *   **CB_ORD --> Alibaba:** 根据 Shopify 订单信息，触发 1688/阿里巴巴的自动采购和下单。
        *   **CB_ORD --> WF (WorldFirst API):** 协调支付给 1688/阿里巴巴的供应商。
        *   **CB_ORD --> ShippyPro [ShippyPro API]:** 集成物流 API，获取物流追踪信息。
        *   **CB_ORD --> ADMAPI:** 更新 Shopify 订单的履行状态和物流追踪号。
    *   **CB_DB (自定义后端数据库):** 存储 AI 代理的上下文、用户样式护照、1688 原始商品数据、自定义销售规则等 Shopify 原生不支持或不便存储的数据。

4.  **外部服务:**
    *   **Qdrant 向量数据库 (QD):** 存储多模态商品向量、知识库向量，供 AI 代理快速检索。
    *   **1688/阿里巴巴 API (Alibaba):** 商品数据源和自动采购目标。
    *   **WorldFirst API (WF):** 用于向 1688/阿里巴巴供应商结算。
    *   **ShippyPro API (ShippyPro):** 用于集成多种物流服务商，提供物流追踪。

这个流程图展示了一个复杂但解耦的架构，允许您最大限度地定制用户体验和业务逻辑，同时利用 Shopify 作为稳定的电商核心。
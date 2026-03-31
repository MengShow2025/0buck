# AI Agentic Orchestration Layer Design - 0buck

## 1. Overview
The AI layer for 0buck is a stateful multi-agent system built on **LangGraph**. It acts as the brain of the platform, processing natural language and multimodal inputs (images, links) to deliver a "conversational commerce" experience.

## 2. Core Architecture: LangGraph State Machine

### 2.1 State Schema (`AgentState`)
The state persists throughout the conversation and guides the routing.

```python
from typing import Annotated, Any, Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    # Standard message history
    messages: Annotated[list[BaseMessage], add_messages]
    
    # Intent classification results
    intent: str  # search | order | kb | promo | cart | chat
    confidence: float
    
    # Entity extraction
    query_params: Dict[str, Any]  # e.g., {"product_type": "chair", "color": "blue"}
    image_features: Optional[List[float]]  # Multimodal embedding
    
    # Domain-specific data
    search_results: List[Dict[str, Any]]
    order_info: Optional[Dict[str, Any]]
    user_style_passport: Dict[str, Any]
    
    # Flow control
    next_node: str
```

### 2.2 Graph Nodes

1.  **`SupervisorNode` (Intent Router)**:
    *   **Logic**: Uses a high-reasoning LLM (Claude 3.5 Sonnet / GPT-4o) to analyze `messages[-1]` and any uploaded images.
    *   **Output**: Sets `intent` and routes to the appropriate specialist agent.
    *   **Multimodal**: If an image is present, it invokes the Vision API to describe or vectorize the input.

2.  **`ProductRetrievalAgent`**:
    *   **Logic**: Performs a hybrid search (Semantic + Keyword + Visual) in **Qdrant**.
    *   **Tool**: `QdrantSearchTool`.
    *   **Source**: Only returns products synchronized from 1688 and active in Shopify.

3.  **`OrderManagementAgent`**:
    *   **Logic**: Interacts with Shopify Storefront API and the Custom Backend's Fulfillment service.
    *   **Tool**: `ShopifyAdminTool`, `LogisticsTrackerTool`.
    *   **Function**: Returns real-time 1688 tracking and Shopify order status.

4.  **`KnowledgeBaseAgent` (RAG)**:
    *   **Logic**: Retrieves internal documentation (Refund policy, Shipping FAQs, Activities).
    *   **Tool**: `VectorStoreRetriever`.

5.  **`CartOrchestrator`**:
    *   **Logic**: Manages the Shopify Checkout flow.
    *   **Action**: Generates `checkout_url` for the user to finish payment on Shopify's secure page.

6.  **`OutputFormatter`**:
    *   **Logic**: Prepares the final response.
    *   **Generative UI**: Returns structured JSON (e.g., `type: "product_carousel"`) that the Next.js frontend renders as interactive cards.

### 2.3 Conditional Edges
*   `Supervisor` -> `RetrievalAgent` (if searching products)
*   `Supervisor` -> `OrderAgent` (if checking status)
*   `Supervisor` -> `KBAgent` (if asking questions)
*   `RetrievalAgent` -> `OutputFormatter` (to show products)

## 3. Technical Selection

| Component | Technology | Reason |
| :--- | :--- | :--- |
| **Orchestration** | LangGraph (Python) | Support for cyclic graphs, persistence, and complex state management. |
| **LLM** | Claude 3.5 Sonnet / GPT-4o | Best-in-class reasoning and tool calling. |
| **Vision/Multimodal** | Gemini 1.5 Pro / SigLIP | Native large-context multimodal support for product matching. |
| **Vector DB** | Qdrant | Fast metadata filtering (Shopify Variant IDs, Price ranges). |
| **Embeddings** | SigLIP (Multimodal) | Joint embedding for text and images to enable visual search. |
| **Persistence** | Redis Checkpointer | Seamless state recovery across different WhatsApp/Web sessions. |

## 4. Multimodal Search Workflow
1.  **Input**: User sends an image of a lamp.
2.  **Embedding**: Custom backend (or inference API) generates a 768-dim SigLIP vector.
3.  **Qdrant**: `vector_search` finds the Top 5 similar 1688 products in the database.
4.  **Shopify Check**: Agent filters products to ensure they are "active" and have "inventory" in Shopify.
5.  **UI**: Agent returns a `ProductCarousel` card with "Match Confidence" and "Buy Now" links.

## 5. Next Steps
1.  **Implementation**: Create the base `StateGraph` in `backend/app/core/ai_graph.py`.
2.  **Tool Integration**: Define tools for Shopify and Qdrant.
3.  **Evaluation**: Set up a test suite for intent classification accuracy.

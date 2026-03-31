from typing import Annotated, Any, Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from app.core.ai_tools import all_ai_tools, multimodal_search

class AgentState(TypedDict):
    """LangGraph 状态定义"""
    messages: Annotated[list[BaseMessage], add_messages]
    intent: str
    confidence: float
    query_params: Dict[str, Any]
    next_node: str
    products: List[Dict[str, Any]] # 存储搜索结果

def supervisor_node(state: AgentState):
    """
    意图识别节点 (Supervisor)
    根据用户输入判断是查询订单、查看奖励/余额、询问规则还是搜索商品。
    """
    last_message = state["messages"][-1]
    last_content = last_message.content.lower() if isinstance(last_message.content, str) else ""
    
    # 检查是否有图片附件 (假设前端通过这种方式传递图片)
    has_image = False
    if hasattr(last_message, 'additional_kwargs') and 'image_url' in last_message.additional_kwargs:
        has_image = True

    # Intent Routing Logic
    if any(k in last_content for k in ["order", "status", "订单", "物流"]):
        return {"intent": "order", "next_node": "order_agent"}
    elif any(k in last_content for k in ["balance", "wallet", "reward", "level", "余额", "钱包", "等级", "返现"]):
        return {"intent": "rewards", "next_node": "rewards_agent"}
    elif any(k in last_content for k in ["rule", "how to", "签到", "免单", "规则"]):
        return {"intent": "kb", "next_node": "kb_agent"}
    elif any(k in last_content for k in ["find", "search", "buy", "找", "搜", "买"]) or has_image:
        return {"intent": "search", "next_node": "search_agent"}
    else:
        return {"intent": "chat", "next_node": END}

async def search_agent_node(state: AgentState):
    """
    搜索代理：处理 1688 商品检索 (多模态)
    调用 SigLIP + Qdrant 工具链。
    """
    last_message = state["messages"][-1]
    query = last_message.content
    image_url = last_message.additional_kwargs.get("image_url") if hasattr(last_message, 'additional_kwargs') else None
    
    # 调用多模态搜索工具
    results = await multimodal_search.invoke({"query": query, "image_url": image_url})
    
    # 构建 AI 回复，并附带商品数据供前端渲染
    ai_response = AIMessage(
        content=f"为您找到 {len(results)} 款匹配商品。这些都是精选自 1688 的优质货源。",
        additional_kwargs={
            "type": "products",
            "products": results
        }
    )
    
    return {"messages": [ai_response], "products": results}

def order_agent_node(state: AgentState):
    """订单管理代理：处理订单状态查询"""
    return {"messages": [AIMessage(content="AI: 正在从 Shopify 系统拉取您的最新订单状态...")]}

def rewards_agent_node(state: AgentState):
    """奖励系统代理：处理余额、等级和流水查询"""
    return {"messages": [AIMessage(content="AI: 正在连接 0Buck 奖励中心查询您的账户概览...")]}

def kb_agent_node(state: AgentState):
    """知识库代理：处理规则咨询"""
    return {"messages": [AIMessage(content="AI: 正在检索 0Buck 官方规则手册...")]}

# 构建图结构
workflow = StateGraph(AgentState)

# 添加节点
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("order_agent", order_agent_node)
workflow.add_node("rewards_agent", rewards_agent_node)
workflow.add_node("kb_agent", kb_agent_node)
workflow.add_node("search_agent", search_agent_node)

# 设置入口
workflow.set_entry_point("supervisor")

# 定义路由
def router(state: AgentState):
    return state["next_node"]

workflow.add_conditional_edges(
    "supervisor",
    router,
    {
        "order_agent": "order_agent",
        "rewards_agent": "rewards_agent",
        "kb_agent": "kb_agent",
        "search_agent": "search_agent",
        "chat": END
    }
)

workflow.add_edge("order_agent", END)
workflow.add_edge("rewards_agent", END)
workflow.add_edge("kb_agent", END)
workflow.add_edge("search_agent", END)

# 编译应用
app = workflow.compile()

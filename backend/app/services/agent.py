import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict, Union

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from backend.app.core.config import settings
from backend.app.services.tools import product_search, web_search, alibaba_search, get_order_status

# Define the state of the agent
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    intent: Optional[str]
    confidence: Optional[float]
    query_params: Dict[str, Any]
    search_results: List[Dict[str, Any]]
    order_info: Optional[Dict[str, Any]]
    next_node: str

# Define the tools
tools = [product_search, web_search, alibaba_search, get_order_status]
tool_node = ToolNode(tools)

# Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    google_api_key=settings.GOOGLE_API_KEY,
    temperature=0
)

# Bind tools to the LLM
llm_with_tools = llm.bind_tools(tools)

# Define the Supervisor/Router node
async def supervisor(state: AgentState):
    """
    Analyzes the user's intent and routes to the appropriate specialist or tool.
    """
    system_prompt = (
        "You are the 0buck AI Shopping Supervisor. Your goal is to help users find products, "
        "manage orders, and answer questions. "
        "Analyze the user's input and decide the best course of action. "
        "If they are searching for products, use product_search or web_search. "
        "If they want to source from China/Alibaba, use alibaba_search. "
        "If they ask about an order, use get_order_status. "
        "Always respond in a helpful, friendly tone."
    )
    
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    
    # Check if a tool call was made
    if response.tool_calls:
        return {"messages": [response], "next_node": "tools"}
    
    return {"messages": [response], "next_node": END}

# Define the Output Formatter node
async def output_formatter(state: AgentState):
    """
    Format the final response into structured JSON for the Next.js frontend.
    """
    last_message = state["messages"][-1]
    
    # If the last message is from a tool, we need to generate a final response
    if last_message.type == "tool":
        system_prompt = (
            "You are the 0buck Output Formatter. Take the search results or order info "
            "and format them into a user-friendly response. "
            "If you found products, summarize them and indicate you are showing them. "
            "Always include a 'type' field in your structured output."
        )
        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = await llm.ainvoke(messages)
        return {"messages": [response]}
    
    return {}

# Build the graph
def create_agent_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("supervisor", supervisor)
    workflow.add_node("tools", tool_node)
    
    # Set entry point
    workflow.set_entry_point("supervisor")
    
    # Add edges
    workflow.add_conditional_edges(
        "supervisor",
        lambda x: x["next_node"],
        {
            "tools": "tools",
            END: END
        }
    )
    
    workflow.add_edge("tools", "supervisor")
    
    # Compile with memory for state persistence
    return workflow.compile(checkpointer=MemorySaver())

# Instantiate the graph
agent_executor = create_agent_graph()

async def run_agent(content: str, session_id: str = "default"):
    """
    Convenience function to run the agent with a simple string input.
    """
    initial_state = {
        "messages": [HumanMessage(content=content)],
        "query_params": {},
        "search_results": [],
        "next_node": "supervisor"
    }
    
    # In a real app, you'd load history from Redis/DB using session_id
    config = {"configurable": {"thread_id": session_id}}
    
    final_state = await agent_executor.ainvoke(initial_state, config=config)
    
    # Return the last message content
    last_msg = final_state["messages"][-1]
    
    # Try to parse structured data if possible, or just return text
    return {
        "id": "msg_ai",
        "role": "assistant",
        "content": last_msg.content,
        "type": "text" # Default
    }

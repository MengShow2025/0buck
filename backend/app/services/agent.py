from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from app.services.tools import product_search, web_search, supply_library_search, get_order_status, search_coupons, update_butler_settings, trigger_wishing_well
from app.services.reward_engine import RewardEngine
from app.services.config_service import ConfigService
from app.services.butler_service import ButlerService
from app.services.reflection_service import run_butler_learning
from app.db.session import SessionLocal
from app.models.butler import UserButlerProfile

# Define the state of the agent
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    intent: Optional[str]
    confidence: Optional[float]
    query_params: Dict[str, Any]
    search_results: List[Dict[str, Any]]
    order_info: Optional[Dict[str, Any]]
    next_node: str
    locale: Optional[str] # "en", "zh-CN", "es", etc.
    currency: Optional[str] # "USD", "CNY", "EUR", etc.
    user_id: Optional[int]
    is_byok: bool # v3.1: True if using user's own key

# Define the tools
tools = [product_search, web_search, supply_library_search, get_order_status, search_coupons, update_butler_settings, trigger_wishing_well]
tool_node = ToolNode(tools)

def get_dynamic_llm(user_id: int, db: SessionLocal):
    """
    v3.1 Dynamic LLM Initialization.
    Priority: User's BYOK Key > System Flash Key.
    """
    config_service = ConfigService(db)
    profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
    
    if profile and profile.ai_api_key:
        # Use User's Pro Key (BYOK)
        return ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=profile.ai_api_key,
            temperature=0
        ), True
    
    # Use System Flash Key (Subsidy)
    return ChatGoogleGenerativeAI(
        model="gemini-flash-latest",
        google_api_key=config_service.get_api_key("GOOGLE_API_KEY"),
        temperature=0
    ), False

# Define the Supervisor/Router node
async def supervisor(state: AgentState):
    """
    v3.2 Persona OS Supervisor:
    1. Assemble 3-Layer Prompt (Enforcement + Strategy + Surface)
    2. Route to tools or respond directly
    """
    user_id = state.get("user_id")
    
    db = SessionLocal()
    butler_service = ButlerService(db)
    
    # --- v3.2 3-Layer Prompt Assembly ---
    system_prompt = await butler_service.assemble_persona_prompt(user_id)
    
    # --- v3.3.1 C2M Wishing Well Guidance ---
    last_user_msg = ""
    for m in reversed(state["messages"]):
        if m.type == "human":
            last_user_msg = m.content
            break
    
    if last_user_msg:
        c2m_guidance = await butler_service.get_c2m_guidance_prompt(user_id, last_user_msg)
        system_prompt += f"\n\n{c2m_guidance}"
    
    # Additional Context (Locale/Currency)
    locale = state.get("locale", "en")
    currency = state.get("currency", "USD")
    system_prompt += f"\n\n### Current Context\n- Locale: {locale}\n- Currency: {currency}\n- Response Language: {locale}"
    
    llm, _ = get_dynamic_llm(user_id, db)
    
    llm_with_tools = llm.bind_tools(tools)
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = await llm_with_tools.ainvoke(messages)
    db.close()
    
    # --- v3.5.0 AI Safety Sandbox: Enforce user_id in tool calls ---
    if response.tool_calls:
        new_tool_calls = []
        for tc in response.tool_calls:
            # If the tool takes a user_id, overwrite it with the verified user_id from state
            if "user_id" in tc["args"]:
                tc["args"]["user_id"] = user_id
            # Special case for tools that SHOULD have user_id but the LLM forgot or hallucinated
            # We can't easily check the tool signature here without importing them, 
            # but we know which tools in tools.py need user_id.
            if tc["name"] in ["get_order_status", "search_coupons", "update_butler_settings", "trigger_wishing_well"]:
                tc["args"]["user_id"] = user_id
            new_tool_calls.append(tc)
        
        # Create a new response with the modified tool calls
        from langchain_core.messages import AIMessage
        safe_response = AIMessage(
            content=response.content,
            tool_calls=new_tool_calls,
            id=response.id
        )
        return {"messages": [safe_response], "next_node": "tools"}
    
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

from app.services.shield_service import ShieldService
from app.models.butler import AIUsageStats

async def run_agent(content: str, user_id: int, session_id: str = "default"):
    """
    v3.2 Enhanced Agent Execution Loop:
    1. Apply Shield Proxy (Zone 2) for data isolation.
    2. Execute Agent with 3-Layer Persona OS.
    3. Track Token Economics in ai_usage_stats.
    4. Trigger Async Reflection for Persona Evolution.
    """
    db = SessionLocal()
    shield = ShieldService(db)
    rewards = RewardEngine(db)
    
    # 1. Dynamic LLM Selection
    llm, is_byok = get_dynamic_llm(user_id, db)
    
    # 2. Prepare Initial State (v3.2: Context includes locale/currency)
    profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
    initial_state = {
        "messages": [HumanMessage(content=content)],
        "query_params": {},
        "search_results": [],
        "user_id": user_id,
        "is_byok": is_byok,
        "locale": profile.detected_country if profile else "en",
        "currency": profile.preferred_currency if profile else "USD",
        "next_node": "supervisor"
    }
    
    config = {"configurable": {"thread_id": session_id}}
    
    # 3. Run the LangGraph Agent
    final_state = await agent_executor.ainvoke(initial_state, config=config)
    last_msg = final_state["messages"][-1]
    
    # 4. Token Economics & Usage Tracking (v3.2)
    if hasattr(last_msg, "response_metadata"):
        usage = last_msg.response_metadata.get("token_usage", {})
        tokens_in = usage.get("prompt_tokens", 0)
        tokens_out = usage.get("completion_tokens", 0)
        
        # Log to ai_usage_stats
        usage_stat = AIUsageStats(
            user_id=user_id,
            task_type="chat",
            model_name="gemini-1.5-pro", # Main model
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=(tokens_in * 0.0000035) + (tokens_out * 0.0000105), # Est. Pro pricing
            session_id=session_id
        )
        db.add(usage_stat)
        
        # Track for BYOK Rewards (v3.1)
        if is_byok and (tokens_in + tokens_out) > 0:
            rewards.track_token_usage(user_id, tokens_in + tokens_out, "pro")
    
    db.commit()
    
    # 5. Trigger Async Reflection (v3.2 Evolution)
    # We pass the history to the learning service to extract new facts
    # In a real production app, this should be sent to a Celery/Redis queue
    import asyncio
    history_dicts = []
    for m in final_state["messages"]:
        role = "assistant" if m.type == "ai" else "user"
        history_dicts.append({"role": role, "content": m.content})
    
    asyncio.create_task(run_butler_learning(history_dicts, user_id, db))
            
    db.close()
    
    return {
        "id": f"msg_ai_{datetime.now().timestamp()}",
        "role": "assistant",
        "content": last_msg.content,
        "type": "text",
        "is_byok": is_byok
    }

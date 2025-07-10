"""
Account fetch node - Retrieves complete account data from Supabase
"""
from datetime import datetime
from state import AgentState
from utils.supabase_client import supabase_manager
from constants.events import EventTypes


async def fetch_account_data(state: AgentState) -> AgentState:
    """
    Fetch complete account data from Supabase
    """
    start_time = datetime.now()
    
    # Get account ID from state
    account_id = state.get("account_data", {}).get("id")
    if not account_id:
        state["errors"] = state.get("errors", []) + ["No account ID provided"]
        return state
    
    # Log account fetch start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.ACCOUNT_FETCH_STARTED,
        content="Fetching account data",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Fetch full account data from Supabase
    print(f"[AccountFetch] Fetching account data for: {account_id}")
    
    full_account_data = await supabase_manager.fetch_account_by_id(account_id)
    if full_account_data:
        # Update state with complete account data
        state["account_data"] = full_account_data
        print(f"[AccountFetch] Successfully fetched account: {full_account_data.get('name')}")
        
        # Log successful account fetch
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type=EventTypes.ACCOUNT_FETCHED,
            content=f"Successfully fetched account: {full_account_data.get('name')}",
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
    else:
        print(f"[AccountFetch] Failed to fetch account data for: {account_id}")
        state["errors"] = state.get("errors", []) + [f"Failed to fetch account data for ID: {account_id}"]
        
        # Log account fetch failure
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type=EventTypes.ACCOUNT_FETCH_FAILED,
            content=f"Failed to fetch account data for ID: {account_id}",
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
        # Continue with minimal account data
        print(f"[AccountFetch] Continuing with minimal account data")
    
    # Update workflow state
    state["current_stage"] = "account_fetch"
    state["completed_stages"] = state.get("completed_stages", []) + ["account_fetch"]
    state["stage_timings"]["account_fetch"] = (datetime.now() - start_time).total_seconds()
    
    return state
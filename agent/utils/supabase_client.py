"""
Supabase client utilities and helper functions
"""
import os
from typing import Dict, Any, List, Optional
from supabase import create_client, Client
from datetime import datetime


class SupabaseManager:
    """Manages Supabase operations for the agent"""
    
    def __init__(self):
        self.client: Client = create_client(
            os.getenv("VITE_SUPABASE_URL"),
            os.getenv("VITE_SUPABASE_SERVICE_KEY")
        )
    
    async def log_event(
        self,
        document_id: str,
        event_type: str,
        content: str,
        data: Dict = None,
        thread_id: str = None,
        run_id: str = None
    ) -> Dict[str, Any]:
        """Log an event to chat_messages table"""
        try:
            result = self.client.table("chat_messages").insert({
                "document_id": document_id,
                "role": "assistant",
                "content": content,
                "message_type": "event",
                "event_data": {
                    "type": event_type,
                    "timestamp": datetime.now().isoformat(),
                    **(data or {})
                },
                "thread_id": thread_id,
                "run_id": run_id
            }).execute()
            return result.data
        except Exception as e:
            print(f"[SupabaseManager] Failed to log event: {e}")
            raise
    
    async def retrieve_account_documents(
        self,
        account_id: str,
        file_type: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve documents for an account with optional filtering"""
        try:
            query = self.client.table("account_data_sources")\
                .select("*")\
                .eq("account_id", account_id)\
                .order("created_at", desc=True)\
                .limit(limit)
            
            if file_type:
                query = query.eq("file_type", file_type)
            
            result = query.execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"[SupabaseManager] Failed to retrieve documents: {e}")
            return []
    
    async def update_document_status(
        self,
        document_id: str,
        status: str,
        additional_fields: Dict[str, Any] = None
    ) -> bool:
        """Update document generation status"""
        try:
            update_data = {
                "generation_status": status,
                **(additional_fields or {})
            }
            
            result = self.client.table("documents")\
                .update(update_data)\
                .eq("id", document_id)\
                .execute()
            
            return bool(result.data)
        except Exception as e:
            print(f"[SupabaseManager] Failed to update document status: {e}")
            return False
    
    async def create_document_record(
        self,
        document_id: str,
        account_id: str,
        author_id: str,
        title: str = None
    ) -> bool:
        """Create initial document record"""
        try:
            result = self.client.table("documents").insert({
                "id": document_id,
                "title": title or f"Document generated on {datetime.now().strftime('%Y-%m-%d')}",
                "account_id": account_id,
                "author_id": author_id,
                "generation_status": "initializing"
            }).execute()
            return bool(result.data)
        except Exception as e:
            # Check if document already exists
            try:
                check_result = self.client.table("documents")\
                    .select("id")\
                    .eq("id", document_id)\
                    .execute()
                if check_result.data:
                    print(f"[SupabaseManager] Document already exists: {document_id}")
                    return True
            except:
                pass
            
            print(f"[SupabaseManager] Failed to create document: {e}")
            return False
    
    async def log_message(
        self,
        document_id: str,
        role: str,
        content: str,
        thread_id: str = None,
        run_id: str = None
    ) -> bool:
        """Log a chat message"""
        try:
            result = self.client.table("chat_messages").insert({
                "document_id": document_id,
                "role": role,
                "content": content,
                "message_type": "message",
                "thread_id": thread_id,
                "run_id": run_id
            }).execute()
            return bool(result.data)
        except Exception as e:
            print(f"[SupabaseManager] Failed to log message: {e}")
            return False


# Global instance
supabase_manager = SupabaseManager()
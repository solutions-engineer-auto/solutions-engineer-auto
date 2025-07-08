export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_data_sources: {
        Row: {
          account_id: string
          content: string | null
          created_at: string | null
          file_name: string
          file_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          account_id: string
          content?: string | null
          created_at?: string | null
          file_name: string
          file_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          account_id?: string
          content?: string | null
          created_at?: string | null
          file_name?: string
          file_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "account_data_sources_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          created_at: string | null
          document_id: string
          id: string
          message_type: Database["public"]["Enums"]["message_type"] | null
          role: Database["public"]["Enums"]["chat_role"]
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          role: Database["public"]["Enums"]["chat_role"]
        }
        Update: {
          content?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          role?: Database["public"]["Enums"]["chat_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          account_id: string
          author_id: string
          content: string | null
          created_at: string | null
          document_type: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          author_id: string
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          author_id?: string
          content?: string | null
          created_at?: string | null
          document_type?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_updated_at_column: {
        Args: {}
        Returns: unknown
      }
    }
    Enums: {
      chat_role: "user" | "assistant"
      message_type: "thought" | "tool_call" | "response"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 
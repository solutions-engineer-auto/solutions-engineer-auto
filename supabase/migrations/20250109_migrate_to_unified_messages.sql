-- Remove old enum values and add new ones (hard migration)
ALTER TYPE message_type RENAME TO message_type_old;

CREATE TYPE message_type AS ENUM ('message', 'event');

-- Migrate existing data and add new columns
ALTER TABLE chat_messages 
  ALTER COLUMN message_type TYPE message_type USING 
    CASE 
      WHEN message_type::text = 'response' THEN 'message'::message_type
      ELSE 'event'::message_type
    END,
  ADD COLUMN event_data JSONB,
  ADD COLUMN thread_id TEXT,
  ADD COLUMN run_id TEXT;

DROP TYPE message_type_old;

-- Add indexes for performance
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_message_type ON chat_messages(message_type);

-- Update documents table for generation tracking
ALTER TABLE documents
  ADD COLUMN generation_status TEXT DEFAULT 'idle',
  ADD COLUMN generation_started_at TIMESTAMPTZ,
  ADD COLUMN generation_completed_at TIMESTAMPTZ,
  ADD COLUMN last_activity_at TIMESTAMPTZ;

-- Enable realtime on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
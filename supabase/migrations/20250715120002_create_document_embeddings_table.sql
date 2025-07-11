CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_data_source_id UUID NOT NULL REFERENCES account_data_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Assuming OpenAI's text-embedding-3-small, adjust size if needed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100); 
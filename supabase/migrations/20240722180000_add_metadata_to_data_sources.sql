ALTER TABLE public.account_data_sources
RENAME COLUMN name TO file_name;

ALTER TABLE public.account_data_sources
ADD COLUMN file_type TEXT,
ADD COLUMN metadata JSONB; 
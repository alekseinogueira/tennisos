-- Diagnóstico: listar as colunas reais da tabela `sessions` na base ao vivo.
-- Rode no Supabase → SQL Editor. Cole o resultado de volta pro Claude.
-- Procuramos se a coluna `user_id` existe (o INSERT do app envia user_id e a
-- RLS depende dela). Erro atual: "Could not find the 'user_id' column of
-- 'sessions' in the schema cache".

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sessions'
order by ordinal_position;

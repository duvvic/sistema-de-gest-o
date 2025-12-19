-- SQL para permitir atualização de avatar em dim_colaboradores
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)

-- Opção 1: Desabilitar completamente o RLS (mais simples, menos seguro)
ALTER TABLE dim_colaboradores DISABLE ROW LEVEL SECURITY;

-- Opção 2: Manter RLS e criar políticas específicas (mais seguro)
-- Descomente as linhas abaixo se preferir usar RLS:

-- ALTER TABLE dim_colaboradores ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (visualizar)
-- CREATE POLICY "Permitir SELECT público" ON dim_colaboradores
--   FOR SELECT USING (true);

-- Política para UPDATE (atualizar avatar_url)
-- CREATE POLICY "Permitir UPDATE de avatar" ON dim_colaboradores
--   FOR UPDATE USING (true)
--   WITH CHECK (true);

-- Política para INSERT (criar novos usuários)
-- CREATE POLICY "Permitir INSERT público" ON dim_colaboradores
--   FOR INSERT WITH CHECK (true);

-- Política para DELETE (desativar usuários)
-- CREATE POLICY "Permitir DELETE público" ON dim_colaboradores
--   FOR DELETE USING (true);

-- Verificar políticas existentes:
-- SELECT * FROM pg_policies WHERE tablename = 'dim_colaboradores';

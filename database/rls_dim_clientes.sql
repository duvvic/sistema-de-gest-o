-- ==========================================
-- TABELA: dim_clientes
-- Objetivo: Garantir que o frontend possa apenas LER os clientes.
-- Qualquer operação de escrita (INSERT, UPDATE, DELETE) é BLOQUEADA para o frontend (authenticated).
-- Escritas permitidas apenas via Backend (service_role), que ignora RLS.
-- ==========================================
-- 1. Ativa o RLS na tabela
ALTER TABLE public.dim_clientes ENABLE ROW LEVEL SECURITY;
-- 2. Limpeza de políticas existentes
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.dim_clientes;
DROP POLICY IF EXISTS "Permitir insert para autenticados" ON public.dim_clientes;
DROP POLICY IF EXISTS "Permitir update para autenticados" ON public.dim_clientes;
DROP POLICY IF EXISTS "Permitir delete para autenticados" ON public.dim_clientes;
-- 3. Política de SELEÇÃO (Leitura): Aberta para todos os usuários logados
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.dim_clientes FOR
SELECT TO authenticated USING (true);
-- 4. Políticas de ESCRITA:
-- Por padrão, como o RLS está ATIVO e não existem outras políticas para INSERT/UPDATE/DELETE,
-- o Supabase negará essas operações para qualquer usuário (incluindo 'authenticated').
-- A 'service_role' usada pelo backend Express (supabaseAdmin) possui a flag 'bypassrls',
-- portanto, as operações do backend continuarão funcionando normalmente.
-- Comentário de Segurança: 
-- Esta configuração impede ataques onde um usuário mal-intencionado use o token JWT 
-- obtido no frontend para tentar manipular a tabela de clientes via API direta do Supabase.
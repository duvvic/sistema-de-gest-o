-- ==========================================
-- 1. TABELA: user_notas_links
-- Objetivo: Garantir que cada usuário veja e gerencie apenas seus próprios links de notas.
-- ==========================================
-- Ativa o RLS
ALTER TABLE public.user_notas_links ENABLE ROW LEVEL SECURITY;
-- Remove política se já existir
DROP POLICY IF EXISTS "Users can manage their own notes links" ON public.user_notas_links;
-- Política para permitir que usuários autenticados gerenciem seus próprios registros
CREATE POLICY "Users can manage their own notes links" ON public.user_notas_links FOR ALL TO authenticated USING (
    colaborador_id IN (
        SELECT "ID_Colaborador"
        FROM public.dim_colaboradores
        WHERE auth_user_id = auth.uid()
    )
) WITH CHECK (
    colaborador_id IN (
        SELECT "ID_Colaborador"
        FROM public.dim_colaboradores
        WHERE auth_user_id = auth.uid()
    )
);
-- ==========================================
-- 2. TABELA: project_budgets
-- Objetivo: Permitir consulta para usuários autenticados e edição apenas para admins.
-- ==========================================
-- Ativa o RLS
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
-- Remove políticas se já existirem
DROP POLICY IF EXISTS "Authenticated users can view project budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "Admins can manage project budgets" ON public.project_budgets;
-- Política de Leitura: Qualquer usuário autenticado pode ver os orçamentos
CREATE POLICY "Authenticated users can view project budgets" ON public.project_budgets FOR
SELECT TO authenticated USING (true);
-- Política de Escrita: Apenas usuários com papel administrativo podem alterar orçamentos
CREATE POLICY "Admins can manage project budgets" ON public.project_budgets FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.dim_colaboradores
        WHERE auth_user_id = auth.uid()
            AND (
                role ILIKE '%admin%'
                OR role IN ('executive', 'financial', 'pmo')
            )
    )
);
-- ==========================================
-- 3. TABELA: audit_log
-- Objetivo: Permitir inserção por usuários autenticados e leitura apenas para admins.
-- ==========================================
-- Ativa o RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Remove políticas se já existirem
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.audit_log;
-- Política de Inserção: Usuários autenticados podem gerar logs (registros de suas ações)
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_log FOR
INSERT TO authenticated WITH CHECK (true);
-- Política de Leitura: Apenas administradores podem visualizar o log de auditoria
CREATE POLICY "Only admins can view audit logs" ON public.audit_log FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.dim_colaboradores
            WHERE auth_user_id = auth.uid()
                AND (
                    role ILIKE '%admin%'
                    OR role IN ('executive', 'financial', 'pmo', 'tech_lead')
                )
        )
    );
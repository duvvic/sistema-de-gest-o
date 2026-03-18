-- ============================================================
-- SNAPSHOT HISTÓRICO DE CAPACIDADE v2 — Enterprise Grade
-- Regras: Imutabilidade Real, Contexto de Cálculo,
--         Versionamento, Consistência Transacional, Velocity Congelado
-- ============================================================

-- ============================================================
-- PARTE 1: ALTERAR TABELAS EXISTENTES (se já criadas)
-- ============================================================

-- 1a. Campos adicionais em capacity_snapshots
ALTER TABLE capacity_snapshots
    ADD COLUMN IF NOT EXISTS calculation_version  TEXT NOT NULL DEFAULT '1.0.0',
    ADD COLUMN IF NOT EXISTS calculation_context  JSONB,
    ADD COLUMN IF NOT EXISTS velocity_frozen      NUMERIC(5,3) DEFAULT 1.000,
    ADD COLUMN IF NOT EXISTS snapshot_hash        TEXT;   -- SHA256 dos parâmetros (auditoria)

-- 1b. Campos adicionais em allocation_snapshots
ALTER TABLE allocation_snapshots
    ADD COLUMN IF NOT EXISTS calculation_version  TEXT NOT NULL DEFAULT '1.0.0',
    ADD COLUMN IF NOT EXISTS velocity_applied     NUMERIC(5,3) DEFAULT 1.000,
    ADD COLUMN IF NOT EXISTS effort_base          NUMERIC(8,2) DEFAULT 0,  -- esforço ANTES de velocity
    ADD COLUMN IF NOT EXISTS snapshot_hash        TEXT;

-- ============================================================
-- PARTE 2: CRIAÇÃO INICIAL COMPLETA (caso as tabelas ainda não existam)
-- ============================================================

CREATE TABLE IF NOT EXISTS capacity_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_month          CHAR(7) NOT NULL,           -- 'YYYY-MM'
    user_id                 TEXT NOT NULL,
    user_name               TEXT,
    -- Capacidade
    capacity_hours          NUMERIC(8,2) NOT NULL DEFAULT 0,
    -- Alocação
    allocated_hours         NUMERIC(8,2) NOT NULL DEFAULT 0,
    planned_hours           NUMERIC(8,2) NOT NULL DEFAULT 0,
    continuous_hours        NUMERIC(8,2) NOT NULL DEFAULT 0,
    -- Realizado
    performed_hours         NUMERIC(8,2) NOT NULL DEFAULT 0,
    -- Ocupação
    occupancy_rate          NUMERIC(6,2) NOT NULL DEFAULT 0,  -- %
    -- Saldo
    available_hours         NUMERIC(8,2) NOT NULL DEFAULT 0,
    -- Status
    status                  TEXT CHECK (status IN ('Sobrecarregado', 'Alto', 'Disponível')),
    -- Forecast
    forecast_ideal_date     DATE,
    forecast_realistic_date DATE,
    is_saturated            BOOLEAN DEFAULT FALSE,
    -- Velocity CONGELADO no momento do snapshot (Regra 5)
    velocity_index          NUMERIC(5,3) DEFAULT 1.000,
    velocity_frozen         NUMERIC(5,3) DEFAULT 1.000,  -- cópia imutável do velocity calculado
    -- Versionamento do Algoritmo (Regra 3)
    calculation_version     TEXT NOT NULL DEFAULT '1.0.0',
    -- Contexto Rico de Cálculo (Regra 2) — JSONB para flexibilidade
    calculation_context     JSONB,
    -- Hash de integridade (auditoria)
    snapshot_hash           TEXT,
    -- Rastreabilidade
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              TEXT,
    -- Imutabilidade: um snapshot por mês/usuário
    CONSTRAINT uq_capacity_snapshot UNIQUE (snapshot_month, user_id)
);

CREATE TABLE IF NOT EXISTS allocation_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_month          CHAR(7) NOT NULL,
    user_id                 TEXT NOT NULL,
    task_id                 TEXT NOT NULL,
    project_id              TEXT,
    project_name            TEXT,
    task_title              TEXT,
    -- Horas
    effort_in_month         NUMERIC(8,2) NOT NULL DEFAULT 0,
    reported_hours          NUMERIC(8,2) NOT NULL DEFAULT 0,
    remaining_hours         NUMERIC(8,2) NOT NULL DEFAULT 0,
    -- Velocity aplicado (congelado no momento)
    effort_base             NUMERIC(8,2) DEFAULT 0,     -- esforço sem velocity
    velocity_applied        NUMERIC(5,3) DEFAULT 1.000, -- velocity congelado
    -- Versionamento
    calculation_version     TEXT NOT NULL DEFAULT '1.0.0',
    -- Hash de integridade
    snapshot_hash           TEXT,
    -- Rastreabilidade
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_alloc_snapshot UNIQUE (snapshot_month, user_id, task_id)
);

-- ============================================================
-- PARTE 3: ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cap_snapshots_month   ON capacity_snapshots (snapshot_month);
CREATE INDEX IF NOT EXISTS idx_cap_snapshots_user    ON capacity_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_cap_snapshots_version ON capacity_snapshots (calculation_version);
CREATE INDEX IF NOT EXISTS idx_alloc_snapshots_month ON allocation_snapshots (snapshot_month);
CREATE INDEX IF NOT EXISTS idx_alloc_snapshots_user  ON allocation_snapshots (user_id);

-- ============================================================
-- PARTE 4: ROW LEVEL SECURITY — IMUTABILIDADE REAL
-- ============================================================
ALTER TABLE capacity_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_snapshots ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "allow_read_capacity_snapshots"    ON capacity_snapshots;
DROP POLICY IF EXISTS "allow_read_allocation_snapshots"  ON allocation_snapshots;
DROP POLICY IF EXISTS "allow_insert_capacity_snapshots"  ON capacity_snapshots;
DROP POLICY IF EXISTS "allow_insert_allocation_snapshots" ON allocation_snapshots;
DROP POLICY IF EXISTS "deny_update_capacity_snapshots"   ON capacity_snapshots;
DROP POLICY IF EXISTS "deny_delete_capacity_snapshots"   ON capacity_snapshots;
DROP POLICY IF EXISTS "deny_update_allocation_snapshots" ON allocation_snapshots;
DROP POLICY IF EXISTS "deny_delete_allocation_snapshots" ON allocation_snapshots;

-- LEITURA: qualquer usuário autenticado pode ler
CREATE POLICY "allow_read_capacity_snapshots"
    ON capacity_snapshots FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "allow_read_allocation_snapshots"
    ON allocation_snapshots FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: somente service_role (backend) pode inserir
CREATE POLICY "allow_insert_capacity_snapshots"
    ON capacity_snapshots FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "allow_insert_allocation_snapshots"
    ON allocation_snapshots FOR INSERT
    TO service_role
    WITH CHECK (true);

-- UPDATE RESTRITO: apenas mês corrente pode ser atualizado via service_role
-- Meses passados são COMPLETAMENTE bloqueados — IMUTABILIDADE REAL
CREATE POLICY "allow_update_current_month_only"
    ON capacity_snapshots FOR UPDATE
    TO service_role
    USING (snapshot_month = to_char(NOW(), 'YYYY-MM'))
    WITH CHECK (snapshot_month = to_char(NOW(), 'YYYY-MM'));

CREATE POLICY "allow_update_alloc_current_month_only"
    ON allocation_snapshots FOR UPDATE
    TO service_role
    USING (snapshot_month = to_char(NOW(), 'YYYY-MM'))
    WITH CHECK (snapshot_month = to_char(NOW(), 'YYYY-MM'));

-- DELETE: completamente bloqueado para TODOS (incluindo service_role)
-- Snapshots são append-only por design — auditoria financeira
CREATE POLICY "deny_delete_capacity_snapshots"
    ON capacity_snapshots FOR DELETE
    TO authenticated, service_role
    USING (false);

CREATE POLICY "deny_delete_allocation_snapshots"
    ON allocation_snapshots FOR DELETE
    TO authenticated, service_role
    USING (false);

-- ============================================================
-- PARTE 5: VIEW HISTÓRICA APRIMORADA
-- ============================================================
-- DROP necessário pois CREATE OR REPLACE VIEW não permite alterar
-- nomes ou ordem de colunas de uma view existente no PostgreSQL.
DROP VIEW IF EXISTS v_snapshot_version_audit CASCADE;
DROP VIEW IF EXISTS v_capacity_history CASCADE;

CREATE OR REPLACE VIEW v_capacity_history AS
SELECT
    cs.snapshot_month,
    cs.user_id,
    cs.user_name,
    cs.capacity_hours,
    cs.allocated_hours,
    cs.planned_hours,
    cs.continuous_hours,
    cs.performed_hours,
    cs.occupancy_rate,
    cs.available_hours,
    cs.status,
    cs.velocity_frozen,
    cs.forecast_ideal_date,
    cs.forecast_realistic_date,
    cs.is_saturated,
    cs.calculation_version,
    cs.calculation_context,
    cs.snapshot_hash,
    cs.created_at,
    cs.created_by
FROM capacity_snapshots cs
ORDER BY cs.snapshot_month DESC, cs.user_name;

-- View de auditoria: detecta snapshots com versão diferente da atual
CREATE OR REPLACE VIEW v_snapshot_version_audit AS
SELECT
    snapshot_month,
    calculation_version,
    COUNT(*)             AS user_count,
    MIN(created_at)      AS first_created,
    MAX(created_at)      AS last_created
FROM capacity_snapshots
GROUP BY snapshot_month, calculation_version
ORDER BY snapshot_month DESC;

-- ============================================================
-- PARTE 6: FUNÇÃO AUXILIAR DE HASH DE INTEGRIDADE
-- Gera um hash determinístico dos campos críticos do snapshot
-- ============================================================
CREATE OR REPLACE FUNCTION generate_snapshot_hash(
    p_month     CHAR(7),
    p_user_id   TEXT,
    p_capacity  NUMERIC,
    p_allocated NUMERIC,
    p_velocity  NUMERIC,
    p_version   TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        sha256(
            (p_month || '|' || p_user_id || '|' ||
             p_capacity::TEXT || '|' || p_allocated::TEXT || '|' ||
             p_velocity::TEXT || '|' || p_version)::bytea
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- PARTE 7: TRIGGER — PREENCHE HASH AUTOMATICAMENTE NO INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION trg_fill_snapshot_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.snapshot_hash := generate_snapshot_hash(
        NEW.snapshot_month,
        NEW.user_id,
        NEW.capacity_hours,
        NEW.allocated_hours,
        COALESCE(NEW.velocity_frozen, 1),
        NEW.calculation_version
    );
    -- Garante que velocity_frozen seja uma cópia do velocity_index no momento do insert
    IF NEW.velocity_frozen IS NULL THEN
        NEW.velocity_frozen := COALESCE(NEW.velocity_index, 1.000);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_capacity_snapshot_hash ON capacity_snapshots;
CREATE TRIGGER trg_capacity_snapshot_hash
    BEFORE INSERT ON capacity_snapshots
    FOR EACH ROW EXECUTE FUNCTION trg_fill_snapshot_hash();

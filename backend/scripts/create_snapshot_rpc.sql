-- ============================================================
-- RPC TRANSACIONAL: save_capacity_snapshot_transaction
-- Garante que capacity_snapshots e allocation_snapshots
-- sejam gravados na MESMA transação PostgreSQL (Regra 4).
-- ============================================================

CREATE OR REPLACE FUNCTION save_capacity_snapshot_transaction(
    p_capacity_rows   JSONB,
    p_allocation_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER   -- Roda como owner da função (contorna RLS para o service_role)
AS $$
DECLARE
    v_cap_count   INT := 0;
    v_alloc_count INT := 0;
    v_month       TEXT;
    v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
    cap_row       JSONB;
    alloc_row     JSONB;
BEGIN
    -- ── Validação de mês ─────────────────────────────────────────────────────
    -- Pega o mês do primeiro registro para validar
    v_month := p_capacity_rows->0->>'snapshot_month';

    IF v_month IS NULL THEN
        RAISE EXCEPTION 'snapshot_month ausente nos dados de capacidade';
    END IF;

    -- IMUTABILIDADE: bloqueia meses passados no banco
    IF v_month < v_current_month THEN
        RAISE EXCEPTION 'Snapshot do mês % já está fechado e é imutável. Mês atual: %', v_month, v_current_month;
    END IF;

    -- ── Inserir/Atualizar Snapshots de Capacidade ─────────────────────────────
    FOR cap_row IN SELECT * FROM jsonb_array_elements(p_capacity_rows)
    LOOP
        INSERT INTO capacity_snapshots (
            snapshot_month, user_id, user_name,
            capacity_hours, allocated_hours, planned_hours, continuous_hours,
            performed_hours, occupancy_rate, available_hours, status,
            forecast_ideal_date, forecast_realistic_date, is_saturated,
            velocity_index, velocity_frozen,
            calculation_version, calculation_context,
            created_by
        )
        VALUES (
            cap_row->>'snapshot_month',
            cap_row->>'user_id',
            cap_row->>'user_name',
            (cap_row->>'capacity_hours')::NUMERIC,
            (cap_row->>'allocated_hours')::NUMERIC,
            (cap_row->>'planned_hours')::NUMERIC,
            (cap_row->>'continuous_hours')::NUMERIC,
            (cap_row->>'performed_hours')::NUMERIC,
            (cap_row->>'occupancy_rate')::NUMERIC,
            (cap_row->>'available_hours')::NUMERIC,
            cap_row->>'status',
            NULLIF(cap_row->>'forecast_ideal_date', '')::DATE,
            NULLIF(cap_row->>'forecast_realistic_date', '')::DATE,
            (cap_row->>'is_saturated')::BOOLEAN,
            COALESCE((cap_row->>'velocity_index')::NUMERIC, 1.000),
            COALESCE((cap_row->>'velocity_frozen')::NUMERIC, 1.000),
            COALESCE(cap_row->>'calculation_version', '2.0.0'),
            cap_row->'calculation_context',
            cap_row->>'created_by'
        )
        ON CONFLICT (snapshot_month, user_id)
            -- Permite atualizar somente o mês corrente
            DO UPDATE SET
                capacity_hours          = EXCLUDED.capacity_hours,
                allocated_hours         = EXCLUDED.allocated_hours,
                planned_hours           = EXCLUDED.planned_hours,
                continuous_hours        = EXCLUDED.continuous_hours,
                performed_hours         = EXCLUDED.performed_hours,
                occupancy_rate          = EXCLUDED.occupancy_rate,
                available_hours         = EXCLUDED.available_hours,
                status                  = EXCLUDED.status,
                forecast_ideal_date     = EXCLUDED.forecast_ideal_date,
                forecast_realistic_date = EXCLUDED.forecast_realistic_date,
                is_saturated            = EXCLUDED.is_saturated,
                velocity_index          = EXCLUDED.velocity_index,
                velocity_frozen         = EXCLUDED.velocity_frozen,
                calculation_version     = EXCLUDED.calculation_version,
                calculation_context     = EXCLUDED.calculation_context
            WHERE capacity_snapshots.snapshot_month = v_current_month;

        v_cap_count := v_cap_count + 1;
    END LOOP;

    -- ── Inserir/Atualizar Snapshots de Alocação ───────────────────────────────
    FOR alloc_row IN SELECT * FROM jsonb_array_elements(p_allocation_rows)
    LOOP
        INSERT INTO allocation_snapshots (
            snapshot_month, user_id, task_id,
            project_id, project_name, task_title,
            effort_in_month, reported_hours, remaining_hours,
            effort_base, velocity_applied, calculation_version
        )
        VALUES (
            alloc_row->>'snapshot_month',
            alloc_row->>'user_id',
            alloc_row->>'task_id',
            alloc_row->>'project_id',
            alloc_row->>'project_name',
            alloc_row->>'task_title',
            (alloc_row->>'effort_in_month')::NUMERIC,
            (alloc_row->>'reported_hours')::NUMERIC,
            (alloc_row->>'remaining_hours')::NUMERIC,
            COALESCE((alloc_row->>'effort_base')::NUMERIC, 0),
            COALESCE((alloc_row->>'velocity_applied')::NUMERIC, 1.000),
            COALESCE(alloc_row->>'calculation_version', '2.0.0')
        )
        ON CONFLICT (snapshot_month, user_id, task_id)
            DO UPDATE SET
                effort_in_month     = EXCLUDED.effort_in_month,
                reported_hours      = EXCLUDED.reported_hours,
                remaining_hours     = EXCLUDED.remaining_hours,
                effort_base         = EXCLUDED.effort_base,
                velocity_applied    = EXCLUDED.velocity_applied,
                calculation_version = EXCLUDED.calculation_version
            WHERE allocation_snapshots.snapshot_month = v_current_month;

        v_alloc_count := v_alloc_count + 1;
    END LOOP;

    -- ── Retorna resultado ────────────────────────────────────────────────────
    RETURN jsonb_build_object(
        'saved_capacity',    v_cap_count,
        'saved_allocations', v_alloc_count,
        'month',             v_month,
        'algorithm_version', '2.0.0'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Toda a transação é revertida automaticamente pelo PostgreSQL
        RAISE;
END;
$$;

-- Garantir que somente service_role pode chamar esta função
REVOKE ALL ON FUNCTION save_capacity_snapshot_transaction(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION save_capacity_snapshot_transaction(JSONB, JSONB) TO service_role;

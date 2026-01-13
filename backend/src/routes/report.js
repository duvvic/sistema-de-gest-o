import express from 'express';
import ExcelJS from 'exceljs';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

function parseCsvIntArray(v) {
    if (!v) return null;
    if (Array.isArray(v)) v = v.join(',');
    const arr = String(v)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(n => Number(n))
        .filter(n => Number.isFinite(n));
    return arr.length ? arr : null;
}

function dateOrDefault(v, fallbackIso) {
    const s = (v || '').toString().slice(0, 10);
    // espera YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return fallbackIso;
}

async function fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds }) {
    console.log('Calling RPC relatorio_horas_custos with:', {
        p_data_ini: startDate,
        p_data_fim: endDate,
        p_clientes: clientIds,
        p_projetos: projectIds,
        p_colaboradores: collaboratorIds
    });

    const { data, error } = await supabaseAdmin.rpc('relatorio_horas_custos', {
        p_data_ini: startDate,
        p_data_fim: endDate,
        p_clientes: clientIds,
        p_projetos: projectIds,
        p_colaboradores: collaboratorIds
    });

    if (error) {
        console.error('RPC Error:', error);
        throw error;
    }
    return data || [];
}

/**
 * Agrupa os dados por projeto para o painel de custos
 */
function calculateProjectTotals(rows) {
    const map = new Map();
    rows.forEach(r => {
        const id = r.id_projeto;
        if (!id) return;
        if (!map.has(id)) {
            map.set(id, {
                id_projeto: id,
                projeto: r.nome_projeto || r.projeto,
                cliente: r.nome_cliente || r.cliente,
                id_cliente: r.id_cliente,
                horas_projeto_total: r.horas_projeto || 0,
                valor_projeto: r.budget || 0,
                valor_hora_projeto: r.valor_hora || 0,
                valor_rateado_total: 0
            });
        }
        const pt = map.get(id);
        pt.valor_rateado_total += (r.valor_rateado || 0);
    });
    return Array.from(map.values());
}

/**
 * Calcula totais gerais do relatório
 */
function calculateTotals(rows) {
    let horas_total = 0;
    let valor_total_rateado = 0;
    rows.forEach(r => {
        horas_total += (r.horas || 0);
        valor_total_rateado += (r.valor_rateado || 0);
    });
    return {
        horas_total,
        valor_total_rateado
    };
}

// PREVIEW JSON (para “preview estilo Excel” no front)
router.get('/preview', requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        const endIso = today.toISOString().slice(0, 10);
        const start30 = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);

        const startDate = dateOrDefault(req.query.startDate, start30);
        const endDate = dateOrDefault(req.query.endDate, endIso);

        const clientIds = parseCsvIntArray(req.query.clientIds);
        const projectIds = parseCsvIntArray(req.query.projectIds);
        const collaboratorIds = parseCsvIntArray(req.query.collaboratorIds);

        const rows = await fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds });

        const projectTotals = calculateProjectTotals(rows);
        const totals = calculateTotals(rows);

        res.json({
            generatedAt: new Date().toISOString(),
            filters: { startDate, endDate, clientIds, projectIds, collaboratorIds },
            count: rows.length,
            rows,
            projectTotals,
            totals
        });
    } catch (e) {
        console.error('[report/preview] error:', e);
        res.status(500).json({ error: e.message || 'Failed to generate preview' });
    }
});

// EXPORT POWER BI (por enquanto retorna o mesmo JSON “flat”)
router.get('/powerbi', requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        const endIso = today.toISOString().slice(0, 10);
        const start30 = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);

        const startDate = dateOrDefault(req.query.startDate, start30);
        const endDate = dateOrDefault(req.query.endDate, endIso);

        const clientIds = parseCsvIntArray(req.query.clientIds);
        const projectIds = parseCsvIntArray(req.query.projectIds);
        const collaboratorIds = parseCsvIntArray(req.query.collaboratorIds);

        const rows = await fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds });

        res.json({
            dataset: 'relatorio_horas_custos',
            generatedAt: new Date().toISOString(),
            filters: { startDate, endDate, clientIds, projectIds, collaboratorIds },
            rows
        });
    } catch (e) {
        console.error('[report/powerbi] error:', e);
        res.status(500).json({ error: e.message || 'Failed to export powerbi json' });
    }
});

// EXPORT EXCEL (xlsx)
router.get('/excel', requireAdmin, async (req, res) => {
    try {
        const today = new Date();
        const endIso = today.toISOString().slice(0, 10);
        const start30 = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);

        const startDate = dateOrDefault(req.query.startDate, start30);
        const endDate = dateOrDefault(req.query.endDate, endIso);

        const clientIds = parseCsvIntArray(req.query.clientIds);
        const projectIds = parseCsvIntArray(req.query.projectIds);
        const collaboratorIds = parseCsvIntArray(req.query.collaboratorIds);

        const rows = await fetchReport({ startDate, endDate, clientIds, projectIds, collaboratorIds });

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Relatorio');

        ws.columns = [
            { header: 'ID_Cliente', key: 'id_cliente', width: 12 },
            { header: 'Cliente', key: 'nome_cliente', width: 28 },
            { header: 'ID_Projeto', key: 'id_projeto', width: 12 },
            { header: 'Projeto', key: 'nome_projeto', width: 28 },
            { header: 'ID_Colaborador', key: 'id_colaborador', width: 14 },
            { header: 'Colaborador', key: 'nome_colaborador', width: 28 },
            { header: 'ID_Tarefa', key: 'id_tarefa', width: 14 },
            { header: 'Tarefa', key: 'descricao_tarefa', width: 38 },
            { header: 'Horas', key: 'horas', width: 10 },
            { header: 'Budget (R$)', key: 'budget', width: 14 },
            { header: 'Horas Projeto', key: 'horas_projeto', width: 14 },
            { header: 'Valor/Hora', key: 'valor_hora', width: 12 },
            { header: 'Valor Rateado (R$)', key: 'valor_rateado', width: 18 }
        ];

        ws.addRows(rows);

        ws.getRow(1).font = { bold: true };
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        const fileName = `relatorio_${startDate}_a_${endDate}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('[report/excel] error:', e);
        res.status(500).json({ error: e.message || 'Failed to export excel' });
    }
});

// UPDATE BUDGETS (persistente no dim_projetos)
router.put('/project-budgets', requireAdmin, express.json(), async (req, res) => {
    try {
        const body = req.body || {};
        const items = Array.isArray(body.budgets) ? body.budgets : [];
        if (!items.length) return res.status(400).json({ error: 'Missing budgets[]' });

        // atualiza um a um (simples e seguro)
        const results = [];
        for (const it of items) {
            const id = Number(it.id_projeto);
            const budget = it.budget === null || it.budget === undefined ? null : Number(it.budget);
            if (!Number.isFinite(id)) continue;

            const { data, error } = await supabaseAdmin
                .from('dim_projetos')
                .update({ budget })
                .eq('ID_Projeto', id)
                .select('ID_Projeto, NomeProjeto, budget')
                .maybeSingle();

            if (error) throw error;
            results.push(data);
        }

        res.json({ updated: results.length, results });
    } catch (e) {
        console.error('[report/project-budgets] error:', e);
        res.status(500).json({ error: e.message || 'Failed to update budgets' });
    }
});

export default router;

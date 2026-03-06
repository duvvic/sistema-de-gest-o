import { reportService } from '../services/reportService.js';
import { projectRepository } from '../repositories/projectRepository.js';

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

function parseCsvStringArray(v) {
    if (!v) return null;
    if (Array.isArray(v)) v = v.join(',');
    const arr = String(v)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    return arr.length ? arr : null;
}

function dateOrDefault(v, fallbackIso) {
    const s = (v || '').toString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return fallbackIso;
}

export const reportController = {
    async getPreview(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate ? dateOrDefault(req.query.startDate, null) : null,
                endDate: req.query.endDate ? dateOrDefault(req.query.endDate, null) : null,
                clientIds: parseCsvIntArray(req.query.clientIds),
                projectIds: parseCsvIntArray(req.query.projectIds),
                collaboratorIds: parseCsvIntArray(req.query.collaboratorIds),
                statuses: parseCsvStringArray(req.query.statuses)
            };

            const data = await reportService.getReportData(filters);
            res.json({
                generatedAt: new Date().toISOString(),
                filters,
                count: data.rows.length,
                ...data
            });
        } catch (e) {
            console.error('[ReportController] Preview error:', e);
            res.status(500).json({ error: e.message || 'Failed to generate preview' });
        }
    },

    async getPowerBi(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate ? dateOrDefault(req.query.startDate, null) : null,
                endDate: req.query.endDate ? dateOrDefault(req.query.endDate, null) : null,
                clientIds: parseCsvIntArray(req.query.clientIds),
                projectIds: parseCsvIntArray(req.query.projectIds),
                collaboratorIds: parseCsvIntArray(req.query.collaboratorIds),
                statuses: parseCsvStringArray(req.query.statuses)
            };

            const { rows } = await reportService.getReportData(filters);
            res.json({
                dataset: 'relatorio_horas_custos',
                generatedAt: new Date().toISOString(),
                filters,
                rows
            });
        } catch (e) {
            console.error('[ReportController] PowerBI error:', e);
            res.status(500).json({ error: e.message || 'Failed to export PowerBI json' });
        }
    },

    async getExcel(req, res) {
        try {
            const filters = {
                startDate: req.query.startDate ? dateOrDefault(req.query.startDate, null) : null,
                endDate: req.query.endDate ? dateOrDefault(req.query.endDate, null) : null,
                clientIds: parseCsvIntArray(req.query.clientIds),
                projectIds: parseCsvIntArray(req.query.projectIds),
                collaboratorIds: parseCsvIntArray(req.query.collaboratorIds),
                statuses: parseCsvStringArray(req.query.statuses)
            };

            const { rows } = await reportService.getReportData(filters);
            const wb = await reportService.generateExcel(rows, filters);

            const fileName = `Relatorio_BI_${new Date().getTime()}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            await wb.xlsx.write(res);
            res.end();
        } catch (e) {
            console.error('[ReportController] Excel error:', e);
            res.status(500).json({ error: e.message || 'Failed to export Excel' });
        }
    },

    async updateBudgets(req, res) {
        try {
            const body = req.body || {};
            const items = Array.isArray(body.budgets) ? body.budgets : [];
            if (!items.length) return res.status(400).json({ error: 'Missing budgets[]' });

            const results = [];
            for (const it of items) {
                const id = Number(it.id_projeto);
                const budget = it.budget === null || it.budget === undefined ? null : Number(it.budget);
                if (!Number.isFinite(id)) continue;

                const data = await projectRepository.update(id, { budget });
                if (data && data.length > 0) {
                    results.push(data[0]);
                }
            }

            res.json({ updated: results.length, results });
        } catch (e) {
            console.error('[ReportController] UpdateBudgets error:', e);
            res.status(500).json({ error: e.message || 'Failed to update budgets' });
        }
    }
};

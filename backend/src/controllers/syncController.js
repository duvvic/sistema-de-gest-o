import { syncService } from "../services/syncService.js";

export const syncController = {
    async importExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "E-mail e senha são obrigatórios." }); // Oops, reuse error pattern
            }
            const results = await syncService.processExcel(req.file.buffer);
            res.json({ message: "Sincronização concluída", details: results });
        } catch (e) {
            console.error('[SyncController] Import error:', e);
            res.status(500).json({ error: e.message });
        }
    },

    async exportDatabase(req, res) {
        try {
            const workbook = await syncService.generateExport();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="backup_completo_${new Date().toISOString().split('T')[0]}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
        } catch (e) {
            console.error('[SyncController] Export error:', e);
            res.status(500).json({ error: e.message });
        }
    }
};

import express from 'express';
import { createAuditLog, getAuditLogs } from '../services/auditService.js';
// import { requireAdmin } from '../middleware/requireAdmin.js'; // Assuming we want it secured

const router = express.Router();

// POST /api/audit/log
// Permite que o frontend envie logs. 
// Nota: Em um sistema real, você deve validar o usuário pela sessão (JWT)
router.post('/log', async (req, res) => {
    try {
        const logData = req.body;
        // Adicionar IP e User Agent do request se não fornecidos
        logData.ipAddress = logData.ipAddress || req.ip;
        logData.userAgent = logData.userAgent || req.get('user-agent');

        await createAuditLog(logData);
        res.status(201).json({ success: true });
    } catch (e) {
        console.error('Erro na rota de log:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/audit/logs (Somente Admin)
router.get('/logs', async (req, res) => {
    try {
        const { userId, action, resource, startDate, endDate, limit } = req.query;
        const logs = await getAuditLogs({
            userId,
            action,
            resource,
            startDate,
            endDate,
            limit: limit ? parseInt(limit) : 100
        });
        res.json(logs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;

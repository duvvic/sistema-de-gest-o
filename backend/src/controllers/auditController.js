import { auditRepository } from '../audit/auditRepository.js';

export const auditController = {
    async getLogs(req, res) {
        try {
            const { user_id, action, entity, date_from, date_to, limit } = req.query;

            const filters = {};
            if (user_id) filters.user_id = user_id;
            if (action) filters.action = action;
            if (entity) filters.entity = entity;
            if (date_from) filters.date_from = date_from;
            if (date_to) filters.date_to = date_to;
            if (limit) filters.limit = limit;

            const logs = await auditRepository.findAll(filters);
            res.json(logs);
        } catch (error) {
            console.error('[AuditController] Error fetching logs:', error);
            res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
        }
    }
};

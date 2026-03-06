import { supabaseAdmin } from '../config/supabaseAdmin.js';

export const auditRepository = {
    async create(action, resource, resourceId, user, details = {}) {
        try {
            const auditLog = {
                user_id: user.colaboradorId,
                user_role: user.role,
                action: action,
                resource: resource,
                resource_id: resourceId,
                changes: details,
                timestamp: new Date().toISOString(),
                task_name: details.name || details.title || null,
                project_id: details.projectId || null,
                client_id: details.clientId || null
            };
            await supabaseAdmin.from('audit_log').insert(auditLog);
        } catch (e) {
            console.error('[AuditRepository] Failed to log audit:', e);
        }
    },

    async findAll(limit = 200) {
        const { data, error } = await supabaseAdmin
            .from('audit_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

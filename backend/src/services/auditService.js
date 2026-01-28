// backend/src/services/auditService.js
// Serviço de auditoria e logs de segurança (ESM)

import { supabaseAdmin } from '../config/supabaseAdmin.js';

/**
 * Criar registro de auditoria
 */
export async function createAuditLog({
    userId,
    userRole,
    action,
    resource,
    resourceId,
    changes,
    ipAddress,
    userAgent,
    clientId,
    projectId,
    taskId,
    clientName,
    projectName,
    taskName
}) {
    try {
        const { data, error } = await supabaseAdmin
            .from('audit_log')
            .insert([{
                user_id: userId,
                user_role: userRole,
                action,
                resource,
                resource_id: resourceId,
                changes: changes ? JSON.stringify(changes) : null,
                ip_address: ipAddress,
                user_agent: userAgent,
                client_id: clientId,
                project_id: projectId,
                task_id: taskId,
                client_name: clientName,
                project_name: projectName,
                task_name: taskName,
                timestamp: new Date().toISOString()
            }]);

        if (error) {
            console.error('Erro ao criar log de auditoria:', error);
            return null;
        }

        // Enviar alerta em caso de acesso negado
        if (action === 'ACCESS_DENIED') {
            await sendSecurityAlert({
                userId,
                userRole,
                resource,
                timestamp: new Date()
            });
        }

        return data;
    } catch (error) {
        console.error('Erro ao criar log de auditoria:', error);
        return null;
    }
}

/**
 * Buscar logs de auditoria com filtros
 */
export async function getAuditLogs({ userId, action, resource, startDate, endDate, limit = 100 }) {
    try {
        let query = supabaseAdmin
            .from('audit_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        if (action) {
            query = query.eq('action', action);
        }

        if (resource) {
            query = query.ilike('resource', `%${resource}%`);
        }

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }

        if (endDate) {
            query = query.lte('timestamp', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar logs de auditoria:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        return [];
    }
}

/**
 * Enviar alerta de segurança
 */
export async function sendSecurityAlert({ userId, userRole, resource, timestamp }) {
    // TODO: Implementar envio de alerta (email, Slack, etc.)
    console.warn('🚨 ALERTA DE SEGURANÇA:', {
        userId,
        userRole,
        resource,
        timestamp,
        message: 'Tentativa de acesso negado detectada'
    });
}

/**
 * Log de alteração crítica
 */
export async function logCriticalChange(action, resource, user, changes) {
    return await createAuditLog({
        userId: user.id,
        userRole: user.role,
        action,
        resource,
        resourceId: changes.id,
        changes,
        ipAddress: user.ipAddress,
        userAgent: user.userAgent
    });
}

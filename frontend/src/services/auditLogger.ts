// services/auditLogger.ts
import { supabase } from './supabaseClient';

export interface AuditLogParams {
    userId: string | number;
    userRole?: string;
    action: string;
    resource: string;
    resourceId?: string | number;
    changes?: any;
    clientId?: string | number;
    projectId?: string | number;
    taskId?: string | number;
    clientName?: string;
    projectName?: string;
    taskName?: string;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Registra uma ação no log de auditoria via API Backend
 */
export async function logAction(params: AuditLogParams) {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/audit/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: params.userId,
                userRole: params.userRole,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                changes: params.changes,
                clientId: params.clientId,
                projectId: params.projectId,
                taskId: params.taskId,
                clientName: params.clientName,
                projectName: params.projectName,
                taskName: params.taskName
            }),
        });

        if (!response.ok) {
            console.error('[Audit] Falha ao registrar log:', await response.text());
        }
    } catch (error) {
        console.error('[Audit] Erro ao chamar API de auditoria:', error);
    }
}

/**
 * Helper para logar alterações em tarefas
 */
export async function logTaskAction(
    user: { id: string | number, role?: string },
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'COMPLETED' | 'PERCENTAGE_CHANGE' | 'HOURS_LOGGED',
    task: { id: string | number, name: string, projectId: string | number, projectName?: string, clientId: string | number, clientName?: string },
    changes?: any
) {
    return logAction({
        userId: user.id,
        userRole: user.role,
        action,
        resource: 'TASK',
        resourceId: task.id,
        taskId: task.id,
        taskName: task.name,
        projectId: task.projectId,
        projectName: task.projectName,
        clientId: task.clientId,
        clientName: task.clientName,
        changes
    });
}

import { taskRepository } from '../repositories/taskRepository.js';
import { auditService } from '../audit/auditService.js';
import { auditContext } from '../audit/auditMiddleware.js';

const safeNum = (val) => {
    if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
};

function mapStatusToDb(status) {
    switch (status) {
        case 'Done': return 'Concluído';
        case 'In Progress': return 'Andamento';
        case 'Review': return 'Análise';
        case 'Testing': return 'Teste';
        case 'Todo':
        default: return 'Pré-Projeto';
    }
}

function mapPriorityToDb(priority) {
    if (!priority) return null;
    switch (priority) {
        case 'Critical': return 'Crítica';
        case 'High': return 'Alta';
        case 'Medium': return 'Média';
        case 'Low': return 'Baixa';
        default: return null;
    }
}

function mapImpactToDb(impact) {
    if (!impact) return null;
    switch (impact) {
        case 'High': return 'Alto';
        case 'Medium': return 'Médio';
        case 'Low': return 'Baixo';
        default: return null;
    }
}

export const taskService = {
    async getTasks(filters) {
        return await taskRepository.findAll(filters);
    },

    async getTaskById(id) {
        const task = await taskRepository.findById(id);
        if (!task) {
            throw new Error('Tarefa não encontrada');
        }
        return task;
    },

    async createTask(data) {
        let collaboratorId = safeNum(data.developerId);

        if (!collaboratorId && data.developer) {
            collaboratorId = await taskRepository.getCollaboratorIdByName(data.developer);
        }

        const payload = {
            Afazer: data.title || "(Sem título)",
            ID_Projeto: safeNum(data.projectId),
            ID_Cliente: safeNum(data.clientId),
            ID_Colaborador: collaboratorId,
            StatusTarefa: mapStatusToDb(data.status),
            entrega_estimada: data.estimatedDelivery || null,
            entrega_real: data.actualDelivery || null,
            inicio_previsto: data.scheduledStart || null,
            inicio_real: data.actualStart || null,
            Porcentagem: data.progress ?? 0,
            Prioridade: mapPriorityToDb(data.priority),
            Impacto: mapImpactToDb(data.impact),
            Riscos: data.risks || null,
            "Observações": data.notes || null,
            attachment: data.attachment || null,
            description: data.description || null,
            em_testes: data.em_testes ? 1 : 0,
            link_ef: data.link_ef || null,
            estimated_hours: data.estimatedHours || null,
            is_impediment: data.is_impediment ?? false,
        };

        const createdTask = await taskRepository.create(payload);

        // Insere colaboradores se houver
        if (data.collaboratorIds && data.collaboratorIds.length > 0) {
            await taskRepository.updateCollaborators(createdTask.id_tarefa_novo, data.collaboratorIds);
        }

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            action: 'CREATE',
            entity: 'fato_tarefas',
            entityId: createdTask.id_tarefa_novo,
            newData: createdTask,
            ip: context.ip
        });

        return createdTask;
    },

    async updateTask(id, data) {
        // Verifica se a tarefa existe
        const oldTask = await this.getTaskById(id);

        const payload = {};

        if (data.title !== undefined) payload.Afazer = data.title;

        if (data.developerId !== undefined) {
            payload.ID_Colaborador = safeNum(data.developerId);
        } else if (data.developer !== undefined) {
            payload.ID_Colaborador = await taskRepository.getCollaboratorIdByName(data.developer);
        }

        if (data.status !== undefined) payload.StatusTarefa = mapStatusToDb(data.status);
        if (data.estimatedDelivery !== undefined) payload.entrega_estimada = data.estimatedDelivery || null;
        if (data.actualDelivery !== undefined) payload.entrega_real = data.actualDelivery || null;
        if (data.scheduledStart !== undefined) payload.inicio_previsto = data.scheduledStart || null;
        if (data.actualStart !== undefined) payload.inicio_real = data.actualStart || null;
        if (data.progress !== undefined) payload.Porcentagem = data.progress;
        if (data.priority !== undefined) payload.Prioridade = mapPriorityToDb(data.priority);
        if (data.impact !== undefined) payload.Impacto = mapImpactToDb(data.impact);
        if (data.risks !== undefined) payload.Riscos = data.risks || null;
        if (data.notes !== undefined) payload["Observações"] = data.notes || null;
        if (data.attachment !== undefined) payload.attachment = data.attachment || null;
        if (data.description !== undefined) payload.description = data.description || null;
        if (data.em_testes !== undefined) payload.em_testes = data.em_testes ? 1 : 0;
        if (data.link_ef !== undefined) payload.link_ef = data.link_ef || null;
        if (data.estimatedHours !== undefined) payload.estimated_hours = data.estimatedHours || null;
        if (data.is_impediment !== undefined) payload.is_impediment = data.is_impediment;

        if (Object.keys(payload).length > 0) {
            await taskRepository.update(id, payload);
        }

        if (data.collaboratorIds !== undefined) {
            await taskRepository.updateCollaborators(id, data.collaboratorIds);
        }

        const updatedTask = await this.getTaskById(id);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            action: 'UPDATE',
            entity: 'fato_tarefas',
            entityId: id,
            oldData: oldTask,
            newData: updatedTask,
            ip: context.ip
        });

        return updatedTask;
    },

    async deleteTask(id, deleteHours = false, force = false) {
        // Opcionalmente podemos tratar hooks de dependência das horas se demandado
        const oldTask = await this.getTaskById(id).catch(() => null);

        await taskRepository.delete(id);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            action: 'DELETE',
            entity: 'fato_tarefas',
            entityId: id,
            oldData: oldTask,
            ip: context.ip
        });

        return true;
    }
};

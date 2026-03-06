import { timesheetRepository } from '../repositories/timesheetRepository.js';
import { auditService } from '../audit/auditService.js';
import { auditContext } from '../audit/auditMiddleware.js';

const safeNum = (val) => {
    if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
};

const safeString = (val) => {
    if (val === null || val === undefined) return null;
    return String(val);
};

export const timesheetService = {
    async getTimesheets(filters) {
        return await timesheetRepository.findAll(filters);
    },

    async getTimesheetById(id) {
        const timesheet = await timesheetRepository.findById(id);
        if (!timesheet) {
            throw new Error('Apontamento não encontrado');
        }
        return timesheet;
    },

    async createTimesheet(data) {
        // Validation
        if (!data.userId || !data.projectId || !data.taskId || !data.date) {
            throw new Error('Dados incompletos para criação de apontamento');
        }

        const idHorasTrabalhadas = data.id || Date.now() + Math.floor(Math.random() * 1000);

        const payload = {
            ID_Horas_Trabalhadas: safeString(idHorasTrabalhadas),
            ID_Colaborador: safeNum(data.userId),
            ID_Cliente: safeNum(data.clientId),
            ID_Projeto: safeNum(data.projectId),
            id_tarefa_novo: safeNum(data.taskId),
            Data: data.date,
            Horas_Trabalhadas: safeNum(data.totalHours) || 0,
            Hora_Inicio: data.startTime || null,
            Hora_Fim: data.endTime || null,
            Almoco_Deduzido: data.lunchDeduction || null,
            Descricao: data.description || null
        };

        const created = await timesheetRepository.create(payload);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            action: 'CREATE',
            entity: 'horas_trabalhadas',
            entityId: created.ID_Horas_Trabalhadas,
            newData: created,
            ip: context.ip
        });

        return created;
    },

    async updateTimesheet(id, data) {
        const oldTimesheet = await this.getTimesheetById(id);

        const payload = {};
        if (data.userId !== undefined) payload.ID_Colaborador = safeNum(data.userId);
        if (data.clientId !== undefined) payload.ID_Cliente = safeNum(data.clientId);
        if (data.projectId !== undefined) payload.ID_Projeto = safeNum(data.projectId);
        if (data.taskId !== undefined) payload.id_tarefa_novo = safeNum(data.taskId);
        if (data.date !== undefined) payload.Data = data.date;
        if (data.totalHours !== undefined) payload.Horas_Trabalhadas = safeNum(data.totalHours) || 0;
        if (data.startTime !== undefined) payload.Hora_Inicio = data.startTime || null;
        if (data.endTime !== undefined) payload.Hora_Fim = data.endTime || null;
        if (data.lunchDeduction !== undefined) payload.Almoco_Deduzido = data.lunchDeduction || null;
        if (data.description !== undefined) payload.Descricao = data.description || null;

        let updated = oldTimesheet;

        if (Object.keys(payload).length > 0) {
            updated = await timesheetRepository.update(id, payload);
        }

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            action: 'UPDATE',
            entity: 'horas_trabalhadas',
            entityId: id,
            oldData: oldTimesheet,
            newData: updated,
            ip: context.ip
        });

        return updated;
    },

    async deleteTimesheet(id) {
        // Verificar existencia
        const oldTimesheet = await this.getTimesheetById(id);

        await timesheetRepository.delete(id);

        const context = auditContext.getStore() || {};
        await auditService.logAction({
            userId: context.userId,
            action: 'DELETE',
            entity: 'horas_trabalhadas',
            entityId: id,
            oldData: oldTimesheet,
            ip: context.ip
        });

        return true;
    }
};

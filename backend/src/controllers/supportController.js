import { dbFindAll } from '../database/index.js';
import { sendSuccess, handleRouteError } from '../utils/responseHelper.js';

export const supportController = {
    async listProjectMembers(req, res) {
        try {
            const data = await dbFindAll('project_members');
            return sendSuccess(res, data);
        } catch (e) {
            return handleRouteError(res, e, 'SupportController.listProjectMembers');
        }
    },

    async listAbsences(req, res) {
        try {
            const data = await dbFindAll('colaborador_ausencias');
            return sendSuccess(res, data);
        } catch (e) {
            return handleRouteError(res, e, 'SupportController.listAbsences');
        }
    },

    async listHolidays(req, res) {
        try {
            const data = await dbFindAll('feriados');
            return sendSuccess(res, data);
        } catch (e) {
            return handleRouteError(res, e, 'SupportController.listHolidays');
        }
    },

    async listTaskCollaborators(req, res) {
        try {
            // tarefa_colaboradores é a tabela de junção
            const data = await dbFindAll('tarefa_colaboradores');
            return sendSuccess(res, data);
        } catch (e) {
            return handleRouteError(res, e, 'SupportController.listTaskCollaborators');
        }
    }
};


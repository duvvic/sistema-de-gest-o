import { collaboratorService } from '../services/collaboratorService.js';
import { sendSuccess, handleRouteError } from '../utils/responseHelper.js';

export const collaboratorController = {
    async getCollaborators(req, res) {
        try {
            const { includeInactive } = req.query;
            const collaborators = await collaboratorService.getAllCollaborators(includeInactive === 'true');
            return sendSuccess(res, collaborators);
        } catch (e) {
            return handleRouteError(res, e, 'CollaboratorController.getCollaborators');
        }
    }
};

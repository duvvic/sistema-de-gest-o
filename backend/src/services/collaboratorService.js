import { collaboratorRepository } from '../repositories/collaboratorRepository.js';

export const collaboratorService = {
    async getAllCollaborators(includeInactive = false) {
        return await collaboratorRepository.findAll(includeInactive);
    }
};

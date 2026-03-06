import { dbFindAll } from '../database/index.js';

// Colunas existentes na view v_colaboradores:
// id, nome, cargo, nivel, torre, role, email, avatar_url, ativo
const COLAB_SELECT = [
    'id',
    '"ID_Colaborador"',
    'nome',
    '"NomeColaborador"',
    'cargo',
    'nivel',
    'torre',
    'role',
    'email',
    '"avatarUrl"',
    'ativo',
].join(', ');

export const collaboratorRepository = {
    async findAll(includeInactive = false) {
        const query = {
            select: COLAB_SELECT,
            order: { column: 'nome' },
            filters: {}
        };

        if (!includeInactive) {
            query.filters.ativo = true;
        }

        return await dbFindAll('v_colaboradores', query);
    }
};

import { dbUpsert, dbFindAll } from '../database/index.js';

export const syncRepository = {
    async upsert(tableName, rows, onConflict) {
        return await dbUpsert(tableName, rows, { onConflict });
    },

    async findAll(tableName) {
        return await dbFindAll(tableName, { select: '*' });
    },

    async getTaskMap() {
        const data = await dbFindAll('fato_tarefas', { select: 'ID_Tarefa, id_tarefa_novo' });
        return data?.reduce((acc, t) => {
            if (t.ID_Tarefa) acc[t.ID_Tarefa.toString().toLowerCase()] = t.id_tarefa_novo;
            return acc;
        }, {}) || {};
    }
};

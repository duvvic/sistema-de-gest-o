import { supabaseAdmin } from '../config/supabaseAdmin.js';

export const notesRepository = {
    async findByCollaboratorId(colabId) {
        const { data, error } = await supabaseAdmin
            .from('user_notas_links')
            .select('*')
            .eq('colaborador_id', colabId)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async ensureLink(colabId) {
        const { data, error } = await supabaseAdmin
            .rpc('ensure_user_notas_link', { p_colaborador_id: colabId });

        if (error) throw error;
        return data;
    },

    async update(id, data) {
        const { error } = await supabaseAdmin
            .from('user_notas_links')
            .update(data)
            .eq('id', id);

        if (error) throw error;
    },

    async updateByCollaboratorId(colabId, data) {
        const { error } = await supabaseAdmin
            .from('user_notas_links')
            .update(data)
            .eq('colaborador_id', colabId);

        if (error) throw error;
    },

    async updateLastOpened(id) {
        // Fire and forget
        supabaseAdmin
            .from('user_notas_links')
            .update({ last_opened_at: new Date() })
            .eq('id', id)
            .catch(err => console.error('[NotesRepository] Error updating last_opened_at:', err));
    }
};

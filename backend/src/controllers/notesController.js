import { notesService } from '../services/notesService.js';

export const notesController = {
    async getLinks(req, res) {
        try {
            const { ID_Colaborador } = req.colaborador;
            const result = await notesService.getNoteLinks(ID_Colaborador);
            res.json(result);
        } catch (e) {
            console.error('[NotesController] Error fetching links:', e);
            res.status(500).json({ error: e.message || 'Server error' });
        }
    },

    async syncTabs(req, res) {
        try {
            const { ID_Colaborador } = req.colaborador;
            const { tabs } = req.body;
            const cleanTabs = await notesService.syncTabs(ID_Colaborador, tabs);
            res.json({ ok: true, tabs: cleanTabs });
        } catch (e) {
            console.error('[NotesController] Sync error:', e);
            res.status(500).json({ error: e.message || 'Sync error' });
        }
    }
};

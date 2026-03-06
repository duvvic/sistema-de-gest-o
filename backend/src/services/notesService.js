import { notesRepository } from '../repositories/notesRepository.js';

export const notesService = {
    async getNoteLinks(colabId) {
        let existingData = await notesRepository.findByCollaboratorId(colabId);

        if (!existingData || !existingData.base_slug) {
            await notesRepository.ensureLink(colabId);
            existingData = await notesRepository.findByCollaboratorId(colabId);
        }

        if (!existingData || !existingData.base_slug) {
            throw new Error('Could not resolve base_slug');
        }

        let notesConfig = existingData.notes_config || [];
        if (notesConfig.length === 0) {
            notesConfig = [{ key: 'notas', label: 'Minhas Anotações', slug: 'notas', type: 'notas' }];
            await notesRepository.update(existingData.id, { notes_config: notesConfig });
        }

        // Background update
        notesRepository.updateLastOpened(existingData.id);

        const tabs = notesConfig.map(tab => ({
            ...tab,
            url: `https://dontpad.com/${existingData.base_slug}/${tab.slug}`
        }));

        return {
            base_slug: existingData.base_slug,
            tabs
        };
    },

    async syncTabs(colabId, tabs) {
        if (!Array.isArray(tabs)) {
            throw new Error('Tabs must be an array');
        }

        const cleanTabs = tabs.map(t => ({
            key: String(t.key || Date.now()),
            label: String(t.label || 'Nova Nota').slice(0, 50),
            slug: String(t.slug || 'nova-nota').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            type: String(t.type || 'notas')
        }));

        await notesRepository.updateByCollaboratorId(colabId, { notes_config: cleanTabs });

        return cleanTabs;
    }
};

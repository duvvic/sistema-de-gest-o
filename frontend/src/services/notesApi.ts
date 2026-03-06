import { apiRequest } from './apiClient';

export interface NoteTab {
    key: string;
    label: string;
    slug: string;
    type: string;
    url: string;
}

export interface NotesResponse {
    base_slug: string;
    tabs: NoteTab[];
}

export const getNotesLinks = async (): Promise<NotesResponse> => {
    // Agora o apiRequest obtém o token automaticamente
    return apiRequest('/notes/links');
};

export const syncNotes = async (tabs: Omit<NoteTab, 'url'>[]): Promise<{ ok: boolean, tabs: NoteTab[] }> => {
    return apiRequest('/notes/sync', {
        method: 'POST',
        body: JSON.stringify({ tabs })
    });
};

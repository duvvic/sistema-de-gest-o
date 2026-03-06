import { TimesheetEntry } from '@/types';
import { apiRequest } from './apiClient';

export async function createTimesheet(entry: TimesheetEntry): Promise<TimesheetEntry> {
    return await apiRequest('/timesheets', {
        method: 'POST',
        body: JSON.stringify(entry)
    });
}

export async function updateTimesheet(id: string, entry: TimesheetEntry): Promise<TimesheetEntry> {
    return await apiRequest(`/timesheets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(entry)
    });
}

export async function deleteTimesheet(id: string): Promise<void> {
    await apiRequest(`/timesheets/${id}`, {
        method: 'DELETE'
    });
}

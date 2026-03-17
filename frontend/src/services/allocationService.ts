// services/allocationService.ts
// CRUD para task_member_allocations via Backend API
import { TaskMemberAllocation } from '@/types';
import { apiRequest } from './apiClient';

const toFrontend = (row: any): TaskMemberAllocation => ({
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    reservedHours: Number(row.reserved_hours),
});

export async function fetchAllAllocations(): Promise<TaskMemberAllocation[]> {
    const data = await apiRequest<any[]>('/allocations');
    return (data || []).map(toFrontend);
}

export async function fetchAllocationsForTask(taskId: string): Promise<TaskMemberAllocation[]> {
    const data = await apiRequest<any[]>(`/allocations?taskId=${taskId}`);
    return (data || []).map(toFrontend);
}

export async function upsertAllocation(
    taskId: string,
    userId: string,
    reservedHours: number
): Promise<TaskMemberAllocation | null> {
    const result = await apiRequest<any>('/allocations', {
        method: 'POST',
        body: JSON.stringify({
            task_id: taskId,
            user_id: userId,
            reserved_hours: reservedHours,
        })
    });

    if (!result || result.message === 'Allocation removed') return null;
    return toFrontend(result);
}

export async function deleteAllocationsForTask(taskId: string): Promise<void> {
    await apiRequest(`/allocations/task/${taskId}`, {
        method: 'DELETE'
    });
}

export async function saveTaskAllocations(
    taskId: string,
    allocations: { userId: string; reservedHours: number }[]
): Promise<void> {
    await apiRequest('/allocations/bulk', {
        method: 'POST',
        body: JSON.stringify({
            taskId: taskId,
            allocations: allocations.map(a => ({
                userId: a.userId,
                reservedHours: a.reservedHours
            }))
        })
    });
}

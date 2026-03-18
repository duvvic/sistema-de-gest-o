// controllers/allocationController.js
import { dbFindAll, dbInsert, dbDelete } from '../database/index.js';
import { sendSuccess, handleRouteError } from '../utils/responseHelper.js';
import { isAdmUser } from '../utils/security.js';
import { projectService } from '../services/projectService.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { notifyUpdates } from '../utils/realtime.js';

export const allocationController = {
    async list(req, res) {
        try {
            const { taskId } = req.query;
            const query = { filters: {}, in: {} };
            if (taskId) query.filters.task_id = taskId;

            const data = await dbFindAll('task_member_allocations', query);
            return sendSuccess(res, data);
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.list');
        }
    },

    async upsert(req, res) {
        try {
            const { task_id, user_id, reserved_hours } = req.body;

            // 1. Validar se a soma não excede estimated_hours
            const task = await taskRepository.findById(task_id);
            if (!task) throw new Error('Task not found');

            const currentAllocations = await dbFindAll('task_member_allocations', { filters: { task_id } });
            const otherAllocationsSum = currentAllocations
                .filter(a => String(a.user_id) !== String(user_id))
                .reduce((sum, a) => sum + (Number(a.reserved_hours) || 0), 0);

            const totalProposed = otherAllocationsSum + (Number(reserved_hours) || 0);
            if (totalProposed > (Number(task.estimated_hours) || 0) + 0.01) { // margem de erro técnica
                throw new Error(`Soma das alocações (${totalProposed.toFixed(1)}h) excede o esforço estimado da tarefa (${task.estimated_hours}h)`);
            }

            // 2. Delete first to simulate clean upsert if needed
            await dbDelete('task_member_allocations', { task_id, user_id });

            if (reserved_hours > 0) {
                const result = await dbInsert('task_member_allocations', {
                    task_id,
                    user_id,
                    reserved_hours
                });
                await notifyUpdates('allocations', { id: task_id, type: 'allocations_updated' });
                return sendSuccess(res, result);
            }

            await notifyUpdates('allocations', { id: task_id, type: 'allocations_updated' });
            return sendSuccess(res, { message: 'Allocation removed' });
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.upsert');
        }
    },

    async bulkUpdate(req, res) {
        try {
            const { taskId, allocations } = req.body;
            if (!taskId) throw new Error('taskId is required');

            // 1. Validar esforço total
            const task = await taskRepository.findById(taskId);
            if (!task) throw new Error('Task not found');

            const validAllocations = (allocations || []).filter(a => Number(a.reservedHours) > 0);
            const totalRequested = validAllocations.reduce((sum, a) => sum + (Number(a.reservedHours) || 0), 0);

            if (totalRequested > (Number(task.estimated_hours) || 0) + 0.01) {
                throw new Error(`A soma das alocações (${totalRequested.toFixed(1)}h) não pode exceder o esforço estimado da tarefa (${task.estimated_hours}h)`);
            }

            // 2. Transação simulada (Delete followed by multi-insert)
            // No Supabase JS, o insert de array é atômico.
            await dbDelete('task_member_allocations', { task_id: taskId });

            if (validAllocations.length > 0) {
                const inserts = validAllocations.map(a => ({
                    task_id: taskId,
                    user_id: a.userId,
                    reserved_hours: a.reservedHours
                }));
                await dbInsert('task_member_allocations', inserts, { select: false });
            }

            // 3. Notify once
            await notifyUpdates('allocations', { id: taskId, type: 'allocations_bulk_updated' });

            return sendSuccess(res, { message: 'Allocations updated successfully' });
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.bulkUpdate');
        }
    },

    async deleteByTask(req, res) {
        try {
            const { taskId } = req.params;
            await dbDelete('task_member_allocations', { task_id: taskId });
            await notifyUpdates('allocations', { id: taskId, type: 'allocations_deleted' });
            return sendSuccess(res, { message: 'Allocations deleted' });
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.deleteByTask');
        }
    }
};

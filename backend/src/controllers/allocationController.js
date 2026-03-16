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

            // Delete first to simulate clean upsert if needed or just use database logic
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

            // 1. Delete all existing allocations for this task
            await dbDelete('task_member_allocations', { task_id: taskId });

            // 2. Insert new ones
            const validAllocations = (allocations || []).filter(a => Number(a.reservedHours) > 0);

            for (const a of validAllocations) {
                await dbInsert('task_member_allocations', {
                    task_id: taskId,
                    user_id: a.userId,
                    reserved_hours: a.reservedHours
                });
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

import { adminService } from '../services/adminService.js';

export const adminController = {
    async getClients(req, res) {
        try {
            const { includeInactive } = req.query;
            const clients = await adminService.listClients(includeInactive);
            res.json(clients);
        } catch (e) {
            res.status(e.status || 500).json({ error: e.message });
        }
    },

    async getProjects(req, res) {
        try {
            const projects = await adminService.listProjects(req.query);
            res.json(projects);
        } catch (e) {
            res.status(e.status || 500).json({ error: e.message });
        }
    },

    async getCollaborators(req, res) {
        try {
            const { includeInactive } = req.query;
            const collaborators = await adminService.listCollaborators(includeInactive);
            res.json(collaborators);
        } catch (e) {
            res.status(e.status || 500).json({ error: e.message });
        }
    },

    async getTasks(req, res) {
        try {
            const tasks = await adminService.listTasks(req.query);
            res.json(tasks);
        } catch (e) {
            res.status(e.status || 500).json({ error: e.message });
        }
    },

    async deleteProject(req, res) {
        try {
            const { id } = req.params;
            const { force } = req.query;
            await adminService.deactivateProject(id, force, req.user);
            res.json({ success: true, message: 'Projeto desativado com sucesso.' });
        } catch (e) {
            console.error('[AdminController] Error deleting project:', e);
            res.status(e.status || 500).json({ error: e.message, hasTasks: e.hasTasks });
        }
    },

    async deleteTask(req, res) {
        try {
            const { id } = req.params;
            const { force, deleteHours } = req.query;
            await adminService.deactivateTask(id, force, deleteHours, req.user);
            res.json({ success: true, message: 'Tarefa excluída logicamente com sucesso.' });
        } catch (e) {
            console.error('[AdminController] Error deleting task:', e);
            res.status(e.status || 500).json({ error: e.message, hasHours: e.hasHours });
        }
    },

    async getAuditLogs(req, res) {
        try {
            const { limit } = req.query;
            const logs = await adminService.listAuditLogs(limit);
            res.json(logs);
        } catch (e) {
            res.status(e.status || 500).json({ error: e.message });
        }
    }
};

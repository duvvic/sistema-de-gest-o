import express from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminController } from '../controllers/adminController.js';

const router = express.Router();

// Domain: Clients
router.get('/clients', requireAdmin, adminController.getClients);

// Domain: Projects
router.get('/projects', requireAdmin, adminController.getProjects);
router.delete('/projects/:id', requireAdmin, adminController.deleteProject);

// Domain: Collaborators
router.get('/collaborators', requireAdmin, adminController.getCollaborators);

// Domain: Tasks
router.get('/tasks', requireAdmin, adminController.getTasks);
router.delete('/tasks/:id', requireAdmin, adminController.deleteTask);

// Domain: Audit Logs
router.get('/audit-logs', requireAdmin, adminController.getAuditLogs);

export default router;

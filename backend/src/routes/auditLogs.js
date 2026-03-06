import express from 'express';
import { auditController } from '../controllers/auditController.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

router.get('/', requireAdmin, auditController.getLogs);

export default router;

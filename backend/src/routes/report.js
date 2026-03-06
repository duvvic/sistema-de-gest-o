import express from 'express';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { reportController } from '../controllers/reportController.js';

const router = express.Router();

router.get('/preview', requireAdmin, reportController.getPreview);
router.get('/powerbi', requireAdmin, reportController.getPowerBi);
router.get('/excel', requireAdmin, reportController.getExcel);
router.put('/project-budgets', requireAdmin, reportController.updateBudgets);

export default router;

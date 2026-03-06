import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { timesheetController } from '../controllers/timesheetController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', timesheetController.getTimesheets);
router.get('/:id', timesheetController.getTimesheetById);
router.post('/', timesheetController.createTimesheet);
router.put('/:id', timesheetController.updateTimesheet);
router.delete('/:id', timesheetController.deleteTimesheet);

export default router;

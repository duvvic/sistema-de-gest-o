import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { timesheetController } from '../controllers/timesheetController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', timesheetController.getTimesheets);
router.get('/:id', timesheetController.getTimesheetById);
router.post('/', timesheetController.createTimesheet);
router.put('/:id', timesheetController.updateTimesheet);
router.delete('/:id', timesheetController.deleteTimesheet);

export default router;

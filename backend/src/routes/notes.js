import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { notesController } from '../controllers/notesController.js';

const router = Router();

router.get('/links', requireAuth, notesController.getLinks);
router.post('/sync', requireAuth, notesController.syncTabs);

export default router;

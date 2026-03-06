import express from 'express';
import { projectController } from '../controllers/projectController.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', roleMiddleware(['ADMIN', 'MANAGER', 'USER']), projectController.getProjects);
router.get('/:id', roleMiddleware(['ADMIN', 'MANAGER', 'USER']), projectController.getById);
router.post('/', roleMiddleware(['ADMIN', 'MANAGER']), projectController.create);
router.put('/:id', roleMiddleware(['ADMIN', 'MANAGER']), projectController.update);
router.delete('/:id', roleMiddleware(['ADMIN']), projectController.delete);

export default router;

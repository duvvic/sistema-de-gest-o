import { Router } from 'express';
import { roleMiddleware } from '../middleware/roleMiddleware.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { clientController } from '../controllers/clientController.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createClientSchema, updateClientSchema } from '../validations/clientSchema.js';

const router = Router();

router.use(authMiddleware);

router.get('/', roleMiddleware(['ADMIN', 'MANAGER', 'USER']), clientController.getClients);
router.get('/:id', roleMiddleware(['ADMIN', 'MANAGER', 'USER']), clientController.getById);
router.post('/', roleMiddleware(['ADMIN', 'MANAGER']), validate(createClientSchema), clientController.create);
router.put('/:id', roleMiddleware(['ADMIN', 'MANAGER']), validate(updateClientSchema), clientController.update);
router.delete('/:id', roleMiddleware(['ADMIN']), clientController.delete);

export default router;

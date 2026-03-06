import { Router } from "express";
import { userController } from "../controllers/userController.js";

const router = Router();

/**
 * POST /api/admin/users/admin/users
 * body: { nome, cargo, email, password, papel, ativo }
 */
router.post("/admin/users", userController.createUser);

export default router;

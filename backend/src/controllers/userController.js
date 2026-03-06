import { userService } from '../services/userService.js';

export const userController = {
    async createUser(req, res) {
        try {
            const { nome, cargo, email, password, role, papel, ativo } = req.body;

            if (!nome || !email || !password) {
                return res.status(400).json({ error: "Campos obrigatórios: nome, email, password" });
            }

            const result = await userService.createUser({
                nome,
                cargo,
                email,
                password,
                role: role || papel || "resource",
                ativo: ativo ?? true
            });

            return res.json({ ok: true, ...result });
        } catch (e) {
            console.error('[UserController] Error creating user:', e);
            return res.status(e.status || 500).json({ error: e.message });
        }
    }
};

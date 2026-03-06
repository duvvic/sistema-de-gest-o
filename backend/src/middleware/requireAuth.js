import { Router } from 'express';
import { supabaseAuth } from '../config/supabaseAuth.js';
import { userRepository } from '../repositories/userRepository.js';

const router = Router();

export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token) {
            return res.status(401).json({ error: 'Missing token' });
        }

        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
        if (userErr || !userData?.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const authUser = userData.user;
        const email = (authUser.email || '').trim().toLowerCase();

        // Identificar colaborador
        let colab = await userRepository.findByEmail(email);

        if (!colab) {
            return res.status(403).json({ error: 'Collaborator not found' });
        }

        req.colaborador = colab;
        next();
    } catch (error) {
        console.error('[AuthMiddleware] Auth check error:', error);
        res.status(500).json({ error: 'Internal auth error' });
    }
}

export default router;

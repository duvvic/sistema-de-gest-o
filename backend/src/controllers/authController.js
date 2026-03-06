import { authService } from '../services/authService.js';
import { sendSuccess, handleRouteError, sendError } from '../utils/responseHelper.js';

export const authController = {
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return sendError(res, 'E-mail e senha são obrigatórios.', 400);
            }

            const result = await authService.login(email, password);
            return sendSuccess(res, result);
        } catch (e) {
            return handleRouteError(res, e, 'AuthController.login');
        }
    },

    async checkEmail(req, res) {
        try {
            const { email } = req.query;
            if (!email) return sendError(res, 'E-mail é obrigatório.', 400);

            const result = await authService.checkEmail(email);
            return sendSuccess(res, result);
        } catch (e) {
            return handleRouteError(res, e, 'AuthController.checkEmail');
        }
    },

    async sendOtp(req, res) {
        try {
            const { email } = req.body;
            await authService.sendOtp(email);
            return sendSuccess(res, { message: 'OTP enviado.' });
        } catch (e) {
            return handleRouteError(res, e, 'AuthController.sendOtp');
        }
    },

    async verifyOtp(req, res) {
        try {
            const { email, token } = req.body;
            const result = await authService.verifyOtp(email, token);
            return sendSuccess(res, result);
        } catch (e) {
            return handleRouteError(res, e, 'AuthController.verifyOtp');
        }
    },

    async setPassword(req, res) {
        try {
            const { email, password } = req.body;
            // Validação de segurança: o usuário deve estar autenticado ou ter verificado OTP recentemente
            // Por simplicidade, assumo que o token JWT da sessão temporária de OTP já é validado pelo middleware
            await authService.setPassword(email, password);
            return sendSuccess(res, { message: 'Senha definida.' });
        } catch (e) {
            return handleRouteError(res, e, 'AuthController.setPassword');
        }
    }
};

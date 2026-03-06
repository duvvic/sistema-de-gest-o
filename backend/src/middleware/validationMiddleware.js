import { sendError } from "../utils/responseHelper.js";

/**
 * Middleware para validar o corpo da requisição usando Zod
 * @param {import('zod').ZodSchema} schema 
 */
export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (err) {
        const errorMessage = err.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') || 'Dados inválidos';
        return sendError(res, errorMessage, 400);
    }
};

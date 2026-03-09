import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { sendError } from "../utils/responseHelper.js";
import { auditContext } from "../audit/auditMiddleware.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware para validar o token JWT do Supabase
 */
export async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return sendError(res, "Token não enviado", 401);
        }

        const token = authHeader.split(' ')[1]?.trim();

        if (!token) {
            logger.warn('Token ausente ou malformado após Bearer', 'AuthMiddleware');
            return sendError(res, "Token malformado", 401);
        }

        // Log para depuração de token (mascarado)
        if (token.length < 20) {
            logger.warn(`Token suspeito (muito curto): "${token}"`, 'AuthMiddleware');
        }

        // Valida o token diretamente com o Supabase Auth
        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !data?.user) {
            let decoded = null;
            try {
                const jwt = await import('jsonwebtoken');
                decoded = jwt.default.decode(token);
            } catch (e) {
                logger.error('Erro ao decodificar token para log', 'AuthMiddleware');
            }

            logger.warn(`Token inválido ou expirado. Erro: ${error?.message || 'Nenhum erro retornado'}. Payload decodificado: ${JSON.stringify(decoded)}`, 'AuthMiddleware');
            return sendError(res, "Sessão inválida ou expirada", 401);
        }

        // Recuperar role e dados adicionais do banco (dim_colaboradores)
        const { data: colab } = await supabaseAdmin
            .from('v_colaboradores')
            .select('id, nome, role, ativo')
            .eq('email', data.user.email)
            .maybeSingle();

        if (colab?.ativo === false) {
            return sendError(res, "Sua conta está desativada. Entre em contato com o administrador.", 403);
        }

        // Define o usuário padronizado no request
        req.user = {
            id: String(colab?.id || data.user.id),
            nome: colab?.nome || data.user.email,
            email: data.user.email,
            role: colab?.role || 'resource'
        };

        // Atualiza o contexto de auditoria com os dados reais do colaborador
        const ctx = auditContext.getStore();
        if (ctx) {
            ctx.userId = req.user.id;
            ctx.userName = req.user.nome;
        }

        next();
    } catch (err) {
        logger.error(`Erro inesperado na autenticação: ${err.message}`, 'AuthMiddleware', err);
        return sendError(res, "Erro interno na autenticação", 500);
    }
}

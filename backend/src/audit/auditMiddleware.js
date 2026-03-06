import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage permite armazenar estado através de promessas sem passar nas assinaturas da função
export const auditContext = new AsyncLocalStorage();

export const auditMiddleware = (req, res, next) => {
    // Tenta obter o ID do usuário de headers comuns se não tiver no req.user
    const userId = req.user?.id || req.headers['x-user-id'] || req.headers['user-id'] || req.headers['authorization']?.split(' ')[1] || null;

    const context = {
        userId,
        ip: req.ip || req.connection?.remoteAddress || 'unknown'
    };

    // Roda toda a requisição dentro desse contexto
    auditContext.run(context, () => {
        next();
    });
};

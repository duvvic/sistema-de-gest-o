import { userRepository } from '../repositories/userRepository.js';
import { hashPassword } from '../utils/crypto.js';
import { auditService } from '../audit/auditService.js';
import { auditContext } from '../audit/auditMiddleware.js';
import { logger } from '../utils/logger.js';

export const authService = {
    async login(email, password) {
        const normalizedEmail = email.trim().toLowerCase();

        // 1. Busca colaborador
        const colab = await userRepository.findByEmail(normalizedEmail);
        if (!colab) {
            logger.warn(`[Login] E-mail não encontrado: ${normalizedEmail}`, 'AuthService');
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        if (colab.ativo === false) {
            logger.warn(`[Login] Usuário desativado: ${normalizedEmail}`, 'AuthService');
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // 2. Validar senha localmente
        const creds = await userRepository.getCredentials(colab.id);
        if (!creds || !creds.password_hash) {
            logger.warn(`[Login] Senha não definida para: ${normalizedEmail}`, 'AuthService');
            const error = new Error('Senha não definida. Use "Primeiro Acesso" para criar sua senha.');
            error.status = 401;
            throw error;
        }

        const inputHash = hashPassword(password);
        if (inputHash !== creds.password_hash) {
            logger.warn(`[Login] Senha incorreta para: ${normalizedEmail}`, 'AuthService');
            const error = new Error('Credenciais inválidas.');
            error.status = 401;
            throw error;
        }

        // 3. Tenta signIn com Supabase Auth (a sessão precisa ser do Supabase para o token funcionar)
        let authData;
        const signInResult = await userRepository.signInWithPassword(normalizedEmail, password);

        if (signInResult.error) {
            // Senha correta local, mas falhou no Supabase. Sincronizar automáticamente.
            logger.warn(`[Login] Sincronizando senha com Supabase Auth para: ${normalizedEmail}`, 'AuthService');
            try {
                const authUser = await userRepository.getAuthUserByEmail(normalizedEmail);
                if (authUser) {
                    const { error: updateErr } = await userRepository.adminUpdatePassword(authUser.id, password);
                    if (updateErr) throw updateErr;
                } else {
                    // Criar usuário no Auth com a senha fornecida
                    const { error: createErr } = await userRepository.adminCreateUser(normalizedEmail, password);
                    if (createErr) throw createErr;
                }

                // Tentar novamente
                const retry = await userRepository.signInWithPassword(normalizedEmail, password);
                if (retry.error) {
                    logger.error(`[Login] Falha mesmo após sincronização: ${retry.error.message}`, 'AuthService');
                    const error = new Error('Credenciais inválidas.');
                    error.status = 401;
                    throw error;
                }
                authData = retry.data;
            } catch (syncErr) {
                logger.error(`[Login] Erro de sincronização com Supabase: ${syncErr.message}`, 'AuthService');
                const error = new Error('Credenciais inválidas.');
                error.status = 401;
                throw error;
            }
        } else {
            authData = signInResult.data;
        }

        // 4. Log de Auditoria
        const ctx = auditContext.getStore();
        await auditService.logAction({
            userId: String(colab.id),
            userName: colab.nome,
            action: 'LOGIN',
            entity: 'auth',
            entityId: String(colab.id),
            ip: ctx?.ip
        });

        return {
            user: {
                id: String(colab.id),
                name: colab.nome,
                email: colab.email,
                role: colab.role || 'resource',
                avatarUrl: colab.avatarUrl,
                cargo: colab.cargo,
                active: true
            },
            session: authData.session
        };
    },

    async checkEmail(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const colab = await userRepository.findByEmail(normalizedEmail);
        if (!colab) return { exists: false };

        const credentials = await userRepository.getCredentials(colab.id);
        return {
            exists: true,
            hasPassword: !!credentials?.password_hash,
            colaborador: {
                id: colab.id,
                name: colab.nome,
                role: colab.role
            }
        };
    },

    async sendOtp(email) {
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await userRepository.signInWithOtp(normalizedEmail);
        if (error) throw error;
    },

    async verifyOtp(email, token) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await userRepository.verifyOtp(normalizedEmail, token);
        if (error) throw error;

        const colab = await userRepository.findByEmail(normalizedEmail);
        return {
            session: data.session,
            user: colab ? {
                id: String(colab.id),
                name: colab.nome,
                email: colab.email,
                role: colab.role
            } : null
        };
    },

    async setPassword(email, password) {
        const normalizedEmail = email.trim().toLowerCase();
        logger.info(`[SetPassword] Iniciando para: ${normalizedEmail}`, 'AuthService');

        // 1. Atualiza no Supabase Auth (admin role)
        const authUser = await userRepository.getAuthUserByEmail(normalizedEmail);
        if (!authUser) {
            logger.info(`[SetPassword] Usuário não existe no Auth. Criando...`, 'AuthService');
            const { error } = await userRepository.adminCreateUser(normalizedEmail, password);
            if (error) throw error;
        } else {
            logger.info(`[SetPassword] Atualizando senha no Supabase Auth (${authUser.id})`, 'AuthService');
            const { error } = await userRepository.adminUpdatePassword(authUser.id, password);
            if (error) throw error;
        }

        // 2. Atualiza hash no user_credentials (local)
        const colab = await userRepository.findByEmail(normalizedEmail);
        if (colab) {
            logger.info(`[SetPassword] Sincronizando hash local (Colab ID: ${colab.id})`, 'AuthService');
            const hash = hashPassword(password);
            await userRepository.upsertCredentials(colab.id, hash);
        } else {
            logger.warn(`[SetPassword] Colaborador não encontrado em dim_colaboradores: ${normalizedEmail}`, 'AuthService');
        }
    }
};

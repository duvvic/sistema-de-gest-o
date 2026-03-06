import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { dbFindAll, dbUpsert } from '../database/index.js';

export const userRepository = {
    async findByEmail(email) {
        return await dbFindAll('v_colaboradores', {
            select: 'id, nome, email, role, ativo, "avatarUrl", cargo',
            filters: { email: email.toLowerCase() },
            maybeSingle: true
        });
    },

    async getCredentials(userId) {
        return await dbFindAll('user_credentials', {
            select: 'password_hash',
            filters: { colaborador_id: userId },
            maybeSingle: true
        });
    },

    async upsertCredentials(userId, hash) {
        return await dbUpsert('user_credentials', {
            colaborador_id: userId,
            password_hash: hash
        }, { onConflict: 'colaborador_id' });
    },

    async signInWithPassword(email, password) {
        return await supabaseAdmin.auth.signInWithPassword({
            email,
            password
        });
    },

    async signInWithOtp(email) {
        return await supabaseAdmin.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true }
        });
    },

    async verifyOtp(email, token) {
        // Tenta 'email', 'recovery' e 'signup'
        let res = await supabaseAdmin.auth.verifyOtp({ email, token, type: 'email' });
        if (res.error) res = await supabaseAdmin.auth.verifyOtp({ email, token, type: 'recovery' });
        if (res.error) res = await supabaseAdmin.auth.verifyOtp({ email, token, type: 'signup' });
        return res;
    },

    async updateAuthPassword(password) {
        // Isso requer que o usuário esteja autenticado com o token no cabeçalho ou usando admin.updateUserById
        // Como o service role tem privilégios, podemos usar admin.updateUserById se tivermos o userId do Supabase
        // Mas o auth index do Supabase é diferente do ID_Colaborador. 
        // Vamos usar getUserByEmail para pegar o id do Supabase.
    },

    async adminUpdatePassword(supabaseUserId, password) {
        return await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
            password: password
        });
    },

    async getAuthUserByEmail(email) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;
        return data.users.find(u => u.email === email);
    },

    async adminCreateUser(email, password) {
        return await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
    },

    async listAuthUsers() {
        return await supabaseAdmin.auth.admin.listUsers();
    },

    async upsertCollaborator(payload) {
        // Tenta upsert pela coluna 'email'
        try {
            return await dbUpsert('dim_colaboradores', payload, { onConflict: 'email' });
        } catch (error) {
            // Fallback para a coluna legada '"E-mail"'
            return await dbUpsert('dim_colaboradores', payload, { onConflict: '"E-mail"' });
        }
    }
};

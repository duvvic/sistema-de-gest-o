import { supabaseAuth } from '../config/supabaseAuth.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

function getBearer(req) {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth) {
        console.warn('[requireAdmin] No Authorization header found. Headers:', JSON.stringify(req.headers));
        return null;
    }
    const [type, token] = auth.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
        console.warn(`[requireAdmin] Invalid auth header format: "${auth}"`);
        return null;
    }
    return token;
}

export async function requireAdmin(req, res, next) {
    try {
        const token = getBearer(req);
        if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
        if (userErr || !userData?.user) {
            return res.status(401).json({ error: 'Invalid session token' });
        }

        const authUser = userData.user;
        const authUserId = authUser.id;
        const email = (authUser.email || '').trim().toLowerCase();

        // 1) tenta pelo auth_user_id
        let { data: colab, error: colabErr } = await supabaseAdmin
            .from('v_colaboradores')
            .select('id, nome, role, ativo, email')
            .eq('auth_user_id', authUserId)
            .maybeSingle();

        if ((colabErr || !colab) && email) {
            // 2) fallback por email padronizado
            const { data: rColab } = await supabaseAdmin
                .from('v_colaboradores')
                .select('id, nome, role, ativo, email')
                .eq('email', email)
                .maybeSingle();
            colab = rColab;
        }

        if (!colab) {
            console.warn(`[requireAdmin] User not found in dim_colaboradores. Email: ${email}, AuthUserId: ${authUserId}`);
            return res.status(403).json({ error: 'User not mapped in dim_colaboradores' });
        }

        if (colab.ativo === false) {
            console.warn(`[requireAdmin] User is inactive. Email: ${email}`);
            return res.status(403).json({ error: 'User is inactive' });
        }

        const role = String(colab.role || '').toLowerCase();
        console.log(`[requireAdmin] User: ${colab.nome}, Email: ${email}, Role: "${role}"`);

        // Comentado a pedido do usuário: "permitir todos a todos"
        // Aceita qualquer valor que contenha 'admin' ou 'administrador' ou 'system_admin'
        // const isAdmin = role.includes('admin') || role.includes('administrador') || role === 'system_admin';

        // if (!isAdmin) {
        //     console.warn(`[requireAdmin] Access denied. User role: "${role}" is not admin.`);
        //     return res.status(403).json({ error: 'Admin only' });
        // }

        req.user = {
            authUserId,
            email,
            colaboradorId: colab.id,
            nome: colab.nome,
            role: role
        };

        next();
    } catch (e) {
        console.error('[requireAdmin] error:', e);
        return res.status(500).json({ error: 'Internal error' });
    }
}

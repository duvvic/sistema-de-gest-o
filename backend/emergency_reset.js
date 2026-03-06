// emergency_reset.js
import { userRepository } from './src/repositories/userRepository.js';
import { hashPassword } from './src/utils/crypto.js';

async function reset() {
    const email = 'manutencao@nic-labs.com.br';
    const newPass = 'NicLabs@2026!';

    console.log(`[Emergency] Resetando senha para: ${email}`);

    // 1. Busca usuário no Supabase Auth
    const authUser = await userRepository.getAuthUserByEmail(email);
    if (!authUser) {
        console.log('Usuário não encontrado no Supabase Auth. Criando...');
        const { data, error } = await userRepository.adminCreateUser(email, newPass);
        if (error) throw error;
        console.log('Usuário criado no Supabase Auth.');
    } else {
        console.log(`Usuário encontrado no Auth (ID: ${authUser.id}). Atualizando senha...`);
        const { error } = await userRepository.adminUpdatePassword(authUser.id, newPass);
        if (error) throw error;
        console.log('Senha atualizada no Supabase Auth.');
    }

    // 2. Busca e Atualiza no BD Local
    const colab = await userRepository.findByEmail(email);
    if (!colab) {
        console.error('ERRO: Colaborador não encontrado em dim_colaboradores. Verifique se o e-mail no banco está correto.');
    } else {
        const hash = hashPassword(newPass);
        await userRepository.upsertCredentials(colab.ID_Colaborador, hash);
        console.log(`Senha sincronizada no BD Local para ID: ${colab.ID_Colaborador}.`);
    }

    console.log('\n--- SUCESSO ---');
    console.log(`E-mail: ${email}`);
    console.log(`Nova Senha: ${newPass}`);
    console.log('Tente logar agora com essas credenciais.');
}

reset().catch(e => {
    console.error('ERRO NO RESET:', e.message);
    process.exit(1);
});

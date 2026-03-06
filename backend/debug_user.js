import { userRepository } from './src/repositories/userRepository.js';

async function test() {
    const email = 'manutencao@nic-labs.com.br';
    console.log('Buscando:', email);
    const colab = await userRepository.findByEmail(email);
    console.log('Colaborador:', colab);
    if (colab) {
        const creds = await userRepository.getCredentials(colab.ID_Colaborador);
        console.log('Credenciais:', creds ? 'Encontradas' : 'Não encontradas');

        const { data, error } = await userRepository.listAuthUsers();
        if (error) console.error('Erro listando auth users:', error);
        else {
            const authUser = data.users.find(u => u.email === email);
            console.log('Auth User (Supabase):', authUser ? 'Existe' : 'Não existe');
        }
    }
}

test().catch(console.error);

import { userRepository } from './src/repositories/userRepository.js';

async function testLogin() {
    const email = 'manutencao@nic-labs.com.br';
    const password = 'senhateste'; // Troque aqui se souber a senha que o user acha correta
    console.log('Testando Login para:', email);
    const result = await userRepository.signInWithPassword(email, password);
    console.log('Resultado:', JSON.stringify(result, null, 2));
}

testLogin().catch(console.error);

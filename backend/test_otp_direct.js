import { supabaseAdmin } from './src/config/supabaseAdmin.js';

async function testOtp() {
    const email = 'test@example.com';
    console.log('Testando OTP para:', email);
    const result = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true }
    });
    console.log('Resultado:', JSON.stringify(result, null, 2));
}

testOtp().catch(console.error);

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Use o token do Victor (parcialmente reconstruído da história para teste de formato)
// NOTA: Se o token estiver incompleto ele falhará, mas queremos ver o erro.
const token = "eyJhbGciOiJIUzI1NiIsImtpZCI6IndNTmg1ZUtGOWR0OTVqcGIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2F3YmZpYnBteWxrZmtmcWFyY2xrLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkOTEzYjRhYS1mYzZmLTQwN2UtYmRiYy1kZThlM2VhYTI3YTEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzczMDYxODIzLCJpYXQiOjE3NzMwNTgyMjMsImVtYWlsIjoidmljdG9yLnBpY29saUBuaWMtbGFicy5jb20uYnIiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoidmljdG9yLnBpY29saUBuaWMtbGFicy5jb20uYnIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJkOTEzYjRhYS1mYzZmLTQwN2UtYmRiYy1kZThlM2VhYTI3YTEifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJhdCI6MTc3MzA1ODIyM31dfQ.3rI897G99XWRE8_J0H793V3V889_X889_X889_X889_X889_X";

async function test() {
    console.log('Testando Supabase REST API direto...');
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/dim_colaboradores?select=*&limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Resposta:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Erro no fetch:', e);
    }
}

test();

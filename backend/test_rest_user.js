import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const url = `${process.env.SUPABASE_URL}/rest/v1/dim_colaboradores?id_colaborador=eq.41`;
const headers = {
    "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
};

const bodyObj = { "nome_colaborador": "Ricardo Duraes", "email": "ricardo@test.com", "cargo": "Developer", "nivel": "Pleno", "role": "Admin", "ativo": true, "custo_hora": 100, "horas_disponiveis_dia": 8, "horas_disponiveis_mes": 160, "torre": "N/A" };

console.log("Sending to", url);

fetch(url, { method: 'PATCH', headers, body: JSON.stringify(bodyObj) })
    .then(async res => {
        console.log('Status:', res.status);
        console.log('Text:', await res.text());
    })
    .catch(console.error);

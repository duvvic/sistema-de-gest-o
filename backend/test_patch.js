import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const url = `${process.env.SUPABASE_URL}/rest/v1/dim_colaboradores?id_colaborador=eq.41`;
const headers = {
    "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
};

const bodyObj = {
    nome_colaborador: "Test Update",
    ativo: true
};

console.log("Sending PATCH to", url);

fetch(url, { method: 'PATCH', headers, body: JSON.stringify(bodyObj) })
    .then(async res => {
        console.log('Status:', res.status);
        console.log('Text:', await res.text());
    })
    .catch(console.error);

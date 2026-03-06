import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const url = `${process.env.SUPABASE_URL}/rest/v1/fato_tarefas`;
const headers = {
    "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json"
};

const bodyObj = {
    ID_Projeto: 1,
    ID_Cliente: 1,
    ID_Colaborador: 41,
    Afazer: "Testing fallback",
    StatusTarefa: "Pré-Projeto",
    Porcentagem: 0,
    Prioridade: "Media",
    is_impediment: false,
    "coluna_inventada": 123
};

console.log("Sending to", url);

fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyObj) })
    .then(async res => {
        console.log('Status:', res.status);
        console.log('Text:', await res.text());
    })
    .catch(console.error);

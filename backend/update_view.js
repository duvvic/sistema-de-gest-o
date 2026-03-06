import { supabaseAdmin } from './src/config/supabaseAdmin.js';

async function updateView() {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        sql_string: `CREATE OR REPLACE VIEW v_clientes AS SELECT "ID_Cliente" AS id, "NomeCliente" AS nome, "NewLogo" AS logo_url, "Pais" AS pais, "cnpj", "telefone", "email_contato", "ativo" FROM dim_clientes WHERE deleted_at IS NULL;`
    });
    console.log(data, error);
}

updateView();

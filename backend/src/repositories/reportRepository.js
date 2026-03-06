import { supabaseAdmin } from '../config/supabaseAdmin.js';

export const reportRepository = {
    async fetchRelatorioHorasCustos({ startDate, endDate, clientIds, projectIds, collaboratorIds, statuses }) {
        const { data, error } = await supabaseAdmin.rpc('relatorio_horas_custos', {
            p_data_ini: startDate,
            p_data_fim: endDate,
            p_clientes: clientIds,
            p_projetos: projectIds,
            p_colaboradores: collaboratorIds,
            p_status: statuses
        });

        if (error) throw error;
        return data || [];
    }
};

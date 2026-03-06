import fs from 'fs';

const fetchOptions = {
    method: 'POST',
    body: JSON.stringify({
        "developerId": 41,
        "projectId": 2, // Assume it has some project
        "clientId": 3,
        "title": "A Tarefa Nova",
        "description": "Uma desc...",
        "status": "In Progress",
        "priority": "High",
        "impact": "Low",
        "estimatedHours": 10,
        "developer": "Luane",
        "project": "Proj ABC"
    })
};

let finalPath = "/fato_tarefas";

const isMutation = true;
const mapStatusToDb = (s) => s;
const mapPriorityToDb = (s) => s;
const mapImpactToDb = (s) => s;

if (isMutation && fetchOptions.body && typeof fetchOptions.body === 'string') {
    const payloadMappings = {
        '/dim_colaboradores': {
            'NomeColaborador': 'nome_colaborador',
            'Cargo': 'cargo',
            'hourlyCost': 'custo_hora',
            'dailyAvailableHours': 'horas_disponiveis_dia',
            'monthlyAvailableHours': 'horas_disponiveis_mes'
        },
        '/fato_tarefas': {
            'projectId': 'ID_Projeto',
            'clientId': 'ID_Cliente',
            'developerId': 'ID_Colaborador',
            'title': 'Afazer',
            'status': 'StatusTarefa',
            'estimatedDelivery': 'entrega_estimada',
            'actualDelivery': 'entrega_real',
            'scheduledStart': 'inicio_previsto',
            'actualStart': 'inicio_real',
            'progress': 'Porcentagem',
            'priority': 'Prioridade',
            'impact': 'Impacto',
            'risks': 'Riscos',
            'notes': 'Observações',
            'estimatedHours': 'estimated_hours',
        }
    };

    const targetTable = Object.keys(payloadMappings).find(t => finalPath.includes(t));
    if (targetTable) {
        try {
            const bodyObj = JSON.parse(fetchOptions.body);
            const map = payloadMappings[targetTable];

            const newBody = {};

            // Set of known extra columns that frontend might send correctly in their db name
            const validExtraColumns = {
                '/dim_colaboradores': ['deleted_at', 'ativo', 'role', 'torre', 'nivel', 'email', 'avatar_url', 'atrasado', 'nome_colaborador', 'cargo', 'custo_hora', 'horas_disponiveis_dia', 'horas_disponiveis_mes'],
                '/fato_tarefas': ['em_testes', 'deleted_at', 'attachment', 'link_ef', 'is_impediment', 'task_weight', 'ID_Projeto', 'ID_Cliente', 'ID_Colaborador', 'Afazer', 'StatusTarefa', 'entrega_estimada', 'entrega_real', 'inicio_previsto', 'inicio_real', 'Porcentagem', 'Prioridade', 'Impacto', 'Riscos', 'Observações', 'estimated_hours', 'dias_atraso', 'ID_Tarefa']
            };

            for (const key of Object.keys(bodyObj)) {
                let mappedKey = map[key];
                let isKnownColumn = false;

                // Se a chave não estiver no mapa (ex: 'developer', 'project'), verificar se já é o nome de uma coluna
                if (!mappedKey) {
                    const validCols = validExtraColumns[targetTable] || [];
                    if (validCols.includes(key)) {
                        mappedKey = key;
                        isKnownColumn = true;
                    }
                } else {
                    isKnownColumn = true;
                }

                if (isKnownColumn && mappedKey) {
                    let val = bodyObj[key];

                    if (targetTable === '/fato_tarefas') {
                        if (key === 'status' || mappedKey === 'StatusTarefa') val = mapStatusToDb(val);
                        if (key === 'priority' || mappedKey === 'Prioridade') val = mapPriorityToDb(val);
                        if (key === 'impact' || mappedKey === 'Impacto') val = mapImpactToDb(val);
                        if (key === 'em_testes' || mappedKey === 'em_testes') val = val ? 1 : 0;
                    }

                    newBody[mappedKey] = val;
                }
            }

            fetchOptions.body = JSON.stringify(newBody);
        } catch (e) {
            console.error('API Client Fallback Body Transform Error:', e);
        }
    }
}


console.log(fetchOptions.body);

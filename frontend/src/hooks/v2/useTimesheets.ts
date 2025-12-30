import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTimesheets } from '@/services/api';
import { supabase } from '@/services/supabaseClient';
import { TimesheetEntry } from '@/types';

export const useTimesheets = () => {
    const queryClient = useQueryClient();

    // Query para buscar apontamentos
    const timesheetsQuery = useQuery({
        queryKey: ['timesheets'],
        queryFn: async () => {
            const rawTimesheets = await fetchTimesheets();

            // Normalização dos dados (igual ao useAppData)
            return (rawTimesheets || []).map((r: any) => ({
                id: String(r.ID_Horas_Trabalhadas || crypto.randomUUID()),
                userId: String(r.ID_Colaborador || ''),
                userName: r.dim_colaboradores?.NomeColaborador || r.userName || '',
                clientId: String(r.ID_Cliente || ''),
                projectId: String(r.ID_Projeto || ''),
                taskId: String(r.id_tarefa_novo || ''),
                date: r.Data || (new Date()).toISOString().split('T')[0],
                startTime: r.Hora_Inicio || '09:00',
                endTime: r.Hora_Fim || '18:00',
                totalHours: Number(r.Horas_Trabalhadas || 0),
                lunchDeduction: !!r.Almoco_Deduzido,
                description: r.Descricao || undefined,
            })) as TimesheetEntry[];
        },
    });

    // Mutation para criar apontamento
    const createTimesheetMutation = useMutation({
        mutationFn: async (entry: Partial<TimesheetEntry>) => {
            // Mapeando para o formato do banco
            const dbPayload = {
                ID_Colaborador: Number(entry.userId),
                ID_Cliente: Number(entry.clientId),
                ID_Projeto: Number(entry.projectId),
                id_tarefa_novo: Number(entry.taskId),
                Data: entry.date,
                Horas_Trabalhadas: entry.totalHours,
                Hora_Inicio: entry.startTime,
                Hora_Fim: entry.endTime,
                Almoco_Deduzido: entry.lunchDeduction,
                Descricao: entry.description
            };

            const { data, error } = await supabase
                .from('horas_trabalhadas')
                .insert([dbPayload])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
    });

    return {
        timesheets: timesheetsQuery.data || [],
        isLoading: timesheetsQuery.isLoading,
        isError: timesheetsQuery.isError,
        createTimesheet: createTimesheetMutation.mutateAsync,
        isCreating: createTimesheetMutation.isPending,
    };
};

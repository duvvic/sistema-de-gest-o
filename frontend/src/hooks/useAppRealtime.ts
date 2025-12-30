import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';

export function useAppRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        console.log('[Realtime] Setting up subscriptions...');

        const channel = supabase.channel('global-changes');

        // Users (dim_colaboradores)
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'dim_colaboradores' },
            () => {
                console.log('[Realtime] dim_colaboradores changed. Invalidating users...');
                queryClient.invalidateQueries({ queryKey: ['users'] });
            }
        );

        // Clients (dim_clientes)
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'dim_clientes' },
            () => {
                console.log('[Realtime] dim_clientes changed. Invalidating clients...');
                queryClient.invalidateQueries({ queryKey: ['clients'] });
            }
        );

        // Projects (dim_projetos)
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'dim_projetos' },
            () => {
                console.log('[Realtime] dim_projetos changed. Invalidating projects...');
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                // If we had detailed project queries, we could invalidate them too
                // queryClient.invalidateQueries({ queryKey: ['project'] });
            }
        );

        // Tasks (fato_tarefas_v2) - Listen to the underlying table
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'fato_tarefas_v2' },
            () => {
                console.log('[Realtime] fato_tarefas_v2 changed. Invalidating tasks...');
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                queryClient.invalidateQueries({ queryKey: ['task'] });
            }
        );

        // Timesheets (horas_trabalhadas)
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'horas_trabalhadas' },
            () => {
                console.log('[Realtime] horas_trabalhadas changed. Invalidating timesheets...');
                queryClient.invalidateQueries({ queryKey: ['timesheets'] });
            }
        );

        // Project Members (project_members)
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'project_members' },
            () => {
                console.log('[Realtime] project_members changed. Invalidating project_members...');
                queryClient.invalidateQueries({ queryKey: ['project_members'] });
            }
        );

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[Realtime] Subscribed to global changes.');
            }
        });

        return () => {
            console.log('[Realtime] Unsubscribing...');
            supabase.removeChannel(channel);
        };
    }, [queryClient]);
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClients } from '@/services/api';
import { supabase } from '@/services/supabaseClient';
import { Client } from '@/types';

export const useClients = () => {
    const queryClient = useQueryClient();

    // Query para buscar clientes
    const clientsQuery = useQuery({
        queryKey: ['clients'],
        queryFn: fetchClients,
    });

    // Mutation para criar cliente
    const createClientMutation = useMutation({
        mutationFn: async (newClient: Partial<Client>) => {
            const { data, error } = await supabase
                .from('dim_clientes')
                .insert([{
                    NomeCliente: newClient.name,
                    NewLogo: newClient.logoUrl,
                    ativo: true
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            // Invalida o cache e força um refetch
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        },
    });

    return {
        clients: clientsQuery.data || [],
        isLoading: clientsQuery.isLoading,
        isError: clientsQuery.isError,
        createClient: createClientMutation.mutateAsync,
        isCreating: createClientMutation.isPending,
    };
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, deactivateUser } from '@/services/api';
import { supabase } from '@/services/supabaseClient';
import { User } from '@/types';

export const useUsers = () => {
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
    });

    const deactivateUserMutation = useMutation({
        mutationFn: deactivateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
            const payload: any = {};
            if (updates.name !== undefined) payload.NomeColaborador = updates.name;
            if (updates.email !== undefined) payload["E-mail"] = updates.email;
            if (updates.cargo !== undefined) payload.Cargo = updates.cargo;
            if (updates.role !== undefined) payload.papel = updates.role === 'admin' ? 'Administrador' : 'Padrão';
            if (updates.active !== undefined) payload.ativo = updates.active;
            if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

            const { error } = await supabase
                .from('dim_colaboradores')
                .update(payload)
                .eq('ID_Colaborador', Number(userId));

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    return {
        users: usersQuery.data || [],
        isLoading: usersQuery.isLoading,
        isError: usersQuery.isError,
        deactivateUser: deactivateUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
        isUpdating: updateUserMutation.isPending,
    };
};

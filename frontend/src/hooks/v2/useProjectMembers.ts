import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';

export interface ProjectMember {
    projectId: string;
    userId: string;
}

export const useProjectMembers = (projectId?: string) => {
    const queryClient = useQueryClient();

    const fetchMembers = async (): Promise<ProjectMember[]> => {
        let query = supabase.from('project_members').select('id_projeto, id_colaborador');

        if (projectId) {
            query = query.eq('id_projeto', Number(projectId));
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((row: any) => ({
            projectId: String(row.id_projeto),
            userId: String(row.id_colaborador)
        }));
    };

    const membersQuery = useQuery({
        queryKey: ['project_members', projectId],
        queryFn: fetchMembers,
    });

    const addMemberMutation = useMutation({
        mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
            const { error } = await supabase
                .from('project_members')
                .upsert(
                    { id_projeto: Number(projectId), id_colaborador: Number(userId) },
                    { onConflict: 'id_projeto, id_colaborador' }
                );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_members'] });
            // Se estivermos vendo membros de um projeto específico, invalidar essa query também
            if (projectId) {
                queryClient.invalidateQueries({ queryKey: ['project_members', projectId] });
            }
        }
    });

    const removeMemberMutation = useMutation({
        mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) => {
            const { error } = await supabase
                .from('project_members')
                .delete()
                .match({ id_projeto: Number(projectId), id_colaborador: Number(userId) });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project_members'] });
            if (projectId) {
                queryClient.invalidateQueries({ queryKey: ['project_members', projectId] });
            }
        }
    });

    return {
        projectMembers: membersQuery.data || [],
        isLoading: membersQuery.isLoading,
        isError: membersQuery.isError,
        addMember: addMemberMutation.mutateAsync,
        removeMember: removeMemberMutation.mutateAsync
    };
};

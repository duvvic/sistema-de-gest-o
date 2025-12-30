import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects } from '@/services/api';
import { supabase } from '@/services/supabaseClient';
import { Project } from '@/types';

export const useProjects = (clientId?: string) => {
    const queryClient = useQueryClient();

    const projectsQuery = useQuery({
        queryKey: ['projects', clientId],
        queryFn: async () => {
            const allProjects = await fetchProjects();
            if (clientId) {
                return allProjects.filter(p => p.clientId === clientId);
            }
            return allProjects;
        },
    });

    const createProjectMutation = useMutation({
        mutationFn: async (newProject: Partial<Project>) => {
            const { data, error } = await supabase
                .from('dim_projetos')
                .insert([{
                    projeto: newProject.name,
                    ID_Cliente: Number(newProject.clientId),
                    Descricao: newProject.description,
                    ativo: true
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    return {
        projects: projectsQuery.data || [],
        isLoading: projectsQuery.isLoading,
        isError: projectsQuery.isError,
        createProject: createProjectMutation.mutateAsync,
        isCreating: createProjectMutation.isPending,
    };
};

// frontend/src/hooks/useDeveloperData.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as developerApi from '@/services/developerApi';

/**
 * Hook para buscar clientes do colaborador
 */
export function useMyClients() {
    const { currentUser } = useAuth();
    const [clients, setClients] = useState<developerApi.DeveloperClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function loadClients() {
            if (!currentUser) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Salvar userId no localStorage para o interceptor
                localStorage.setItem('currentUserId', currentUser.id);
                localStorage.setItem('currentUserRole', currentUser.role);

                const data = await developerApi.fetchMyClients();
                setClients(data);
            } catch (err) {
                setError(err as Error);
                console.error('Error loading clients:', err);
            } finally {
                setLoading(false);
            }
        }

        loadClients();
    }, [currentUser]);

    return { clients, loading, error, refetch: () => { } };
}

/**
 * Hook para buscar projetos de um cliente
 */
export function useMyClientProjects(clientId: string | null) {
    const [projects, setProjects] = useState<developerApi.DeveloperProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function loadProjects() {
            if (!clientId) {
                setProjects([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await developerApi.fetchMyClientProjects(clientId);
                setProjects(data);
            } catch (err) {
                setError(err as Error);
                console.error('Error loading projects:', err);
            } finally {
                setLoading(false);
            }
        }

        loadProjects();
    }, [clientId]);

    return { projects, loading, error };
}

/**
 * Hook para buscar tarefas de um projeto
 */
export function useMyProjectTasks(projectId: string | null) {
    const [tasks, setTasks] = useState<developerApi.DeveloperTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function loadTasks() {
            if (!projectId) {
                setTasks([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await developerApi.fetchMyProjectTasks(projectId);
                setTasks(data);
            } catch (err) {
                setError(err as Error);
                console.error('Error loading tasks:', err);
            } finally {
                setLoading(false);
            }
        }

        loadTasks();
    }, [projectId]);

    return { tasks, loading, error };
}

/**
 * Hook para buscar estatísticas do colaborador
 */
export function useMyStats() {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState<developerApi.DeveloperStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function loadStats() {
            if (!currentUser) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await developerApi.fetchMyStats();
                setStats(data);
            } catch (err) {
                setError(err as Error);
                console.error('Error loading stats:', err);
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, [currentUser]);

    return { stats, loading, error };
}

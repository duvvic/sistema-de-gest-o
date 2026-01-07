// frontend/src/services/developerApi.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Configuração do axios com interceptor para adicionar headers de auth
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar autenticação
apiClient.interceptors.request.use((config) => {
    // TODO: Substituir por token JWT real quando implementar auth
    // Por enquanto, pega do localStorage ou contexto
    const userId = localStorage.getItem('currentUserId');
    const userRole = localStorage.getItem('currentUserRole');

    if (userId) {
        config.headers['X-User-Id'] = userId;
    }
    if (userRole) {
        config.headers['X-User-Role'] = userRole;
    }

    return config;
});

// Tipos de resposta
export interface DeveloperClient {
    id: string;
    name: string;
    logoUrl: string;
    projectCount: number;
}

export interface DeveloperProject {
    id: string;
    name: string;
    clientId: string;
    status?: string;
    description?: string;
    budget?: number;
    estimatedDelivery?: string;
    manager?: string;
    startDate?: string;
    taskCount: number;
    completedTasks: number;
}

export interface DeveloperTask {
    id: string;
    title: string;
    projectId: string;
    clientId: string;
    developerId: string;
    developer: string;
    status: 'Todo' | 'In Progress' | 'Review' | 'Done';
    progress: number;
    priority?: 'Critical' | 'High' | 'Medium' | 'Low';
    impact?: 'High' | 'Medium' | 'Low';
    risks?: string;
    notes?: string;
    description?: string;
    attachment?: string;
    estimatedDelivery?: string;
    actualDelivery?: string;
    scheduledStart?: string;
    actualStart?: string;
}

export interface DeveloperStats {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    totalClients: number;
}

/**
 * Busca clientes vinculados ao colaborador logado
 */
export async function fetchMyClients(): Promise<DeveloperClient[]> {
    try {
        const response = await apiClient.get<DeveloperClient[]>('/developer/clients');
        return response.data;
    } catch (error) {
        console.error('Error fetching my clients:', error);
        throw error;
    }
}

/**
 * Busca projetos de um cliente específico para o colaborador
 */
export async function fetchMyClientProjects(clientId: string): Promise<DeveloperProject[]> {
    try {
        const response = await apiClient.get<DeveloperProject[]>(`/developer/clients/${clientId}/projects`);
        return response.data;
    } catch (error) {
        console.error('Error fetching client projects:', error);
        throw error;
    }
}

/**
 * Busca tarefas de um projeto específico para o colaborador
 */
export async function fetchMyProjectTasks(projectId: string): Promise<DeveloperTask[]> {
    try {
        const response = await apiClient.get<DeveloperTask[]>(`/developer/projects/${projectId}/tasks`);
        return response.data;
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        throw error;
    }
}

/**
 * Busca estatísticas gerais do colaborador
 */
export async function fetchMyStats(): Promise<DeveloperStats> {
    try {
        const response = await apiClient.get<DeveloperStats>('/developer/stats');
        return response.data;
    } catch (error) {
        console.error('Error fetching my stats:', error);
        throw error;
    }
}

export default {
    fetchMyClients,
    fetchMyClientProjects,
    fetchMyProjectTasks,
    fetchMyStats,
};

// contexts/DataContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Task, Project, Client, User, TimesheetEntry } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

interface DataContextType {
    clients: Client[];
    projects: Project[];
    tasks: Task[];
    users: User[];
    timesheetEntries: TimesheetEntry[];
    projectMembers: { projectId: string, userId: string }[];
    loading: boolean;
    error: string | null;

    // Actions (para updates otimistas se necessário)
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    setTimesheetEntries: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
    setProjectMembers: React.Dispatch<React.SetStateAction<{ projectId: string, userId: string }[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, isLoading: authLoading } = useAuth();

    // Hook que faz o fetch centralizado
    const {
        users: loadedUsers,
        clients: loadedClients,
        projects: loadedProjects,
        tasks: loadedTasks,
        timesheetEntries: loadedTimesheets,
        projectMembers: loadedProjectMembers,
        loading: dataLoading,
        error: dataError
    } = useAppData();

    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
    const [projectMembers, setProjectMembers] = useState<{ projectId: string, userId: string }[]>([]);

    // Sincronizar dados globais quando o carregamento termina
    useEffect(() => {
        if (dataLoading) return;

        setClients(loadedClients);
        setProjects(loadedProjects);
        setTasks(loadedTasks);
        setTimesheetEntries(loadedTimesheets);
        setProjectMembers(loadedProjectMembers || []);
        setUsers(loadedUsers);
    }, [dataLoading, loadedClients, loadedProjects, loadedTasks, loadedUsers, loadedTimesheets, loadedProjectMembers]);

    // Realtime para Membros (opcional, mas bom manter se já existia algo similar)
    useEffect(() => {
        const channel = supabase
            .channel('project_members_changes_global')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_members'
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setProjectMembers(prev => [...prev, {
                        projectId: String(payload.new.id_projeto),
                        userId: String(payload.new.id_colaborador)
                    }]);
                } else if (payload.eventType === 'DELETE') {
                    setProjectMembers(prev => prev.filter(pm =>
                        !(pm.projectId === String(payload.old.id_projeto) && pm.userId === String(payload.old.id_colaborador))
                    ));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const value = {
        clients,
        projects,
        tasks,
        users,
        timesheetEntries,
        projectMembers,
        loading: dataLoading && (clients.length === 0), // Só mostra loading se estiver vazio
        error: dataError,
        setClients,
        setProjects,
        setTasks,
        setUsers,
        setTimesheetEntries,
        setProjectMembers
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};

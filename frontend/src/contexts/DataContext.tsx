// contexts/DataContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Task, Project, Client, User, TimesheetEntry } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { mapDbTaskToTask, mapDbTimesheetToEntry, mapDbProjectToProject, mapDbUserToUser } from '@/utils/normalizers';

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

    // Ref para evitar ciclos de re-subscrição e garantir acesso a dados frescos nos callbacks
    const usersRef = React.useRef<User[]>([]);
    useEffect(() => { usersRef.current = users; }, [users]);

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

    // === REALTIME SUBSCRIPTIONS ===
    useEffect(() => {
        const channel = supabase
            .channel('app_realtime_changes')
            // 1. Clientes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_clientes' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newItem: Client = { id: String(payload.new.ID_Cliente), name: payload.new.NomeCliente, logoUrl: payload.new.NewLogo, active: payload.new.ativo };
                    setClients(prev => [...prev, newItem]);
                } else if (payload.eventType === 'UPDATE') {
                    setClients(prev => prev.map(c => c.id === String(payload.new.ID_Cliente)
                        ? { ...c, name: payload.new.NomeCliente, logoUrl: payload.new.NewLogo, active: payload.new.ativo } : c));
                } else if (payload.eventType === 'DELETE') {
                    setClients(prev => prev.filter(c => c.id !== String(payload.old.ID_Cliente)));
                }
            })
            // 2. Projetos
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_projetos' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const project = mapDbProjectToProject(payload.new);
                    setProjects(prev => {
                        const exists = prev.find(p => p.id === project.id);
                        if (exists) return prev.map(p => p.id === project.id ? project : p);
                        return [...prev, project];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setProjects(prev => prev.filter(p => p.id !== String(payload.old.ID_Projeto)));
                }
            })
            // 3. Tarefas (Com Normalização)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fato_tarefas' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const userMap = new Map((usersRef.current).map(u => [u.id, u]));
                    const task = mapDbTaskToTask(payload.new, userMap);
                    setTasks(prev => {
                        const exists = prev.find(t => t.id === task.id);
                        if (exists) return prev.map(t => t.id === task.id ? { ...t, ...task } : t);
                        return [task, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id !== String(payload.old.id_tarefa_novo)));
                }
            })
            // 4. Colaboradores
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_colaboradores' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const user = mapDbUserToUser(payload.new);
                    setUsers(prev => {
                        const exists = prev.find(u => u.id === user.id);
                        if (exists) return prev.map(u => u.id === user.id ? user : u);
                        return [...prev, user];
                    });
                }
            })
            // 5. Timesheet
            .on('postgres_changes', { event: '*', schema: 'public', table: 'horas_trabalhadas' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const entry = mapDbTimesheetToEntry(payload.new);
                    setTimesheetEntries(prev => {
                        const exists = prev.find(e => e.id === entry.id);
                        if (exists) return prev.map(e => e.id === entry.id ? entry : e);
                        return [entry, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setTimesheetEntries(prev => prev.filter(e => e.id !== String(payload.old.ID_Horas_Trabalhadas)));
                }
            })
            // 6. Membros
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setProjectMembers(prev => [...prev, { projectId: String(payload.new.id_projeto), userId: String(payload.new.id_colaborador) }]);
                } else if (payload.eventType === 'DELETE') {
                    setProjectMembers(prev => prev.filter(pm => !(pm.projectId === String(payload.old.id_projeto) && pm.userId === String(payload.old.id_colaborador))));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const value = React.useMemo(() => ({
        clients,
        projects,
        tasks,
        users,
        timesheetEntries,
        projectMembers,
        loading: dataLoading && (clients.length === 0),
        error: dataError,
        setClients,
        setProjects,
        setTasks,
        setUsers,
        setTimesheetEntries,
        setProjectMembers
    }), [clients, projects, tasks, users, timesheetEntries, projectMembers, dataLoading, dataError]);

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

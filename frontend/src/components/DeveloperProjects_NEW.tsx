// frontend/src/components/DeveloperProjects_NEW.tsx
// VERSÃO REFATORADA - USA BACKEND API AO INVÉS DE FILTROS LOCAIS
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, FolderKanban, CheckSquare, Clock } from "lucide-react";
import { useMyClients, useMyClientProjects, useMyProjectTasks } from '@/hooks/useDeveloperData';

type ViewType = 'clients' | 'projects' | 'tasks';

const DeveloperProjects_NEW: React.FC = () => {
    const navigate = useNavigate();

    const [currentView, setCurrentView] = useState<ViewType>('clients');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Hooks customizados que buscam do backend
    const { clients, loading: loadingClients, error: errorClients } = useMyClients();
    const { projects, loading: loadingProjects } = useMyClientProjects(selectedClientId);
    const { tasks, loading: loadingTasks } = useMyProjectTasks(selectedProjectId);

    // Agrupa tarefas por status
    const tasksByStatus = {
        Todo: tasks.filter(t => t.status === "Todo"),
        InProgress: tasks.filter(t => t.status === "In Progress"),
        Review: tasks.filter(t => t.status === "Review"),
        Done: tasks.filter(t => t.status === "Done"),
    };

    return (
        <div className="h-full flex flex-col rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

            {/* VISTA 1: CLIENTES */}
            {currentView === 'clients' && (
                <div className="flex-1 flex flex-col p-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projetos</h1>
                        <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Escolha um cliente para ver os projetos</p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingClients ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--brand)' }}></div>
                            </div>
                        ) : errorClients ? (
                            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--danger)' }}>
                                <p>Erro ao carregar clientes</p>
                                <p className="text-sm mt-2">{errorClients.message}</p>
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                                <Building2 className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                <p>Nenhum cliente vinculado encontrado.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {clients.map(client => (
                                    <div
                                        key={client.id}
                                        onClick={() => {
                                            setSelectedClientId(client.id);
                                            setCurrentView('projects');
                                        }}
                                        className="border rounded-2xl p-6 hover:shadow-lg transition-all text-left group cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-16 h-16 rounded-xl border p-2 flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                                                {client.logoUrl ? (
                                                    <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Building2 className="w-8 h-8" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{client.name}</h3>
                                                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{client.projectCount} projetos vinculados</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VISTA 2: PROJETOS */}
            {currentView === 'projects' && selectedClientId && (
                <div className="flex-1 flex flex-col">
                    <div className="px-8 py-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-app)' }}>
                        <button
                            onClick={() => {
                                setCurrentView('clients');
                                setSelectedClientId(null);
                            }}
                            className="p-2 rounded-full transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                {clients.find(c => c.id === selectedClientId)?.name}
                            </h1>
                            <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Selecione um projeto</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        <h2 className="text-sm font-bold uppercase tracking-widest mb-6 px-1" style={{ color: 'var(--text-muted)' }}>Projetos</h2>
                        {loadingProjects ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--brand)' }}></div>
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
                                <FolderKanban className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                <p>Nenhum projeto vinculado encontrado para este cliente.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.map(project => (
                                    <div
                                        key={project.id}
                                        onClick={() => {
                                            setSelectedProjectId(project.id);
                                            setCurrentView('tasks');
                                        }}
                                        className="border rounded-2xl p-6 hover:shadow-lg transition-all text-left group cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                                    >
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
                                            <p className="text-sm mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{project.description || 'Sem descrição'}</p>
                                        </div>

                                        <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2" style={{ color: 'var(--text-default)' }}>
                                                    <CheckSquare className="w-4 h-4 text-green-500" />
                                                    Progresso
                                                </span>
                                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{project.completedTasks}/{project.taskCount} tarefas</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full overflow-hidden mt-1" style={{ backgroundColor: 'var(--border)' }}>
                                                <div
                                                    className="h-full bg-green-500 rounded-full"
                                                    style={{ width: `${project.taskCount > 0 ? (project.completedTasks / project.taskCount) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VISTA 3: TAREFAS */}
            {currentView === 'tasks' && selectedProjectId && (
                <div className="flex-1 flex flex-col">
                    <div className="px-8 py-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-app)' }}>
                        <button
                            onClick={() => {
                                setCurrentView('projects');
                                setSelectedProjectId(null);
                            }}
                            className="p-2 rounded-full transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                {projects.find(p => p.id === selectedProjectId)?.name}
                            </h1>
                            <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Minhas Tarefas
                            </p>
                        </div>
                        <button
                            className="px-6 py-2.5 bg-[#4c1d95] text-white rounded-xl font-bold shadow-lg hover:bg-[#3b1675] transition-all flex items-center gap-2"
                            onClick={() => navigate(`/tasks/new?project=${selectedProjectId}&client=${selectedClientId}`)}
                        >
                            <CheckSquare className="w-4 h-4" />
                            Criar Tarefa
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {loadingTasks ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--brand)' }}></div>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
                                <CheckSquare className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                <p>Nenhuma tarefa criada por você neste projeto.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {tasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        className="border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border)' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-app)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    >
                                        <p className="text-sm font-semibold truncate mb-2" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                                                <div className="h-full bg-[#4c1d95]" style={{ width: `${task.progress}%` }} />
                                            </div>
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-default)' }}>{task.progress}%</span>
                                        </div>
                                        {task.status !== 'Done' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
                                                }}
                                                className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-purple-50 hover:bg-[#4c1d95] text-[#4c1d95] hover:text-white rounded-lg transition-all text-xs font-bold"
                                            >
                                                <Clock className="w-4 h-4" />
                                                Apontar Tarefa
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeveloperProjects_NEW;

import React, { useMemo, useState } from 'react';
import { Client, Project, Task } from '../types';
import { ArrowLeft, Edit2, Trash2, Building2, Save, X, Users, FolderKanban, CheckSquare, Plus, Search } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface ClientDetailsViewProps {
  client: Client;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  onEdit: (client: Client) => void;
  onDeactivate: (clientId: string, reason: string) => void;
  onClientClick: (clientId: string) => void;
  onUserClick?: (userId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onProjectClick?: (projectId: string) => void;
  onNewProject?: () => void;
  onNewTask?: () => void;
}

const ClientDetailsView: React.FC<ClientDetailsViewProps> = ({
  client,
  projects,
  tasks,
  onBack,
  onEdit,
  onDeactivate,
  onClientClick,
  onUserClick,
  onTaskClick,
  onProjectClick,
  onNewProject,
  onNewTask,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [viewMode, setViewMode] = useState<'info' | 'participant-tasks' | 'client-tasks'>('info');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'inprogress' | 'review' | 'done'>('all');
  const [infoTab, setInfoTab] = useState<'projects' | 'tasks'>('projects');
  const [taskSearch, setTaskSearch] = useState('');
  const [formData, setFormData] = useState<Partial<Client>>({
    name: client.name,
    logoUrl: client.logoUrl,
  });

  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientTasks = tasks.filter(t => t.clientId === client.id);

  // Participantes (colaboradores) que já atuaram em tarefas desse cliente
  const participants = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    clientTasks.forEach(t => {
      if (t.developerId && t.developer) {
        map.set(t.developerId, { id: t.developerId, name: t.developer });
      }
    });
    return Array.from(map.values());
  }, [clientTasks]);

  const participantTasks = useMemo(() => {
    if (!selectedParticipantId) return [] as Task[];
    return clientTasks.filter(t => t.developerId === selectedParticipantId);
  }, [clientTasks, selectedParticipantId]);

  const selectedParticipant = selectedParticipantId
    ? participants.find(p => p.id === selectedParticipantId)
    : undefined;

  const getStatusStyle = (status: Task['status']) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-100 text-blue-700';
      case 'Review':
        return 'bg-amber-100 text-amber-700';
      case 'Done':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-slate-100';
      case 'In Progress': return 'bg-blue-50';
      case 'Review': return 'bg-purple-50';
      case 'Done': return 'bg-green-50';
      default: return 'bg-slate-100';
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'text-slate-600';
      case 'In Progress': return 'text-blue-600';
      case 'Review': return 'text-purple-600';
      case 'Done': return 'text-green-600';
      default: return 'text-slate-600';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não definida';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 'Não definida';
    return parsed.toLocaleDateString('pt-BR');
  };

  // Datas vindas do banco (campos tipo date): Criado (data de criação) e Contrato (data fim)
  const createdDateStr = (client as any)?.Criado as string | undefined;
  const contractEndStr = (client as any)?.Contrato as string | undefined;
   const deactivationReason = (client as any)?.Desativado as string | undefined;
  const isActive = client.active !== false;

  const diffInMonths = (from: Date, to: Date) => (
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  );

  const monthsActive = useMemo(() => {
    try {
      const now = new Date();
      const created = createdDateStr ? new Date(createdDateStr) : now;
      return Math.max(0, diffInMonths(created, now));
    } catch {
      return 0;
    }
  }, [createdDateStr]);

  const contractInfo = useMemo(() => {
    if (!contractEndStr) return { hasContract: false, endDate: null as Date | null, monthsLeft: 0 };
    try {
      const now = new Date();
      const end = new Date(contractEndStr);
      const monthsLeft = diffInMonths(now, end);
      return { hasContract: true, endDate: end, monthsLeft: Math.max(0, monthsLeft) };
    } catch {
      return { hasContract: false, endDate: null, monthsLeft: 0 };
    }
  }, [contractEndStr]);

  const filteredClientTasks = useMemo(() => {
    if (!taskSearch.trim()) return clientTasks;
    const q = taskSearch.toLowerCase();
    return clientTasks.filter(t =>
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.developer && t.developer.toLowerCase().includes(q))
    );
  }, [clientTasks, taskSearch]);

  const tasksByStatus = useMemo(() => {
    return {
      'Todo': filteredClientTasks.filter(t => t.status === 'Todo'),
      'In Progress': filteredClientTasks.filter(t => t.status === 'In Progress'),
      'Review': filteredClientTasks.filter(t => t.status === 'Review'),
      'Done': filteredClientTasks.filter(t => t.status === 'Done'),
    };
  }, [filteredClientTasks]);

  // Auto-scroll listas para o fim (de baixo para cima) quando houver overflow
  React.useEffect(() => {
    if (infoTab !== 'tasks') return;
    const lists = document.querySelectorAll<HTMLDivElement>('[data-task-list="true"]');
    lists.forEach((el) => {
      // aguarda próximo frame para garantir altura correta
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    });
  }, [infoTab, statusFilter, taskSearch, filteredClientTasks.length]);

  const handleSaveEdit = () => {
    if (!formData.name?.trim()) {
      alert('Nome da empresa é obrigatório');
      return;
    }
    onEdit({
      ...client,
      name: formData.name,
      logoUrl: formData.logoUrl || client.logoUrl,
    });
    setIsEditMode(false);
  };

  const handleDeactivateConfirm = () => {
    if (!deactivateReason.trim()) {
      alert('Por favor, informe o motivo da desativação');
      return;
    }
    onDeactivate(client.id, deactivateReason);
    setIsDeactivateModalOpen(false);
    setDeactivateReason('');
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Detalhes do Cliente</h1>
            <p className="text-sm text-slate-500 mt-1">Gerenciar informações e ações</p>
          </div>
        </div>

        {!isEditMode && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditMode(true)}
              className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </button>
             {isActive && (
               <button
                 onClick={() => setIsDeactivateModalOpen(true)}
                 className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
               >
                 <Trash2 className="w-4 h-4" />
                 Desativar
               </button>
             )}
          </div>
        )}

        {isEditMode && (
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              onClick={() => {
                setIsEditMode(false);
                setFormData({ name: client.name, logoUrl: client.logoUrl });
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          {viewMode === 'info' && (
            <>
              {/* Info Section (viewMode: info) */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-8">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {/* Logo */}
                  <div className="w-32 h-32 flex-shrink-0 bg-white border-2 border-purple-200 rounded-2xl flex items-center justify-center p-2 shadow-md">
                    {isEditMode && formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt={formData.name}
                        className="w-full h-full object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150?text=Logo')}
                      />
                    ) : (
                      <img
                        src={client.logoUrl}
                        alt={client.name}
                        className="w-full h-full object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150?text=Logo')}
                      />
                    )}
                  </div>

                  {/* Edit Mode */}
                  {isEditMode ? (
                    <div className="flex-1 space-y-4">
                      <div>
                         {!isActive && deactivationReason && (
                           <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                             <p className="text-xs text-red-600 font-medium">Motivo da desativação</p>
                             <p className="text-sm text-red-800 mt-1">{deactivationReason}</p>
                           </div>
                         )}
                        <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Empresa</label>
                        <input
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">URL do Logo</label>
                        <input
                          type="text"
                          value={formData.logoUrl || ''}
                          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                          placeholder="https://exemplo.com/logo.png"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-800">{client.name}</h2>
                        {!isActive && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            Desativada
                          </span>
                        )}
                      </div>
                      {!isActive && deactivationReason && (
                        <div className="border border-red-200 bg-red-50 text-red-800 text-sm rounded-lg px-3 py-2">
                          <span className="font-medium">Motivo:</span> {deactivationReason}
                        </div>
                      )}
                      <div className="space-y-2 text-slate-600">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-purple-600" />
                          <span>ID: {client.id}</span>
                        </div>
                        {/* Removido: campo Projetos */}
                        {/* Informações de datas: sempre dentro de "Informações" */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white border border-slate-200 rounded-lg p-3">
                            <p className="text-xs text-slate-500">{isActive ? 'Tempo de parceria' : 'Tempo que ficou ativo'}</p>
                            <p className="text-lg font-bold text-slate-800">{monthsActive} meses</p>
                            {createdDateStr && (
                              <p className="text-xs text-slate-500 mt-1">Criado em {new Date(createdDateStr).toLocaleDateString('pt-BR')}</p>
                            )}
                          </div>
                          {contractInfo.hasContract && (
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Contrato</p>
                              <p className="text-lg font-bold text-slate-800">{contractInfo.monthsLeft} meses restantes</p>
                              {contractInfo.endDate && (
                                <p className="text-xs text-slate-500 mt-1">Fim: {contractInfo.endDate.toLocaleDateString('pt-BR')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                  <div className="text-sm text-blue-600 font-medium mb-2">Total de Projetos</div>
                  <div className="text-3xl font-bold text-blue-900">{clientProjects.length}</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                  <button
                    className="text-left w-full"
                    onClick={() => setViewMode('client-tasks')}
                  >
                    <div className="text-sm text-green-600 font-medium mb-2">Total de Tarefas</div>
                    <div className="text-3xl font-bold text-green-900">{clientTasks.length}</div>
                  </button>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-purple-600 font-medium mb-2">Colaboradores</div>
                      <div className="text-3xl font-bold text-purple-900">{participants.length}</div>
                    </div>
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {participants.length === 0 ? (
                      <span className="text-sm text-slate-600">Nenhum colaborador vinculado</span>
                    ) : (
                      participants.map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedParticipantId(u.id);
                            setViewMode('participant-tasks');
                          }}
                          className="px-3 py-1 rounded-full bg-white border border-purple-200 text-purple-700 text-xs hover:bg-purple-100"
                          title={`Ver tarefas de ${u.name} para este cliente`}
                        >
                          {u.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
              {/* Tabs inside Info: Projects / Tasks */}
              <div className="flex gap-4 px-0 py-2">
                <button
                  onClick={() => setInfoTab('projects')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    infoTab === 'projects' ? 'bg-[#4c1d95] text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  Projetos ({clientProjects.length})
                </button>
                <button
                  onClick={() => setInfoTab('tasks')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    infoTab === 'tasks' ? 'bg-[#4c1d95] text-white' : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  Tarefas ({clientTasks.length})
                </button>
              </div>

              {/* Projects Section (grid cards like ClientDetailView) */}
              {infoTab === 'projects' && (
              <div className="relative">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-10 py-2">
                  <h3 className="text-lg font-bold text-slate-800">Projetos do Cliente</h3>
                  {onNewProject && client.active !== false && (
                    <button
                      onClick={onNewProject}
                      className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 font-bold text-base"
                    >
                      <Plus size={20} />
                      Novo Projeto
                    </button>
                  )}
                </div>
                {clientProjects.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Nenhum projeto para este cliente</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                    {clientProjects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => onProjectClick?.(project.id)}
                        className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
                      >
                        <h3 className="text-lg font-semibold text-slate-800">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{project.description}</p>
                        )}
                        <div className="mt-4 flex items-center gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            project.status === 'Em andamento'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Tasks Section with filters (like ClientDetailView) */}
              {infoTab === 'tasks' && (
              <div className="mt-6">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex justify-between items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">Tarefas do Cliente</h3>
                    {/* Search (igual ao Kanban) */}
                    <div className="relative w-full max-w-xs">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrar tarefas..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm"
                      />
                    </div>
                    {onNewTask && (
                      <button 
                        className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 font-bold text-base whitespace-nowrap" 
                        onClick={onNewTask}
                      >
                        + Nova Tarefa
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'todo', 'inprogress', 'review', 'done'] as const).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          statusFilter === filter
                            ? 'bg-[#4c1d95] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {filter === 'all' ? 'Todas' : filter === 'todo' ? 'A Fazer' : filter === 'inprogress' ? 'Em Progresso' : filter === 'review' ? 'Revisão' : 'Concluídas'}
                      </button>
                    ))}
                  </div>
                </div>

                {clientTasks.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                    <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">Nenhuma tarefa para este cliente</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-auto">
                    {(statusFilter === 'all' 
                      ? Object.entries(tasksByStatus)
                      : Object.entries(tasksByStatus).filter(([key]) => {
                        const filterMap: Record<string, string> = { 'todo': 'Todo', 'inprogress': 'In Progress', 'review': 'Review', 'done': 'Done' };
                        return key === filterMap[statusFilter];
                      })
                    ).map(([status, statusTasks]) => {
                      const list = statusTasks as unknown as Task[];
                      return (
                        <div
                          key={status}
                          className={`${getStatusColor(status)} border border-slate-200 rounded-2xl p-4 flex flex-col max-h-[400px]`}
                        >
                          <h4 className={`font-bold text-sm uppercase tracking-wider mb-4 ${getStatusHeaderColor(status)}`}>
                            {status === 'Todo' ? 'A Fazer' : status === 'In Progress' ? 'Em Progresso' : status === 'Review' ? 'Revisão' : 'Concluído'} ({list.length})
                          </h4>
                          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar" data-task-list="true">
                            {list.map(task => (
                              <div
                                key={task.id}
                                onClick={() => onTaskClick?.(task.id)}
                                className="bg-white border border-slate-100 rounded-lg p-3 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
                              >
                                <h5 className="font-semibold text-sm text-slate-800 line-clamp-2">
                                  {task.title}
                                </h5>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                  <span>{task.progress || 0}%</span>
                                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#4c1d95]"
                                      style={{ width: `${task.progress || 0}%` }}
                                    />
                                  </div>
                                </div>
                                {task.estimatedDelivery && (
                                  <div className="mt-2 text-xs text-slate-500">
                                    Entrega: {new Date(task.estimatedDelivery).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              )}
            </>
          )}

          {viewMode === 'participant-tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Tarefas de {selectedParticipant?.name || 'colaborador'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Tarefas deste cliente atribuídas a {selectedParticipant?.name || 'este colaborador'}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setViewMode('info');
                    setSelectedParticipantId(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para informações
                </button>
              </div>

              {participantTasks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-600">
                  Nenhuma tarefa atribuída a este colaborador para este cliente
                </div>
              ) : (
                <div className="space-y-3">
                  {participantTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-800">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
                          )}
                          <p className="text-xs text-slate-500">Entrega prevista: {formatDate(task.estimatedDelivery)}</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusStyle(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'client-tasks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tarefas do cliente</h3>
                  <p className="text-sm text-slate-500">Todas as tarefas vinculadas a este cliente.</p>
                </div>
                <button
                  onClick={() => setViewMode('info')}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para informações
                </button>
              </div>

              {clientTasks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-600">
                  Nenhuma tarefa vinculada a este cliente
                </div>
              ) : (
                <div className="space-y-3">
                  {clientTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick?.(task.id)}
                      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-800">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
                          )}
                          <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                            <span>Entrega prevista: {formatDate(task.estimatedDelivery)}</span>
                            {task.developer && <span>Responsável: {task.developer}</span>}
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusStyle(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deactivate Modal */}
      <ConfirmationModal
        isOpen={isDeactivateModalOpen}
        title="Desativar Cliente"
        message={`Tem certeza que deseja desativar ${client.name}? Esta ação é irreversível. Por favor, informe o motivo.`}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => {
          setIsDeactivateModalOpen(false);
          setDeactivateReason('');
        }}
        confirmText="Desativar"
        confirmColor="red"
        customContent={
          <textarea
            value={deactivateReason}
            onChange={(e) => setDeactivateReason(e.target.value)}
            placeholder="Motivo da desativação..."
            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none mt-4"
            rows={4}
          />
        }
      />
    </div>
  );
};

export default ClientDetailsView;

import React, { useState, useMemo, useEffect } from 'react';
import { TimesheetEntry, Client, Project, User, Task } from '../types';
import { Building2, ArrowRight, Clock, Briefcase, Users, TrendingUp, BarChart3, CheckSquare, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface TimesheetAdminDashboardProps {
  entries: TimesheetEntry[];
  clients: Client[];
  projects: Project[];
  tasks?: Task[];
  users?: User[];
  onClientClick: (clientId: string) => void;
  onUserTimesheetClick?: (userId: string) => void;
  initialTab?: 'projects' | 'collaborators' | 'status';
}

const TimesheetAdminDashboard: React.FC<TimesheetAdminDashboardProps> = ({ 
  entries, 
  clients, 
  projects,
  tasks = [],
  users = [],
  onClientClick,
  onUserTimesheetClick,
  initialTab = 'projects'
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'collaborators' | 'status'>(initialTab);
  const [expandedCollaborators, setExpandedCollaborators] = useState<Set<string>>(new Set());
  
  // Atualizar activeTab quando initialTab mudar
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Aggregate Logic - Total de todas as horas
  const totalAllHours = useMemo(() => {
    return entries.reduce((acc, curr) => acc + curr.totalHours, 0);
  }, [entries]);

  // Status dos Colaboradores - verificar dias em dia
  const collaboratorsStatus = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Calcular dias úteis do mês até ontem
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const workDaysUntilYesterday: string[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    
    for (let d = new Date(firstDayOfMonth); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Seg-Sex
        workDaysUntilYesterday.push(d.toISOString().split('T')[0]);
      }
    }

    return users.filter(u => u.active && u.role === 'developer').map(user => {
      const userEntries = entries.filter(e => 
        e.userId === user.id && 
        new Date(e.date).getMonth() === currentMonth &&
        new Date(e.date).getFullYear() === currentYear
      );
      
      const datesWithEntries = new Set(userEntries.map(e => e.date));
      const missingDays = workDaysUntilYesterday.filter(day => !datesWithEntries.has(day));
      
      return {
        user,
        totalDays: workDaysUntilYesterday.length,
        daysWithEntries: datesWithEntries.size,
        missingDays: missingDays.length,
        missingDates: missingDays,
        isUpToDate: missingDays.length === 0,
        totalHours: userEntries.reduce((acc, curr) => acc + curr.totalHours, 0)
      };
    }).sort((a, b) => b.missingDays - a.missingDays);
  }, [users, entries]);

  const getClientStats = (clientId: string) => {
    const clientEntries = entries.filter(e => e.clientId === clientId);
    const totalHours = clientEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
    
    const activeProjectIds = new Set(clientEntries.map(e => e.projectId));
    
    return { totalHours, projectCount: activeProjectIds.size, entries: clientEntries };
  };

  // Dados do cliente selecionado
  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
  const selectedClientData = selectedClientId ? getClientStats(selectedClientId) : null;

  // Projetos do cliente selecionado com horas
  const projectsWithHours = useMemo(() => {
    if (!selectedClientId) return [];
    
    const clientProjects = projects.filter(p => p.clientId === selectedClientId);
    return clientProjects.map(proj => {
      const projEntries = selectedClientData?.entries.filter(e => e.projectId === proj.id) || [];
      const hours = projEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
      return { ...proj, totalHours: hours, entryCount: projEntries.length };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [selectedClientId, projects, selectedClientData]);

  // Colaboradores do cliente selecionado com horas e tarefas
  const collaboratorsWithHours = useMemo(() => {
    if (!selectedClientId) return [];
    
    // Primeiro, pegar todas as tarefas vinculadas aos projetos do cliente
    const clientProjects = projects.filter(p => p.clientId === selectedClientId);
    const clientProjectIds = new Set(clientProjects.map(p => p.id));
    const clientTasks = tasks.filter(t => clientProjectIds.has(t.projectId));
    
    // Depois, pegar todos os desenvolvedores vinculados a essas tarefas
    const collabMap = new Map<string, { 
      name: string; 
      developerId: string;
      entries: number; 
      hours: number;
      taskEntries: Array<{
        taskName: string;
        taskId: string;
        startTime: string;
        endTime: string;
        totalHours: number;
        date: string;
      }>;
    }>();
    
    // Adicionar todos os desenvolvedores das tarefas do cliente
    clientTasks.forEach(task => {
      if (task.developerId) {
        const userName = task.developer || `Desenvolvedor ${task.developerId.substring(0, 8)}`;
        if (!collabMap.has(task.developerId)) {
          collabMap.set(task.developerId, { 
            name: userName, 
            developerId: task.developerId,
            entries: 0, 
            hours: 0, 
            taskEntries: [] 
          });
        }
      }
    });
    
    // Adicionar apontamentos que existem
    const clientEntries = selectedClientData?.entries || [];
    clientEntries.forEach(entry => {
      let userName = entry.userName || 'Sem nome';
      let developerId = entry.userId || `user-${entry.userName}`;
      
      // Se o colaborador ainda não existe (não tem tarefa vinculada), adicionar
      if (!collabMap.has(developerId)) {
        collabMap.set(developerId, { 
          name: userName, 
          developerId,
          entries: 0, 
          hours: 0, 
          taskEntries: [] 
        });
      }
      
      const collab = collabMap.get(developerId)!;
      collab.entries += 1;
      collab.hours += entry.totalHours;
      
      // Encontrar nome da tarefa
      const task = tasks.find(t => t.id === entry.taskId);
      const taskName = task?.title || entry.description || 'Sem descrição';
      
      collab.taskEntries.push({
        taskName,
        taskId: entry.taskId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        totalHours: entry.totalHours,
        date: entry.date
      });
    });
    
    // Ordenar tarefas por data (mais recentes primeiro)
    collabMap.forEach(collab => {
      collab.taskEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    return Array.from(collabMap.values()).sort((a, b) => {
      // Ordem: primeiro com apontamentos (ordenado por horas desc), depois sem apontamentos
      if (a.hours === 0 && b.hours === 0) return 0;
      if (a.hours === 0) return 1;
      if (b.hours === 0) return -1;
      return b.hours - a.hours;
    });
  }, [selectedClientId, selectedClientData, projects, tasks]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl overflow-hidden">
       {/* Header */}
       <div className="bg-gradient-to-r from-[#4c1d95] to-purple-600 px-8 py-6 shadow-lg border-b-2 border-slate-200">
          <div className="flex items-center justify-between">
             <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                   📊 Gestão de Horas
                </h1>
                <p className="text-purple-100 text-sm mt-2">Resumo de horas trabalhadas por cliente e colaborador</p>
             </div>
             <div className="flex items-center gap-3">
                {!selectedClient && activeTab === 'status' && (
                   <button
                      onClick={() => setActiveTab('projects')}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                   >
                      ← Voltar aos Clientes
                   </button>
                )}
                {!selectedClient && activeTab !== 'status' && (
                   <button
                      onClick={() => setActiveTab('status')}
                      className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                         activeTab === 'status'
                            ? 'bg-white text-[#4c1d95] shadow-lg'
                            : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                   >
                      <BarChart3 className="w-5 h-5" />
                      Status dos Colaboradores
                   </button>
                )}
                {selectedClient && (
                   <button
                      onClick={() => { setSelectedClientId(null); setActiveTab('projects'); }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all"
                   >
                      ← Voltar aos Clientes
                   </button>
                )}
             </div>
          </div>
       </div>

       {/* Conteúdo */}
       {!selectedClient && activeTab !== 'status' ? (
          // Lista de Clientes
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clients.map(client => {
                  const stats = getClientStats(client.id);
                  const clientProjects = projects.filter(p => p.clientId === client.id);

                  return (
                    <button
                      key={client.id}
                      onClick={() => { setSelectedClientId(client.id); setActiveTab('projects'); }}
                      className="bg-white rounded-2xl border-2 border-slate-200 p-6 cursor-pointer hover:shadow-xl hover:border-[#4c1d95] transition-all group flex flex-col h-full relative transform hover:scale-105"
                    >
                       <div className="flex items-start justify-between mb-4">
                          <div className="w-16 h-16 rounded-xl bg-slate-50 border-2 border-slate-100 p-2 flex items-center justify-center flex-shrink-0">
                            {client.logoUrl ? (
                              <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">${client.name.charAt(0)}</div>`;
                              }} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                                {client.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4c1d95] to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                            <ArrowRight className="w-5 h-5 text-white" />
                          </div>
                       </div>

                       <h3 className="text-lg font-bold text-slate-800 mb-4 line-clamp-2">{client.name}</h3>

                       <div className="mt-auto space-y-4 border-t border-slate-100 pt-4">
                          <div className="flex justify-between items-center">
                             <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-500" /> Horas
                             </span>
                             <span className="text-xl font-black text-emerald-600">{stats.totalHours.toFixed(1)}h</span>
                          </div>

                          <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                             <Briefcase className="w-3.5 h-3.5" />
                             <span>{clientProjects.length} Projetos</span>
                             {stats.projectCount > 0 && <span className="ml-auto font-semibold text-[#4c1d95]">{stats.projectCount} ativos</span>}
                          </div>
                       </div>
                    </button>
                  );
                })}
             </div>
          </div>
       ) : !selectedClient && activeTab === 'status' ? (
          // Aba Status dos Colaboradores (tela inicial)
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                   📊 Status de Apontamentos
                </h2>
                <p className="text-slate-500">Acompanhamento de apontamentos até ontem • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
             </div>

             {collaboratorsStatus.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                   <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                   <p className="text-lg font-medium">Nenhum colaborador ativo</p>
                </div>
             ) : (
                <div className="space-y-3">
                   {collaboratorsStatus.map(status => (
                      <div
                         key={status.user.id}
                         onClick={() => onUserTimesheetClick && onUserTimesheetClick(status.user.id)}
                         className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer hover:border-purple-300"
                      >
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                  status.isUpToDate 
                                     ? 'bg-green-100 text-green-600' 
                                     : 'bg-red-100 text-red-600'
                               }`}>
                                  {status.isUpToDate ? (
                                     <CheckSquare className="w-6 h-6" />
                                  ) : (
                                     <AlertCircle className="w-6 h-6" />
                                  )}
                               </div>
                               
                               <div className="flex-1">
                                  <h3 className="text-lg font-bold text-slate-800">{status.user.name}</h3>
                                  <p className="text-sm text-slate-500">{status.user.cargo || 'Desenvolvedor'}</p>
                               </div>

                               <div className="flex items-center gap-8">
                                  <div className="text-center">
                                     <p className="text-2xl font-black text-purple-600">{status.daysWithEntries}</p>
                                     <p className="text-xs text-slate-500">dias registrados</p>
                                  </div>

                                  {!status.isUpToDate && (
                                     <div className="text-center">
                                        <p className="text-2xl font-black text-red-600">{status.missingDays}</p>
                                        <p className="text-xs text-slate-500">dias faltando</p>
                                     </div>
                                  )}

                                  <div className="text-center">
                                     <p className="text-2xl font-black text-slate-700">{status.totalHours.toFixed(1)}h</p>
                                     <p className="text-xs text-slate-500">total horas</p>
                                  </div>
                               </div>

                               <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                                  status.isUpToDate
                                     ? 'bg-green-100 text-green-700'
                                     : 'bg-red-100 text-red-700'
                               }`}>
                                  {status.isUpToDate ? '✓ Em dia' : '⚠ Atrasado'}
                               </div>
                            </div>
                         </div>

                         {!status.isUpToDate && status.missingDates.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                               <p className="text-sm font-semibold text-slate-700 mb-2">Dias sem apontamento:</p>
                               <div className="flex flex-wrap gap-2">
                                  {status.missingDates.slice(0, 10).map(date => (
                                     <span key={date} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                                        {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                     </span>
                                  ))}
                                  {status.missingDates.length > 10 && (
                                     <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                                        +{status.missingDates.length - 10} mais
                                     </span>
                                  )}
                               </div>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             )}
          </div>
       ) : (
          // Detalhe do Cliente com Abas
          <div className="flex-1 flex flex-col overflow-hidden">
             {/* Tabs */}
             <div className="px-8 py-4 bg-white border-b-2 border-slate-200 flex gap-4">
                <button
                   onClick={() => setActiveTab('projects')}
                   className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                      activeTab === 'projects'
                         ? 'bg-gradient-to-r from-[#4c1d95] to-purple-600 text-white shadow-lg'
                         : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                   }`}
                >
                   <Briefcase className="w-4 h-4" />
                   Projetos ({projectsWithHours.length})
                </button>

                <button
                   onClick={() => setActiveTab('collaborators')}
                   className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                      activeTab === 'collaborators'
                         ? 'bg-gradient-to-r from-[#4c1d95] to-purple-600 text-white shadow-lg'
                         : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                   }`}
                >
                   <Users className="w-4 h-4" />
                   Colaboradores ({collaboratorsWithHours.length})
                </button>
             </div>

             {/* Conteúdo das Abas */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {/* Aba Projetos */}
                {activeTab === 'projects' && (
                   <div className="space-y-4">
                      <div className="mb-6">
                         <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            📁 Projetos de {selectedClient?.name}
                         </h2>
                         <p className="text-slate-500">Total: {projectsWithHours.filter(p => p.entryCount > 0).length} projetos com apontamentos • {projectsWithHours.length} projetos no total</p>
                      </div>

                      {projectsWithHours.length === 0 ? (
                         <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-semibold">Nenhum projeto neste cliente</p>
                         </div>
                      ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projectsWithHours.map(proj => (
                               <div key={proj.id} className={`rounded-2xl border-2 p-6 hover:shadow-lg transition-all ${
                                  proj.entryCount > 0
                                     ? 'bg-white border-slate-200'
                                     : 'bg-slate-50 border-dashed border-slate-300'
                               }`}>
                                  <div className="flex items-start justify-between mb-4">
                                     <div>
                                        <h3 className="font-bold text-lg text-slate-800">{proj.name}</h3>
                                        <p className={`text-xs mt-1 ${proj.entryCount > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400 italic'}`}>
                                           {proj.entryCount > 0 ? `📝 ${proj.entryCount} apontamentos` : '⊘ Sem apontamentos'}
                                        </p>
                                     </div>
                                     <div className="text-right">
                                        <p className={`text-2xl font-black ${proj.totalHours > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                           {proj.totalHours.toFixed(1)}h
                                        </p>
                                     </div>
                                  </div>
                                  
                                  {proj.entryCount > 0 && (
                                     <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-600">Média por apontamento</span>
                                        <span className="font-bold text-[#4c1d95]">{(proj.totalHours / proj.entryCount).toFixed(2)}h</span>
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                )}

                {/* Aba Colaboradores */}
                {activeTab === 'collaborators' && (
                   <div className="space-y-6">
                      <div className="mb-6">
                         <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            👥 Colaboradores de {selectedClient?.name}
                         </h2>
                         <p className="text-slate-500">
                            Total: {collaboratorsWithHours.length} colaboradores • 
                            {collaboratorsWithHours.filter(c => c.entries > 0).length} com apontamentos
                         </p>
                      </div>

                      {collaboratorsWithHours.length === 0 ? (
                         <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-semibold">Nenhum colaborador vinculado a este cliente</p>
                         </div>
                      ) : (
                         <div className="space-y-6">
                            {collaboratorsWithHours.map((collab, idx) => {
                               const isExpanded = expandedCollaborators.has(`${idx}-${collab.name}`);
                               const hasApontamentos = collab.entries > 0;
                               const toggleExpand = () => {
                                  const newSet = new Set(expandedCollaborators);
                                  const key = `${idx}-${collab.name}`;
                                  if (newSet.has(key)) {
                                     newSet.delete(key);
                                  } else {
                                     newSet.add(key);
                                  }
                                  setExpandedCollaborators(newSet);
                               };

                               return (
                                  <div key={idx} className={`rounded-2xl border-2 overflow-hidden hover:shadow-lg transition-all ${
                                     hasApontamentos 
                                        ? 'bg-white border-slate-200' 
                                        : 'bg-slate-50 border-dashed border-slate-300'
                                  }`}>
                                     {/* Header do Colaborador */}
                                     <button
                                        onClick={toggleExpand}
                                        className={`w-full px-6 py-4 border-b-2 hover:opacity-90 transition-all ${
                                           hasApontamentos
                                              ? 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 hover:from-slate-100 hover:to-slate-200'
                                              : 'bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300'
                                        }`}
                                     >
                                        <div className="flex items-center justify-between">
                                           <div className="flex items-center gap-4">
                                              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${
                                                 hasApontamentos
                                                    ? 'bg-gradient-to-br from-blue-400 to-purple-500'
                                                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                              }`}>
                                                 {collab.name.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="text-left">
                                                 <p className={`font-bold text-lg ${hasApontamentos ? 'text-slate-800' : 'text-slate-600'}`}>
                                                    {collab.name}
                                                 </p>
                                                 <p className={`text-sm ${hasApontamentos ? 'text-slate-500' : 'text-slate-400 italic'}`}>
                                                    {hasApontamentos ? `📝 ${collab.entries} apontamentos` : '⊘ Sem apontamentos'}
                                                 </p>
                                              </div>
                                           </div>

                                           <div className="flex items-center gap-4">
                                              <div className={`text-right px-4 py-2 rounded-xl border-2 ${
                                                 hasApontamentos
                                                    ? 'bg-white border-slate-200'
                                                    : 'bg-slate-200 border-slate-400'
                                              }`}>
                                                 <p className={`text-3xl font-black ${hasApontamentos ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                    {collab.hours.toFixed(1)}h
                                                 </p>
                                                 <p className={`text-xs font-semibold ${hasApontamentos ? 'text-slate-600' : 'text-slate-500'}`}>
                                                    Total
                                                 </p>
                                              </div>
                                              {hasApontamentos && (
                                                 <div className="p-2 rounded-lg bg-slate-200 flex items-center justify-center">
                                                    {isExpanded ? (
                                                       <ChevronUp className="w-5 h-5 text-slate-700" />
                                                    ) : (
                                                       <ChevronDown className="w-5 h-5 text-slate-700" />
                                                    )}
                                                 </div>
                                              )}
                                           </div>
                                        </div>
                                     </button>

                                     {/* Tarefas do Colaborador - Expandível */}
                                     {hasApontamentos && isExpanded && (
                                        <div className="p-6 space-y-3 bg-slate-50">
                                           {collab.taskEntries.map((task, taskIdx) => {
                                              const dateObj = new Date(task.date);
                                              const formattedDate = dateObj.toLocaleDateString('pt-BR', { 
                                                 weekday: 'short', 
                                                 year: 'numeric', 
                                                 month: '2-digit', 
                                                 day: '2-digit' 
                                              });

                                              return (
                                                 <div key={taskIdx} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                                                    <div className="flex items-start justify-between gap-4">
                                                       <div className="flex-1">
                                                          <div className="flex items-center gap-2 mb-2">
                                                             <CheckSquare className="w-4 h-4 text-blue-500" />
                                                             <p className="font-bold text-slate-800">{task.taskName}</p>
                                                          </div>
                                                          <p className="text-xs text-slate-500 ml-6">📅 {formattedDate}</p>
                                                          
                                                          <div className="flex items-center gap-4 mt-3 ml-6">
                                                             <div className="flex items-center gap-1.5 text-sm">
                                                                <Clock className="w-3.5 h-3.5 text-green-500" />
                                                                <span className="font-semibold text-slate-700">{task.startTime}</span>
                                                             </div>
                                                             <span className="text-slate-400">→</span>
                                                             <div className="flex items-center gap-1.5 text-sm">
                                                                <Clock className="w-3.5 h-3.5 text-red-500" />
                                                                <span className="font-semibold text-slate-700">{task.endTime}</span>
                                                             </div>
                                                          </div>
                                                       </div>

                                                       <div className="text-right bg-emerald-50 rounded-lg px-4 py-2 border-2 border-emerald-200 min-w-24">
                                                          <p className="text-2xl font-black text-emerald-600">{task.totalHours.toFixed(2)}h</p>
                                                       </div>
                                                    </div>
                                                 </div>
                                              );
                                           })}
                                        </div>
                                     )}
                                  </div>
                               );
                            })}
                         </div>
                      )}
                   </div>
                )}

                {/* Aba Status dos Colaboradores */}
                {activeTab === 'status' && (
                   <div className="space-y-4">
                      <div className="mb-6">
                         <h2 className="text-2xl font-bold text-slate-800 mb-2">
                            📊 Status de Apontamentos
                         </h2>
                         <p className="text-slate-500">Acompanhamento de apontamentos até ontem • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                      </div>

                      {collaboratorsStatus.length === 0 ? (
                         <div className="text-center py-12 text-slate-400">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Nenhum colaborador ativo</p>
                         </div>
                      ) : (
                         <div className="space-y-3">
                            {collaboratorsStatus.map(status => (
                               <div
                                  key={status.user.id}
                                  onClick={() => onUserTimesheetClick && onUserTimesheetClick(status.user.id)}
                                  className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer hover:border-purple-300"
                               >
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                           status.isUpToDate 
                                              ? 'bg-green-100 text-green-600' 
                                              : 'bg-red-100 text-red-600'
                                        }`}>
                                           {status.isUpToDate ? (
                                              <CheckSquare className="w-6 h-6" />
                                           ) : (
                                              <AlertCircle className="w-6 h-6" />
                                           )}
                                        </div>
                                        
                                        <div className="flex-1">
                                           <h3 className="text-lg font-bold text-slate-800">{status.user.name}</h3>
                                           <p className="text-sm text-slate-500">{status.user.cargo || 'Desenvolvedor'}</p>
                                        </div>

                                        <div className="flex items-center gap-8">
                                           <div className="text-center">
                                              <p className="text-2xl font-black text-purple-600">{status.daysWithEntries}</p>
                                              <p className="text-xs text-slate-500">dias registrados</p>
                                           </div>

                                           {!status.isUpToDate && (
                                              <div className="text-center">
                                                 <p className="text-2xl font-black text-red-600">{status.missingDays}</p>
                                                 <p className="text-xs text-slate-500">dias faltando</p>
                                              </div>
                                           )}

                                           <div className="text-center">
                                              <p className="text-2xl font-black text-slate-700">{status.totalHours.toFixed(1)}h</p>
                                              <p className="text-xs text-slate-500">total horas</p>
                                           </div>
                                        </div>

                                        <div className={`px-4 py-2 rounded-full font-bold text-sm ${
                                           status.isUpToDate
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-red-100 text-red-700'
                                        }`}>
                                           {status.isUpToDate ? '✓ Em dia' : '⚠ Atrasado'}
                                        </div>
                                     </div>
                                  </div>

                                  {!status.isUpToDate && status.missingDates.length > 0 && (
                                     <div className="mt-4 pt-4 border-t border-slate-200">
                                        <p className="text-sm font-semibold text-slate-700 mb-2">Dias sem apontamento:</p>
                                        <div className="flex flex-wrap gap-2">
                                           {status.missingDates.slice(0, 10).map(date => (
                                              <span key={date} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                                                 {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                              </span>
                                           ))}
                                           {status.missingDates.length > 10 && (
                                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                                                 +{status.missingDates.length - 10} mais
                                              </span>
                                           )}
                                        </div>
                                     </div>
                                  )}
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                )}
             </div>
          </div>
       )}
    </div>
  );
};

export default TimesheetAdminDashboard;
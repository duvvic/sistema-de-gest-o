import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { ArrowLeft, Plus, Edit, CheckSquare, Clock, Filter, Search, ChevronDown, Check, Trash2, LayoutGrid, Target, ShieldAlert, Link as LinkIcon, Users, Calendar, Info, Zap, RefreshCw, AlertTriangle, StickyNote, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { tasks, clients, projects, users, projectMembers, timesheetEntries, deleteProject, deleteTask } = useDataController();
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'task' } | null>(null);
  const { currentUser, isAdmin } = useAuth();

  const project = projects.find(p => p.id === projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  const projectTasks = useMemo(() => {
    const pTasks = tasks.filter(t => t.projectId === projectId);

    // Filtro para Developer / Standard (USER_REQUEST: só mostrar tarefas vinculadas a mim)
    if (currentUser && !isAdmin) {
      return pTasks.filter(t =>
        t.developerId === currentUser.id ||
        (t.collaboratorIds && t.collaboratorIds.includes(currentUser.id))
      );
    }

    return pTasks;
  }, [tasks, projectId, currentUser, isAdmin]);

  // Helper para enriquecer tasks com dados do user e collaborators
  const getTaskWithUser = (task: any) => {
    const dev = users.find(u => u.id === task.developerId);

    // Mapear avatars dos colaboradores extras
    const collaborators = (task.collaboratorIds || [])
      .map((id: string) => users.find(u => u.id === id))
      .filter(Boolean);

    // Cálculos de Horas e Progresso
    const actualHours = timesheetEntries
      .filter(entry => entry.taskId === task.id)
      .reduce((sum, entry) => sum + entry.totalHours, 0);

    let plannedProgress = 0;
    if (task.scheduledStart && task.estimatedDelivery) {
      const start = new Date(task.scheduledStart);
      const end = new Date(task.estimatedDelivery);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (today >= start) {
        if (today > end) plannedProgress = 100;
        else {
          const total = end.getTime() - start.getTime();
          if (total > 0) {
            plannedProgress = Math.round(((today.getTime() - start.getTime()) / total) * 100);
          }
        }
      }
    }

    return {
      ...task,
      developerAvatar: dev?.avatarUrl,
      developerName: dev?.name || task.developer,
      collaborators: collaborators,
      actualHours,
      plannedProgress
    };
  };

  const [selectedStatus, setSelectedStatus] = React.useState<string>('Todos');
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const filteredTasks = useMemo(() => {
    let t = projectTasks;
    if (selectedStatus !== 'Todos') {
      t = t.filter(task => task.status === selectedStatus);
    }
    // Sorting: Done last, then by Date
    return t.sort((a, b) => {
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;
      return new Date(a.estimatedDelivery || '2099-12-31').getTime() - new Date(b.estimatedDelivery || '2099-12-31').getTime();
    });
  }, [projectTasks, selectedStatus]);

  // Cálculos de Performance Executiva
  const performance = useMemo(() => {
    if (!project) return null;

    const pTimesheets = timesheetEntries.filter(e => e.projectId === projectId);

    // 1. Custo Empenhado (Real)
    const committedCost = pTimesheets.reduce((acc, entry) => {
      const user = users.find(u => u.id === entry.userId);
      return acc + (entry.totalHours * (user?.hourlyCost || 0));
    }, 0);

    // 2. Evolução Percentual
    // Média Simples
    const avgProgress = projectTasks.length > 0
      ? projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / projectTasks.length
      : 0;

    // Média Ponderada por Horas Estimadas
    const totalEstimated = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const weightedProgress = totalEstimated > 0
      ? projectTasks.reduce((acc, t) => acc + ((t.progress || 0) * (t.estimatedHours || 0)), 0) / totalEstimated
      : avgProgress;

    // 3. Quanto falta para encerrar
    const remainingHours = projectTasks.reduce((acc, t) => {
      const remaining = (t.estimatedHours || 0) * (1 - (t.progress || 0) / 100);
      return acc + Math.max(0, remaining);
    }, 0);

    // Estimativa de custo para o resto (usando média de custo dos membros do projeto)
    const projectMemberIds = projectMembers.filter(pm => pm.projectId === projectId).map(pm => pm.userId);
    const projectTeam = users.filter(u => projectMemberIds.includes(u.id));
    const avgTeamCost = projectTeam.length > 0
      ? projectTeam.reduce((acc, u) => acc + (u.hourlyCost || 0), 0) / projectTeam.length
      : 150; // Fallback valor médio mercado/empresa

    const estimatedCostToFinish = remainingHours * avgTeamCost;
    const totalForecastedCost = committedCost + estimatedCostToFinish;
    const budgetRemaining = (project.valor_total_rs || 0) - committedCost;

    return {
      committedCost,
      avgProgress,
      weightedProgress,
      remainingHours,
      estimatedCostToFinish,
      totalForecastedCost,
      budgetRemaining,
      totalEstimated,
      totalActual: pTimesheets.reduce((acc, e) => acc + e.totalHours, 0)
    };
  }, [project, projectTasks, timesheetEntries, users, projectId, projectMembers]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* ... (manter igual) ... */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--textTitle)] mb-2">Projeto não encontrado</h2>
          <button
            onClick={() => navigate(isAdmin ? '/admin/projects' : '/developer/projects')}
            className="text-[var(--brand)] hover:underline"
          >
            Voltar para projetos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[var(--bgApp)]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        {/* ... (manter igual) ... */}
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--surfaceHover)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--textMuted)]" />
        </button>

        <div className="flex-1">
          {client && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-[var(--surface)] p-1 flex items-center justify-center">
                <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm text-[var(--textMuted)]">{client.name}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--textTitle)]">{project.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-[var(--textMuted)] font-medium text-sm">{projectTasks.length} tarefas</p>
            <div className="h-4 w-px bg-[var(--border)]"></div>
            <div className="flex -space-x-1.5 overflow-hidden">
              {projectMembers
                .filter(pm => pm.projectId === projectId)
                .map(pm => {
                  const member = users.find(u => u.id === pm.userId);
                  if (!member) return null;
                  return (
                    <button
                      key={member.id}
                      onClick={() => navigate(`/admin/team/${member.id}`)}
                      className="w-6 h-6 rounded-full border border-[var(--bgApp)] bg-[var(--surface)] flex items-center justify-center overflow-hidden hover:z-10 hover:scale-110 transition-all cursor-pointer"
                      title={member.name}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-[var(--textMuted)]">
                          {member.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </button>
                  );
                })}
              {projectMembers.filter(pm => pm.projectId === projectId).length === 0 && (
                <span className="text-xs text-[var(--textMuted)] italic">Sem equipe</span>
              )}
            </div>
            {isAdmin && (project.budget || project.valor_total_rs) && (
              <>
                <div className="h-4 w-px bg-[var(--border)]"></div>
                <div className="flex items-center gap-3 text-xs font-black text-emerald-600">
                  {project.budget && (
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase text-slate-400">Budget</span>
                      <span>R$ {project.budget.toLocaleString()}</span>
                    </div>
                  )}
                  {project.valor_total_rs && (
                    <div className="flex flex-col">
                      <span className="text-[8px] uppercase text-slate-400">Total</span>
                      <span>R$ {project.valor_total_rs.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setItemToDelete({ id: projectId!, type: 'project' })}
              className="p-2 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Excluir Projeto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/admin/projects/${projectId}/edit`)}
              className="px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surfaceHover)] flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
          </div>
        )}

        <button
          onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project?.clientId}`)}
          className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brandHover)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* Resumo de Performance e Finanças - NOVO */}
      {performance && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card: Status Real-time */}
          <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                <BarChart2 size={18} />
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${project.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' :
                project.status === 'Em Pausa' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                {project.status || 'Em Aberto'}
              </span>
            </div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Projeto</h4>
            <p className="text-xl font-black text-slate-700 dark:text-slate-200">Em Tempo Real</p>
          </div>

          {/* Card: Evolução Percentual */}
          <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
                <TrendingUp size={18} />
              </div>
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Avanço Geral</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <p className="text-3xl font-black text-slate-700 dark:text-slate-200">{Math.round(performance.weightedProgress)}%</p>
              <span className="text-[10px] font-bold text-slate-400 mb-1.5">Ponderado</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${performance.weightedProgress}%` }} />
            </div>
          </div>

          {/* Card: Custo Empenhado */}
          <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                <DollarSign size={18} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Custo Atual</span>
            </div>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
              {performance.committedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Valor já consumido (Horas Real)</p>
          </div>

          {/* Card: Forecast / Falta para encerrar */}
          <div className="bg-white dark:bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600">
                <Clock size={18} />
              </div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Forecast</span>
            </div>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-200">
              {performance.estimatedCostToFinish.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-1 uppercase">
              <span>Restante</span>
              <span>{Math.round(performance.remainingHours)} Horas</span>
            </div>
          </div>
        </div>
      )}

      {/* Executive Panel - Novo */}
      <div className="mb-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Visão Geral e Timeline */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={16} /> Detalhes Executivos
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Stakeholders */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Parceiro Estratégico</label>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const p = clients.find(c => c.id === project.partnerId);
                      return p ? (
                        <span className="flex items-center gap-2">
                          <img src={p.logoUrl} className="w-5 h-5 object-contain rounded" alt="" />
                          {p.name}
                        </span>
                      ) : 'Direto com Cliente';
                    })()}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Gerente no Cliente</label>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{project.managerClient || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Responsável Nic-Labs</label>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {(() => {
                      const u = users.find(u => u.id === project.responsibleNicLabsId);
                      return u ? u.name : 'Não definido';
                    })()}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 flex items-center gap-1">
                  <Calendar size={12} /> Cronograma do Projeto
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Início Previsto:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Entrega Prevista:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{project.estimatedDelivery ? new Date(project.estimatedDelivery).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Início Real:</span>
                      <span className={`font-bold ${project.startDateReal ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                        {project.startDateReal ? new Date(project.startDateReal).toLocaleDateString() : 'Não iniciado'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Conclusão Real:</span>
                    <span className={`font-bold ${project.endDateReal ? 'text-green-600' : 'text-slate-400 italic'}`}>
                      {project.endDateReal ? new Date(project.endDateReal).toLocaleDateString() : 'Em aberto'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Escopo */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Escopo do Projeto</label>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {project.description || 'Nenhuma descrição detalhada disponível.'}
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 3: Riscos, Sucesso e Documentos */}
        <div className="space-y-6">
          {/* Riscos */}
          <div className={`p-6 rounded-2xl border shadow-sm ${project.risks ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-white dark:bg-[var(--surface)] border-[var(--border)]'}`}>
            <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldAlert size={16} /> Gestão de Riscos
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              {project.risks || 'Nenhum risco crítico mapeado até o momento.'}
            </p>
          </div>

          {/* Fatores de Sucesso */}
          <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Zap size={16} /> Fator de Sucesso
            </h3>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{project.successFactor || 'Critérios padrão de entrega'}</p>
            {project.criticalDate && (
              <div className="flex items-center gap-2 text-xs font-black text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <Clock size={12} /> DATA CRÍTICA: {new Date(project.criticalDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Links e Docs */}
          <div className="bg-white dark:bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <LinkIcon size={16} /> Documentação
            </h3>
            {project.docLink ? (
              <a
                href={project.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors text-sm font-bold truncate"
              >
                <LayoutGrid size={14} /> Acessar Escopo/Documentos
              </a>
            ) : (
              <p className="text-xs text-slate-400 italic">Nenhum link externo vinculado.</p>
            )}
          </div>
        </div>
      </div>

      {/* Seção Report Semanal */}
      <div className="mb-8 bg-white dark:bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm">
        <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
          <RefreshCw size={16} /> Monitoramento Semanal (Status Report)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gaps / Issues */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg w-fit">
              <AlertTriangle size={12} /> Gaps / Issues / Impedimentos
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[60px]">
              {project.gapsIssues || 'Nenhum impedimento crítico relatado no momento.'}
            </p>
          </div>

          {/* Considerações Importantes */}
          <div className="space-y-3 lg:border-x border-slate-100 dark:border-slate-800 lg:px-8">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg w-fit">
              <Zap size={12} /> Considerações Importantes
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[60px]">
              {project.importantConsiderations || 'Nenhuma consideração adicional para esta semana.'}
            </p>
          </div>

          {/* Texto Mensagem Final */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg w-fit">
              <StickyNote size={12} /> Mensagem para Status Report
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed italic">
                "{project.weeklyStatusReport || 'Resumo do status report semanal ainda não preparado.'}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarefas por Status */}
      {/* Controle e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative z-20">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center gap-2 text-sm font-bold text-[var(--text)] min-w-[200px] justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--textMuted)]" />
              <span>
                {(() => {
                  const statusLabels: Record<string, string> = {
                    'Todos': 'Todos os Status',
                    'Todo': 'Não Iniciado',
                    'In Progress': 'Trabalhando',
                    'Review': 'Teste',
                    'Done': 'Concluído'
                  };
                  return statusLabels[selectedStatus] || selectedStatus;
                })()}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowStatusMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-2 flex flex-col gap-1 z-[70]"
                >
                  {['Todos', 'Todo', 'In Progress', 'Review', 'Done'].map(status => {
                    const statusLabels: Record<string, string> = {
                      'Todos': 'Todos os Status',
                      'Todo': 'Não Iniciado',
                      'In Progress': 'Trabalhando',
                      'Review': 'Teste',
                      'Done': 'Concluído'
                    };

                    const statusColors: Record<string, string> = {
                      'Todos': 'bg-[var(--brand)]',
                      'Todo': 'bg-slate-500',
                      'In Progress': 'bg-blue-500',
                      'Review': 'bg-amber-500',
                      'Done': 'bg-emerald-500'
                    };

                    const label = statusLabels[status] || status;
                    const colorClass = statusColors[status] || 'bg-gray-500';

                    return (
                      <button
                        key={status}
                        onClick={() => { setSelectedStatus(status); setShowStatusMenu(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selectedStatus === status ? 'bg-[var(--surface-active)] text-[var(--brand)]' : 'text-[var(--textMuted)] hover:bg-[var(--surfaceHover)]'}`}
                      >
                        <div className="flex items-center gap-2">
                          {status !== 'Todos' && (
                            <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                          )}
                          {label}
                        </div>
                        {selectedStatus === status && <Check size={14} className="text-[var(--brand)]" />}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <span className="text-sm font-medium text-[var(--textMuted)]">
          {filteredTasks.length} tarefas encontradas
        </span>
      </div>

      {/* Grid de Tarefas - Estilo Card 2.0 */}
      <div className="pb-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-[var(--textMuted)]">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
            {selectedStatus !== 'Todos' && (
              <button onClick={() => setSelectedStatus('Todos')} className="text-[var(--brand)] text-sm font-bold mt-2 hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={getTaskWithUser(task)}
                project={project}
                client={client || undefined}
                onClick={() => navigate(`/tasks/${task.id}`)}
                isAdmin={isAdmin}
                onDelete={() => setItemToDelete({ id: task.id, type: 'task' })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title={`Excluir ${itemToDelete?.type === 'project' ? 'Projeto' : 'Tarefa'}`}
        message={`Tem certeza que deseja excluir esta ${itemToDelete?.type === 'project' ? 'projeto' : 'tarefa'}? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            if (itemToDelete.type === 'project') {
              await deleteProject(itemToDelete.id);
              navigate(isAdmin ? '/admin/projects' : '/developer/projects');
            } else {
              await deleteTask(itemToDelete.id);
            }
            setItemToDelete(null);
          } catch (err) {
            console.error('Erro ao excluir:', err);
            alert('Erro ao excluir item.');
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: any;
  onClick: () => void;
  isAdmin?: boolean;
  onDelete?: () => void;
}

const TaskCard: React.FC<TaskCardProps & { project?: any, client?: any }> = ({ task, project, client, onClick, isAdmin, onDelete }) => {
  const navigate = useNavigate();

  const handleCreateTimesheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
  };

  const statusConfig = {
    'Todo': { label: 'NÃO INICIADO', bg: 'bg-[#F1F5F9] dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300' },
    'In Progress': { label: 'TRABALHANDO', bg: 'bg-[#DBEAFE] dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
    'Review': { label: 'TESTE', bg: 'bg-[#FEF3C7] dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
    'Done': { label: 'CONCLUÍDO', bg: 'bg-[#D1FAE5] dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  };

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig['Todo'];

  // Border Color Logic
  const getBorderColor = () => {
    if (task.status === 'Done') return 'var(--success)'; // Green
    if (task.status === 'Review') return 'var(--warning-text)'; // Yellow
    if ((task.daysOverdue ?? 0) > 0) return '#ef4444'; // Red (Delayed)
    return 'var(--border)'; // Default
  };

  const borderColor = getBorderColor();

  return (
    <div
      className="w-full bg-[var(--surface)] border rounded-2xl p-5 hover:shadow-xl transition-all text-left flex flex-col group h-full relative overflow-hidden"
      style={{
        borderColor: borderColor,
        borderWidth: borderColor === 'var(--border)' ? '1px' : '2px',
        boxShadow: borderColor !== 'var(--border)' ? `0 4px 6px -1px ${borderColor}20` : undefined
      }}
    >
      {/* Header Badges */}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-2">
          {task.priority && (
            <span className={`text-[10px] font-bold ${task.priority === 'Critical' ? 'text-red-500' :
              task.priority === 'High' ? 'text-orange-500' :
                task.priority === 'Medium' ? 'text-yellow-500' : 'text-slate-400'
              }`}>
              {task.priority}
            </span>
          )}
          {isAdmin && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 px-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
              title="Excluir Tarefa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div onClick={onClick} className="cursor-pointer">
        <h3 className="text-base font-bold text-[var(--textTitle)] mb-1 leading-tight group-hover:text-[var(--brand)] transition-colors">
          {task.title || "(Sem título)"}
        </h3>

        {/* Project Context */}
        {(project || client) && (
          <div className="flex items-center gap-1.5 text-[var(--textMuted)] mb-4">
            <CheckSquare size={12} className="opacity-70" />
            <span className="text-[11px] font-medium truncate">
              {project?.name || client?.name}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bars (Real vs Planned) */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[9px] font-black text-purple-400 uppercase">Real</span>
            <span className="text-[10px] font-bold text-[var(--textMuted)]">{task.progress || 0}%</span>
          </div>
          <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${task.progress || 0}%`,
                backgroundColor: task.status === 'Done' ? 'var(--success)' : 'var(--brand)'
              }}
            />
          </div>
        </div>

        {task.plannedProgress !== undefined && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase">Previsto</span>
              <span className="text-[10px] font-bold text-slate-400">{task.plannedProgress}%</span>
            </div>
            <div className="flex-1 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-300 dark:bg-slate-700 transition-all"
                style={{ width: `${task.plannedProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Effort Info */}
      {(task.estimatedHours || task.actualHours) && (
        <div className="flex items-center gap-2 mb-4 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 w-fit">
          <Clock size={10} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-500">
            {task.actualHours || 0}h <span className="opacity-40 font-normal">/ {task.estimatedHours || 0}h</span>
          </span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col gap-3">
        {/* Footer Info */}
        <div className="flex justify-between items-center">
          <div className="flex -space-x-2">
            {/* Developer Avatar */}
            <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)] z-10" title={`Responsável: ${task.developerName}`}>
              {task.developerAvatar ? (
                <img src={task.developerAvatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[var(--textMuted)]">
                  {task.developerName?.charAt(0) || '?'}
                </div>
              )}
            </div>

            {/* Collaborators Avatars */}
            {task.collaborators?.map((col: any) => (
              <div key={col.id} className="w-6 h-6 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]" title={`Colaborador: ${col.name}`}>
                {col.avatarUrl ? (
                  <img src={col.avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[var(--textMuted)]">
                    {col.name.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-[var(--textMuted)] truncate max-w-[100px] ml-2">
            {task.developerName?.split(' ')[0]}
            {task.collaborators?.length > 0 && ` +${task.collaborators.length}`}
          </span>
        </div>

        {task.estimatedDelivery && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--textMuted)] font-medium">
            <Clock size={12} />
            {new Date(task.estimatedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
          </div>
        )}
      </div>

      {/* Action Button */}

    </div>
  );
};

export default ProjectDetailView;

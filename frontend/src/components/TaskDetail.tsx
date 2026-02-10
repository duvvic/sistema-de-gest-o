import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import { ArrowLeft, Save, Calendar, Clock, ChevronDown, Crown, Users, StickyNote, AlertTriangle, ShieldAlert, CheckSquare, Plus, Trash2, UserCheck, X } from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';
import TransferResponsibilityModal from './TransferResponsibilityModal';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { tasks, clients, projects, users, projectMembers, timesheetEntries, createTask, updateTask } = useDataController();
  const isDeveloper = !isAdmin;

  const isNew = !taskId || taskId === 'new';
  const task = !isNew ? tasks.find(t => t.id === taskId) : undefined;

  // Query params for defaults
  const preSelectedClientId = searchParams.get('clientId') || searchParams.get('client');
  const preSelectedProjectId = searchParams.get('projectId') || searchParams.get('project');

  const getDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    status: 'Todo',
    progress: 0,
    estimatedDelivery: getDefaultDate(),
    description: '',
    clientId: preSelectedClientId || '',
    projectId: preSelectedProjectId || '',
    developer: '',
    developerId: '',
    notes: '',
    scheduledStart: '',
    actualStart: '',
    actualDelivery: '',
    priority: 'Medium',
    impact: 'Medium',
    risks: '',
    collaboratorIds: [],
    estimatedHours: 0
  });

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Cálculos de Horas e Progresso
  const actualHoursSpent = useMemo(() => {
    if (isNew) return 0;
    return timesheetEntries
      .filter(entry => entry.taskId === taskId)
      .reduce((sum, entry) => sum + entry.totalHours, 0);
  }, [timesheetEntries, taskId, isNew]);

  const plannedProgress = useMemo(() => {
    if (!formData.scheduledStart || !formData.estimatedDelivery) return 0;
    const start = new Date(formData.scheduledStart);
    const end = new Date(formData.estimatedDelivery);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < start) return 0;
    if (today > end) return 100;

    const total = end.getTime() - start.getTime();
    if (total <= 0) return 0;

    const current = today.getTime() - start.getTime();
    return Math.round((current / total) * 100);
  }, [formData.scheduledStart, formData.estimatedDelivery]);

  // Métricas de Equipe (Horas por Colaborador)
  const taskTeamMetrics = useMemo(() => {
    if (isNew || !formData.projectId) return [];

    // Lista de IDs: Responsável + Colaboradores
    const allMemberIds = [
      formData.developerId,
      ...(formData.collaboratorIds || [])
    ].filter(Boolean);

    // IDs únicos
    const uniqueIds = Array.from(new Set(allMemberIds));

    // Buscar membros do projeto para % de alocação
    const projMembers = projectMembers.filter(pm => String(pm.id_projeto) === formData.projectId);

    return uniqueIds.map(userId => {
      const u = users.find(user => user.id === userId);
      const pm = projMembers.find(member => String(member.id_colaborador) === userId);

      const allocationPerc = pm ? Number(pm.allocation_percentage) || 0 : 0;
      // O limite é proporcional à alocação do membro no projeto aplicada às horas da tarefa
      const limit = (allocationPerc / 100) * (formData.estimatedHours || 0);

      const spent = timesheetEntries
        .filter(entry => entry.taskId === taskId && entry.userId === userId)
        .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0);

      const remaining = limit - spent;

      return {
        id: userId,
        name: u?.name || '?',
        avatarUrl: u?.avatarUrl,
        cargo: u?.cargo || 'Membro',
        limit,
        spent,
        remaining: remaining > 0 ? remaining : 0,
        isResponsible: userId === formData.developerId,
        percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
      };
    });
  }, [isNew, formData.developerId, formData.collaboratorIds, formData.projectId, formData.estimatedHours, projectMembers, users, timesheetEntries, taskId]);

  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  // Verifica se a tarefa está concluída 
  const isTaskCompleted = !isNew && task?.status === 'Done';

  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

  // Init form data
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        estimatedDelivery: task.estimatedDelivery?.split('T')[0] || getDefaultDate(),
        scheduledStart: task.scheduledStart,
        actualStart: task.actualStart,
        actualDelivery: task.actualDelivery,
        priority: task.priority || 'Medium',
        impact: task.impact || 'Medium',
        risks: task.risks || '',
        estimatedHours: task.estimatedHours || 0,
      });
    } else {
      // Defaults for new task
      const qClient = preSelectedClientId as string || '';
      const qProject = preSelectedProjectId as string || '';

      const proj = qProject ? projects.find(p => p.id === qProject) : null;
      const finalClient = qClient || (proj ? proj.clientId : '');

      setFormData(prev => ({
        ...prev,
        clientId: finalClient || prev.clientId,
        projectId: qProject || prev.projectId,
        developer: prev.developer || currentUser?.name || '',
        developerId: prev.developerId || currentUser?.id || ''
      }));
    }
  }, [task, currentUser, preSelectedClientId, preSelectedProjectId, projects]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent standard form submission


    if (!formData.projectId || !formData.clientId || !formData.title) {
      alert("Preencha todos os campos obrigatórios (Título, Cliente, Projeto)");
      return;
    }

    try {
      setLoading(true);
      const taskPayload: any = {
        ...formData,
        status: (formData.status as Status) || 'Todo',
        progress: Number(formData.progress) || 0,
        estimatedDelivery: formData.estimatedDelivery!,
        estimatedHours: Number(formData.estimatedHours) || 0,
        // Garante que o responsável seja o usuário logado na criação se nenhum for selecionado
        developerId: formData.developerId || (isNew ? currentUser?.id : formData.developerId),
        developer: formData.developer || (isNew ? currentUser?.name : formData.developer)
      };

      // Automatizar datas reais baseadas no status
      // Se mudou para "In Progress" e não tem início real, registrar agora
      if (taskPayload.status === 'In Progress' && !task?.actualStart && !formData.actualStart) {
        taskPayload.actualStart = new Date().toISOString().split('T')[0];
      }

      // Se mudou para "Done" e não tem fim real, registrar agora
      if (taskPayload.status === 'Done' && !task?.actualDelivery && !formData.actualDelivery) {
        taskPayload.actualDelivery = new Date().toISOString().split('T')[0];
      }

      if (isNew) {
        await createTask(taskPayload);
        alert("Tarefa criada com sucesso!");
      } else if (taskId) {
        await updateTask(taskId, taskPayload);
        alert("Tarefa atualizada com sucesso!");
      }

      discardChanges();
      navigate(-1);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      alert("Erro ao salvar tarefa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    const canGoBack = requestBack();
    if (canGoBack) navigate(-1);
  }, [requestBack, navigate]);

  const handleTransferResponsibility = async (newOwnerId: string) => {
    if (!task || !currentUser) return;

    try {
      setLoading(true);

      // Get new owner info
      const newOwner = users.find(u => u.id === newOwnerId);
      if (!newOwner) {
        alert('Colaborador não encontrado');
        return;
      }

      // Update task: swap owner and add old owner as collaborator
      const updatedCollaboratorIds = [...(task.collaboratorIds || [])];

      // Remove new owner from collaborators if present
      const newOwnerIndex = updatedCollaboratorIds.indexOf(newOwnerId);
      if (newOwnerIndex > -1) {
        updatedCollaboratorIds.splice(newOwnerIndex, 1);
      }

      // Add old owner as collaborator (always the current task.developerId)
      const oldOwnerId = task.developerId;
      if (oldOwnerId && !updatedCollaboratorIds.includes(oldOwnerId)) {
        updatedCollaboratorIds.push(oldOwnerId);
      }

      await updateTask(task.id, {
        developerId: newOwnerId,
        developer: newOwner.name,
        collaboratorIds: updatedCollaboratorIds.filter(id => id !== newOwnerId)
      });

      setTransferModalOpen(false);
      alert(`Responsabilidade transferida para ${newOwner.name} com sucesso!`);
      navigate(-1);
    } catch (error) {
      console.error('Erro ao transferir responsabilidade:', error);
      alert('Erro ao transferir responsabilidade. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Derived values
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedProject = projects.find(p => p.id === formData.projectId);


  const availableProjectsIds = React.useMemo(() => {
    if (isAdmin) return projects.map(p => p.id);
    return projects
      .filter(p => projectMembers.some(pm => String(pm.id_projeto) === p.id && String(pm.id_colaborador) === currentUser?.id))
      .map(p => p.id);
  }, [projects, isAdmin, projectMembers, currentUser]);

  const availableClientIds = React.useMemo(() => {
    if (isAdmin) return clients.map(c => c.id);
    const userProjects = projects.filter(p => availableProjectsIds.includes(p.id));
    return [...new Set(userProjects.map(p => p.clientId))];
  }, [clients, projects, availableProjectsIds, isAdmin]);

  const filteredClients = clients.filter(c => c.active !== false && availableClientIds.includes(c.id));

  const filteredProjects = projects.filter(p =>
    availableProjectsIds.includes(p.id) &&
    p.active !== false &&
    (!formData.clientId || p.clientId === formData.clientId)
  );

  const getDelayDays = () => {
    if (formData.status === 'Done' || formData.status === 'Review') return 0;
    if (!formData.estimatedDelivery) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = formData.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    if (today <= due) return 0;
    const diffTime = today.getTime() - due.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysDelayed = getDelayDays();

  // --- ACCESS CONTROL & PERMISSIONS ---
  const isOwner = task && task.developerId === currentUser?.id;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');

  // Regras de Acesso:
  // 1. Somente Admin altera tudo.
  // 2. Responsável altera apenas Progresso e Status.
  const canEditEverything = isAdmin || isNew;
  const canEditProgressStatus = isAdmin || isOwner || isNew;
  const canAnyEdit = isAdmin || isOwner || isCollaborator || isNew;

  // --- RENDER METHODS ---

  const renderHeader = () => (
    <div className="px-6 py-3 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="p-2 rounded-full transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {isNew ? 'Criar Nova Tarefa' : 'Detalhes da Tarefa'}
            {daysDelayed > 0 && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider"
                style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <AlertTriangle className="w-3 h-3" /> Atrasada ({daysDelayed} dias)
              </span>
            )}
            {isCollaborator && !isAdmin && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider"
                style={{ backgroundColor: 'var(--info-soft)', color: 'var(--info)' }}>
                <ShieldAlert className="w-3 h-3" /> Colaborador
              </span>
            )}
          </h1>
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {isNew ? 'Preencha os dados para iniciar' : `ID: #${task?.id.slice(0, 8)}`}
          </p>
        </div>
      </div>
      {canAnyEdit && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-white px-5 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 transform active:scale-95"
          style={{ backgroundColor: 'var(--primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
        >
          <Save className="w-3.5 h-3.5" />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      )}

      {isTaskCompleted && (
        <div className="px-4 py-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border shadow-sm"
          style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', borderColor: 'var(--success)' }}>
          <CheckSquare className="w-3.5 h-3.5" />
          Finalizada {task?.actualDelivery && ` em ${task.actualDelivery.split('-').reverse().slice(0, 2).join('/')}`}
        </div>
      )}
    </div>
  );

  const renderIdentification = () => (
    <div className="lg:col-span-2 space-y-4">
      {/* Context & Title */}
      <div className={`p-5 rounded-[22px] border shadow-md space-y-4 transition-all relative overflow-hidden`}
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: daysDelayed > 0 ? 'var(--danger)' : 'var(--border)',
          backdropFilter: 'blur(10px)'
        }}>
        {daysDelayed > 0 && (
          <div className="absolute top-0 right-0 px-2.5 py-1 bg-gradient-to-l from-red-600 to-red-500 text-white text-[8px] font-black uppercase tracking-widest rounded-bl-lg shadow-sm">
            Em Atraso
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-40">Cliente</label>
            <div className="relative group/sel">
              <select
                value={formData.clientId || ''}
                onChange={(e) => { markDirty(); setFormData({ ...formData, clientId: e.target.value, projectId: '' }); }}
                className="w-full p-0 bg-transparent border-none text-[11px] font-black outline-none focus:ring-0 cursor-pointer appearance-none"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything || !!preSelectedClientId}
              >
                <option value="">Selecione...</option>
                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-purple-500 transition-all group-hover/sel:w-1/4" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-40">Projeto</label>
            <div className="relative group/sel">
              <select
                value={formData.projectId || ''}
                onChange={(e) => { markDirty(); setFormData({ ...formData, projectId: e.target.value }); }}
                className="w-full p-0 bg-transparent border-none text-[11px] font-black outline-none focus:ring-0 cursor-pointer appearance-none"
                style={{ color: 'var(--text)', backgroundColor: 'var(--surface)' }}
                disabled={!canEditEverything || !formData.clientId || !!preSelectedProjectId}
              >
                <option value="" style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>{formData.clientId ? 'Selecione...' : 'Aguardando cliente'}</option>
                {formData.clientId && filteredProjects.map(p => <option key={p.id} value={p.id} style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}>{p.name}</option>)}
              </select>
              <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-purple-500 transition-all group-hover/sel:w-1/4" />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--border)]">
          <label className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-40 mb-1">Nome da Tarefa</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => { markDirty(); setFormData({ ...formData, title: e.target.value }); }}
            className="w-full bg-transparent border-none p-0 text-xl font-black outline-none focus:ring-0 placeholder:opacity-20 transition-all focus:translate-x-1"
            placeholder="Título da Tarefa"
            style={{ color: 'var(--text)' }}
            disabled={!canEditEverything}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-40">Descrição</label>
          <div className="relative">
            <textarea
              value={formData.description}
              onChange={(e) => { markDirty(); setFormData({ ...formData, description: e.target.value }); }}
              rows={1}
              className="w-full p-2.5 bg-[var(--bg)] border rounded-xl outline-none shadow-inner resize-none transition-all disabled:opacity-60 focus:ring-1 focus:ring-purple-500/30 text-[10px] font-medium leading-relaxed"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Descreva os detalhes desta tarefa..."
              disabled={!canEditEverything}
            />
          </div>
        </div>
      </div>

      {/* Notes Card */}
      <div className="p-3.5 rounded-[20px] border border-dashed shadow-sm flex items-center gap-3 transition-all hover:border-[var(--primary)] hover:bg-[var(--primary)]/[0.02]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/10">
          <StickyNote size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[8px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Notas Rápidas</label>
          <input
            type="text"
            value={formData.notes || ''}
            onChange={(e) => { markDirty(); setFormData({ ...formData, notes: e.target.value }); }}
            placeholder="Alguma nota importante?"
            className="w-full bg-transparent border-none p-0 text-[11px] font-black outline-none focus:ring-0 disabled:opacity-40"
            style={{ color: 'var(--text)' }}
            disabled={!canEditEverything}
          />
        </div>
      </div>
    </div>
  );

  const renderStatusPriorityBlock = () => (
    <div className="h-full">
      <div className="p-4 rounded-[18px] border shadow-md h-full flex flex-col justify-between transition-all bg-gradient-to-b from-[var(--surface)] to-[var(--bg)]" style={{ borderColor: 'var(--border)' }}>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[9px] font-black uppercase tracking-[0.1em] opacity-40">Estado da Tarefa</h3>
            <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_var(--primary)] animate-pulse" style={{ backgroundColor: formData.status === 'Done' ? 'var(--success)' : 'var(--primary)' }} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[8px] font-black mb-2.5 flex items-center gap-2 uppercase tracking-[0.15em] opacity-40">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {['Todo', 'In Progress', 'Review', 'Done'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { markDirty(); setFormData({ ...formData, status: s as Status }); }}
                    className={`px-1.5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-tighter transition-all border ${formData.status === s ? 'text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] scale-[1.02]' : 'bg-[var(--bg)] border-[var(--border)] opacity-60 hover:opacity-100 hover:border-purple-500/30 shadow-inner'} disabled:opacity-40 disabled:scale-100`}
                    style={{
                      backgroundColor: formData.status === s ? 'var(--primary)' : undefined,
                      borderColor: formData.status === s ? 'var(--primary)' : undefined,
                      color: formData.status === s ? '#fff' : 'var(--text)'
                    }}
                    disabled={!canEditProgressStatus}
                  >
                    {s === 'Todo' ? 'Não Iniciado' : s === 'In Progress' ? 'Iniciado' : s === 'Review' ? 'Pendente' : 'Concluído'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-black mb-2.5 uppercase tracking-[0.15em] opacity-40">Prioridade</label>
              <div className="relative group/pri">
                <select
                  value={formData.priority}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, priority: e.target.value as Priority }); }}
                  className="w-full p-2.5 bg-[var(--bg)] border rounded-xl text-[10px] font-black shadow-inner outline-none focus:ring-1 focus:ring-purple-500/30 transition-all disabled:opacity-40"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  disabled={!canEditEverything}
                >
                  <option value="Low">Baixa</option>
                  <option value="Medium">Média</option>
                  <option value="High">Alta</option>
                  <option value="Critical">Crítica</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] mt-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] opacity-40">Progresso</span>
            <span className="text-lg font-black drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]" style={{ color: 'var(--primary)' }}>{formData.progress}%</span>
          </div>
          <div className="px-1">
            <input
              type="range"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => { markDirty(); setFormData({ ...formData, progress: Number(e.target.value) }); }}
              className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-purple-600 transition-all hover:h-1.5 disabled:opacity-40"
              disabled={!canEditProgressStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeamMetricsBlock = () => (
    <div className="p-4 rounded-[20px] border shadow-sm flex flex-col transition-all hover:shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 shadow-sm border border-purple-500/10">
            <Users size={12} />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40">Equipe Alocada</h3>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {/* Métricas por Colaborador */}
        <div className="space-y-3">
          <label className="block text-[9px] font-black uppercase opacity-40 tracking-widest">Painel de Equipe</label>
          <div className="space-y-2">
            {taskTeamMetrics.map(metric => (
              <div
                key={metric.id}
                onClick={() => isAdmin && setActiveMemberId(activeMemberId === metric.id ? null : metric.id)}
                className={`relative p-2.5 rounded-xl border transition-all cursor-pointer ${activeMemberId === metric.id ? 'bg-[var(--surface-hover)] border-purple-500 ring-1 ring-purple-500/30' : 'bg-gradient-to-br from-[var(--bg)] to-[var(--surface-2)] border-[var(--border)] shadow-sm hover:shadow-md'}`}
              >
                {/* Actions Overlay for Admin */}
                {activeMemberId === metric.id && isAdmin && (
                  <div className="absolute inset-0 bg-[var(--surface)]/95 backdrop-blur-sm z-20 flex items-center justify-center gap-2 rounded-xl animate-in fade-in duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Make Responsible logic
                        if (metric.isResponsible) return;
                        markDirty();
                        // Swap: new responsible gets ID, old goes to collaborators?
                        // Simplified: Set new developer, ensure old is in collaborators if logical, but here we just set developer.
                        // Actually, logic: Set new developerId. Old developerId automatically becomes just "not developerId".
                        // We should ensure the new developer is NOT in collaboratorIds to avoid dupes?
                        // And maybe ensure old developer IS in collaboratorIds?
                        // For simplicity, just set developerId. cleanliness is handled elsewhere or ignored.
                        // Ideally: remove new dev from collaborators, add old dev to collaborators.
                        const currentCollabs = formData.collaboratorIds || [];
                        const oldDevId = formData.developerId;
                        let newCollabs = currentCollabs.filter(id => id !== metric.id); // remove new dev from collabs

                        if (oldDevId && oldDevId !== metric.id) {
                          // Verify if oldDev is actually a valid user before adding (optional but safe)
                          // We just push the ID. The backend/UI will handle display.
                          // Check if not already in there (shouldn't be, but safe)
                          if (!newCollabs.includes(oldDevId)) {
                            newCollabs.push(oldDevId);
                          }
                        }

                        setFormData({
                          ...formData,
                          developerId: metric.id,
                          developer: metric.name,
                          collaboratorIds: newCollabs
                        });
                        setActiveMemberId(null);
                      }}
                      className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-colors"
                      title="Definir como Responsável"
                      disabled={metric.isResponsible}
                    >
                      <Crown size={14} />
                    </button>
                    {!metric.isResponsible && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markDirty();
                          const current = formData.collaboratorIds || [];
                          setFormData({ ...formData, collaboratorIds: current.filter(id => id !== metric.id) });
                          setActiveMemberId(null);
                        }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                        title="Remover da Tarefa"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMemberId(null); }}
                      className="absolute top-1 right-1 p-1 rounded-full text-[var(--muted)] hover:bg-[var(--bg)]"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-[12px] overflow-hidden border border-white/10 shadow-sm">
                      {metric.avatarUrl ? (
                        <img src={metric.avatarUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white font-black text-xs">
                          {metric.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    {metric.isResponsible && (
                      <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 rounded-full p-0.5 border-2 border-[var(--surface)] shadow-sm z-10" title="Responsável">
                        <Crown size={10} className="fill-yellow-800 text-yellow-800" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-black truncate text-[var(--text)] tracking-tight">{metric.name}</p>
                        <p className="text-[7px] font-bold opacity-50 uppercase tracking-[0.1em]">{metric.cargo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-purple-600">{metric.spent}h</p>
                        <p className="text-[7px] font-bold opacity-40 uppercase">Apontado</p>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center text-[7.5px] font-black uppercase tracking-widest">
                        <span className="opacity-40">Limite: {metric.limit.toFixed(1)}h</span>
                        <span className={metric.remaining > 0 ? "text-emerald-500" : "text-red-500"}>
                          Restante: {metric.remaining.toFixed(1)}h
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-[var(--bg)] overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${metric.percent > 90 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${metric.percent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isAdmin && (
              <div className="pt-2">
                <div className="relative">
                  <button
                    onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                    className="w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] hover:border-purple-500 hover:text-purple-500 hover:bg-purple-500/5 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Plus size={12} /> Adicionar Membro
                  </button>

                  {isAddMemberOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAddMemberOpen(false)} />
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden animate-in zoom-in-95 duration-100 p-1 space-y-0.5 max-h-[200px] overflow-y-auto">
                        <div className="px-3 py-2 text-[9px] font-black uppercase text-[var(--muted)] border-b border-[var(--border)] mb-1">
                          Selecione um membro
                        </div>
                        {users
                          .filter(u =>
                            u.active !== false &&
                            projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) &&
                            u.id !== formData.developerId &&
                            !formData.collaboratorIds?.includes(u.id)
                          )
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                markDirty();
                                const current = formData.collaboratorIds || [];
                                setFormData({ ...formData, collaboratorIds: [...current, u.id] });
                                setIsAddMemberOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors flex items-center gap-2 group/item"
                            >
                              <div className="w-5 h-5 rounded overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[8px] font-black text-[var(--muted)] uppercase group-hover/item:border-purple-500/30 transition-colors">
                                {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.name.substring(0, 2)}
                              </div>
                              <span className="uppercase tracking-tight truncate">{u.name}</span>
                            </button>
                          ))
                        }
                        {users.filter(u =>
                          u.active !== false &&
                          projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) &&
                          u.id !== formData.developerId &&
                          !formData.collaboratorIds?.includes(u.id)
                        ).length === 0 && (
                            <div className="px-3 py-4 text-center">
                              <p className="text-[9px] font-black text-[var(--muted)] uppercase">Ninguém disponível</p>
                            </div>
                          )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {taskTeamMetrics.length === 0 && (
              <div className="py-4 text-center border-2 border-dashed border-[var(--border)] rounded-xl opacity-20 text-[9px] font-bold italic">Aguardando alocação...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimelineBlock = () => (
    <div className="p-4 rounded-[20px] border shadow-sm flex flex-col transition-all hover:shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 shadow-sm border border-blue-500/10">
          <Calendar size={12} />
        </div>
        <h3 className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40">Datas</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black uppercase opacity-40 tracking-widest">Início Previsto</label>
            <input type="date" value={formData.scheduledStart || ''} onChange={e => { markDirty(); setFormData({ ...formData, scheduledStart: e.target.value }); }} className="w-full bg-[var(--bg)] p-2.5 rounded-xl border-none font-bold text-[10px] disabled:opacity-40" disabled={!canEditEverything} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[9px] font-black uppercase opacity-40 tracking-widest">Entrega Final</label>
            <input type="date" value={formData.estimatedDelivery || ''} onChange={e => { markDirty(); setFormData({ ...formData, estimatedDelivery: e.target.value }); }} className={`w-full p-2.5 rounded-xl border font-bold text-[10px] ${daysDelayed > 0 ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-[var(--bg)] border-none'} disabled:opacity-40`} disabled={!canEditEverything} />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-[7px] font-black uppercase opacity-30">Início Real</p>
            <p className="text-[10px] font-black text-blue-500">{formData.actualStart ? formData.actualStart.split('-').reverse().join('/') : '--/--/--'}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[7px] font-black uppercase opacity-30">Fim Real</p>
            <p className="text-[10px] font-black text-emerald-500">{formData.actualDelivery ? formData.actualDelivery.split('-').reverse().join('/') : '--/--/--'}</p>
          </div>
        </div>
        <p className="text-[7px] italic opacity-30">* Registradas automaticamente ao mudar o status.</p>
      </div>
    </div>
  );

  const renderEffortBlock = () => (
    <div className={`p-4 rounded-[20px] border shadow-sm flex flex-col transition-all hover:shadow-md ${canEditEverything ? '' : 'opacity-60 cursor-not-allowed group'}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 shadow-sm border border-emerald-500/10">
            <Clock size={12} />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40">Esforço</h3>
        </div>
        {canEditEverything && (
          <div className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${actualHoursSpent > (formData.estimatedHours || 0) ? 'bg-red-500 text-white shadow-sm' : 'bg-emerald-500/10 text-emerald-600'}`}>
            {actualHoursSpent > (formData.estimatedHours || 0) ? 'Excedido' : 'No Prazo'}
          </div>
        )}
      </div>

      <div className="space-y-6 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-center gap-8">
          <div className="text-center space-y-1">
            <p className="text-[8px] font-black text-[var(--muted)] uppercase tracking-wider">Estimado</p>
            <div className="bg-gradient-to-br from-[var(--bg)] to-[var(--surface-2)] p-2 rounded-[14px] border border-[var(--border)] shadow-inner w-16">
              <input
                type="number"
                step="0.5"
                value={formData.estimatedHours || 0}
                onChange={e => { markDirty(); setFormData({ ...formData, estimatedHours: Number(e.target.value) }); }}
                className="w-full bg-transparent border-none p-0 font-black text-base text-center outline-none focus:ring-0 disabled:opacity-40"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything}
              />
            </div>
          </div>

          <div className="w-px h-10 bg-gradient-to-b from-transparent via-[var(--border)] to-transparent" />

          <div className="text-center space-y-1">
            <p className="text-[8px] font-black text-[var(--muted)] uppercase tracking-wider">Realizado</p>
            <div className="bg-gradient-to-br from-purple-500/5 to-indigo-500/10 p-2 rounded-[14px] border border-purple-500/10 shadow-sm w-16">
              <span className={`font-black text-base ${actualHoursSpent > (formData.estimatedHours || 0) ? 'text-red-500' : 'text-purple-600'}`}>
                {actualHoursSpent}h
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
            <span className="opacity-40">Taxa de Conclusão</span>
            <div className="flex gap-3">
              <span className="text-slate-400">Meta: {plannedProgress}%</span>
              <span className="text-purple-600">Real: {formData.progress}%</span>
            </div>
          </div>
          <div className="relative pt-1">
            <div className="h-3 w-full bg-[var(--bg)] rounded-full overflow-hidden shadow-inner p-0.5">
              <div className="h-full rounded-full transition-all duration-1000 flex">
                <div className="h-full bg-slate-300 dark:bg-slate-700/50 rounded-l-full" style={{ width: `${plannedProgress}%` }} />
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                  style={{
                    width: `${formData.progress}%`,
                    marginLeft: `-${Math.min(plannedProgress, formData.progress)}%`,
                    zIndex: 10
                  }} />
              </div>
            </div>
          </div>
          <p className="text-[7px] text-center opacity-30 italic">O progresso real deve acompanhar ou superar o planejado.</p>
        </div>
      </div>
    </div>
  );

  const renderModals = () => (
    <>
      {showPrompt && (
        <ConfirmationModal
          isOpen={true}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Deseja continuar editando ou descartar?"
          confirmText="Continuar editando"
          cancelText="Descartar alterações"
          onConfirm={continueEditing}
          onCancel={() => {
            discardChanges();
            navigate(-1);
          }}
        />
      )}

      {task && isOwner && !isAdmin && (
        <TransferResponsibilityModal
          isOpen={transferModalOpen}
          currentOwner={{ id: currentUser?.id || '', name: currentUser?.name || '' }}
          collaborators={(task.collaboratorIds || [])
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u)
            .map(u => ({ id: u.id, name: u.name }))}
          onConfirm={handleTransferResponsibility}
          onCancel={() => setTransferModalOpen(false)}
        />
      )}
    </>
  );

  if (!isNew && !task) {
    return <div className="p-8 text-center" style={{ color: 'var(--textMuted)' }}>Tarefa não encontrada.</div>;
  }

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {renderHeader()}

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto space-y-4">

          {/* TOP SECTION: Identification & Context */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {renderIdentification()}
            {renderStatusPriorityBlock()}
          </div>

          {/* BOTTOM SECTION: Team, Timeline & Effort */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {renderTeamMetricsBlock()}
            {renderTimelineBlock()}
            {renderEffortBlock()}
          </div>
        </div>
      </div>

      {renderModals()}
    </div>
  );
};

export default TaskDetail;

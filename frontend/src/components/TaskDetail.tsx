import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import { ArrowLeft, Save, Calendar, Clock, Crown, Users, StickyNote, CheckSquare, Plus, Trash2, X, CheckCircle, Activity, Zap, AlertTriangle } from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';
import TransferResponsibilityModal from './TransferResponsibilityModal';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { tasks, clients, projects, users, projectMembers, timesheetEntries, createTask, updateTask, deleteTask } = useDataController();

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
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ force: boolean } | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
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
      const qClient = preSelectedClientId as string || '';
      const qProject = preSelectedProjectId as string || '';
      const proj = qProject ? projects.find(p => p.id === qProject) : null;
      const finalClient = qClient || (proj ? proj.clientId : '');

      setFormData(prev => ({
        ...prev,
        clientId: finalClient || prev.clientId,
        projectId: qProject || prev.projectId,
      }));
    }
  }, [task, preSelectedClientId, preSelectedProjectId, projects]);

  // Automação do Status baseada na Data
  useEffect(() => {
    if (formData.status === 'Review' || formData.status === 'Done') return;

    if (formData.scheduledStart) {
      const startParts = formData.scheduledStart.split('-');
      const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newStatus: Status = today >= start ? 'In Progress' : 'Todo';
      if (formData.status !== newStatus) {
        setFormData(prev => ({ ...prev, status: newStatus }));
      }
    }
  }, [formData.scheduledStart, formData.status]);

  // Cálculos
  const actualHoursSpent = useMemo(() => {
    if (isNew) return 0;
    return timesheetEntries
      .filter(entry => entry.taskId === taskId)
      .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0);
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

  const taskTeamMetrics = useMemo(() => {
    if (!formData.projectId) return [];
    const allMemberIds = Array.from(new Set([formData.developerId, ...(formData.collaboratorIds || [])].filter(Boolean)));
    const projMembers = projectMembers.filter(pm => String(pm.id_projeto) === formData.projectId);

    return allMemberIds.map(userId => {
      const u = users.find(user => user.id === userId);
      const pm = projMembers.find(member => String(member.id_colaborador) === userId);
      const allocationPerc = pm ? Number(pm.allocation_percentage) || 0 : 0;
      const limit = (allocationPerc / 100) * (formData.estimatedHours || 0);
      const spent = !isNew ? timesheetEntries
        .filter(entry => entry.taskId === taskId && entry.userId === userId)
        .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0) : 0;

      return {
        id: userId!,
        name: u?.name || '?',
        avatarUrl: u?.avatarUrl,
        cargo: u?.cargo || 'Membro',
        spent,
        limit,
        isResponsible: userId === formData.developerId,
        percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
      };
    });
  }, [formData.developerId, formData.collaboratorIds, formData.projectId, formData.estimatedHours, projectMembers, users, timesheetEntries, taskId, isNew]);

  const projectTotalHours = useMemo(() => {
    if (!formData.projectId) return 0;
    // Soma horas de todas as tarefas do projeto (exceto a atual se estivermos editando, para somar o valor do formulário)
    const otherTasksHours = tasks
      .filter(t => t.projectId === formData.projectId && t.id !== taskId)
      .reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
    return otherTasksHours + (Number(formData.estimatedHours) || 0);
  }, [tasks, formData.projectId, formData.estimatedHours, taskId]);

  const taskWeight = useMemo(() => {
    if (!projectTotalHours || !formData.estimatedHours) return 0;
    return (Number(formData.estimatedHours) / projectTotalHours) * 100;
  }, [projectTotalHours, formData.estimatedHours]);

  // Permissões
  const isOwner = task && task.developerId === currentUser?.id;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');
  const canEditEverything = isAdmin || isNew;
  const canEditProgressStatus = isAdmin || isOwner || isNew;
  const canAnyEdit = isAdmin || isOwner || isCollaborator || isNew;

  const getDelayDays = () => {
    if (formData.status === 'Done' || formData.status === 'Review' || !formData.estimatedDelivery) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parts = formData.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return today > due ? Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  };
  const daysDelayed = getDelayDays();

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.clientId || !formData.title || !formData.developerId) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }
    try {
      setLoading(true);
      const payload: any = { ...formData, progress: Number(formData.progress), estimatedHours: Number(formData.estimatedHours) };
      if (payload.status === 'In Progress' && !formData.actualStart) payload.actualStart = new Date().toISOString().split('T')[0];
      if (payload.status === 'Done' && !formData.actualDelivery) payload.actualDelivery = new Date().toISOString().split('T')[0];

      // Se for Pendente, mantemos o status Review no banco
      if (payload.status === 'Review') payload.status = 'Review';

      if (isNew) await createTask(payload);
      else if (taskId) await updateTask(taskId, payload);
      discardChanges(); navigate(-1);
    } catch (error) { alert("Erro ao salvar"); } finally { setLoading(false); }
  };

  const performDelete = async () => {
    if (!taskId || !deleteConfirmation) return;
    try {
      setLoading(true);
      await deleteTask(taskId, deleteConfirmation.force);
      discardChanges(); navigate(-1);
    } catch (error: any) {
      if (error.message?.includes("horas apontadas")) setDeleteConfirmation({ force: true });
      else alert("Erro ao excluir");
    } finally { setLoading(false); }
  };

  const handleTransferResponsibility = async (newOwnerId: string) => {
    const newOwner = users.find(u => u.id === newOwnerId);
    if (!task || !newOwner) return;
    try {
      setLoading(true);
      const collabs = [...(task.collaboratorIds || [])].filter(id => id !== newOwnerId);
      if (task.developerId && !collabs.includes(task.developerId)) collabs.push(task.developerId);
      await updateTask(task.id, { developerId: newOwnerId, developer: newOwner.name, collaboratorIds: collabs });
      setTransferModalOpen(false); navigate(-1);
    } catch (error) { alert("Erro ao transferir"); } finally { setLoading(false); }
  };

  const filteredClients = clients.filter(c => c.active !== false);
  const filteredProjects = projects.filter(p => p.active !== false && (!formData.clientId || p.clientId === formData.clientId));
  const responsibleUsers = useMemo(() => {
    if (!formData.projectId) return [];
    const membersIds = projectMembers.filter(pm => String(pm.id_projeto) === formData.projectId).map(pm => String(pm.id_colaborador));
    return users.filter(u => u.active !== false && (membersIds.includes(u.id) || u.id === formData.developerId));
  }, [users, projectMembers, formData.projectId, formData.developerId]);

  // Sub-Renders
  const renderHeader = () => (
    <div className={`px-5 py-3 border-b flex items-center justify-between sticky top-0 z-20 backdrop-blur-xl transition-colors ${daysDelayed > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
      <div className="flex items-center gap-3">
        <button onClick={() => requestBack() && navigate(-1)} className="p-2 rounded-lg hover:bg-purple-500/10 text-[var(--muted)] group">
          <ArrowLeft className="w-4 h-4 group-hover:text-purple-500 transition-colors" />
        </button>
        <div>
          <h1 className="text-lg font-black flex items-center gap-2 text-[var(--text)]">
            {isNew ? 'Nova Tarefa' : 'Detalhes da Tarefa'}
            {daysDelayed > 0 && (
              <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-red-500 text-white uppercase font-black animate-pulse">
                <AlertTriangle size={10} />
                {daysDelayed} dias de atraso
              </span>
            )}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isNew && (isAdmin || isOwner) && (
          <button onClick={() => setDeleteConfirmation({ force: false })} className="p-2 rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
        )}
        {canAnyEdit && (
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 rounded-lg bg-[var(--primary)] text-white text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">
            {loading ? '...' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
  );

  const renderIdentification = () => (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-lg h-full flex flex-col gap-4">
      <div className="flex items-center gap-2 opacity-50"><CheckSquare size={14} /><h3 className="text-[9px] font-black uppercase tracking-widest">Identificação</h3></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[7px] font-black uppercase opacity-30">Cliente</label>
          <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value, projectId: '' })} className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none" disabled={!canEditEverything}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
        <div className="space-y-1">
          <label className="text-[7px] font-black uppercase opacity-30">Projeto</label>
          <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })} className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none" disabled={!canEditEverything}>{filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[7px] font-black uppercase opacity-30">Responsável</label>
        <select value={formData.developerId} onChange={e => { const u = users.find(usr => usr.id === e.target.value); setFormData({ ...formData, developerId: e.target.value, developer: u?.name || '' }) }} className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none" disabled={!canEditEverything}>{responsibleUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
      </div>
      <div className="space-y-1 flex-1 flex flex-col min-h-[120px]">
        <label className="text-[7px] font-black uppercase opacity-30">Título</label>
        <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-transparent border-none p-0 text-sm font-black outline-none" placeholder="Título..." disabled={!canEditEverything} />
        <label className="text-[7px] font-black uppercase opacity-30 mt-3">Descrição</label>
        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="flex-1 w-full bg-[var(--bg)]/30 border border-[var(--border)] rounded-lg p-2.5 text-[10px] outline-none resize-none leading-relaxed transition-all focus:border-purple-500/30" placeholder="Descrição detalhada da tarefa..." disabled={!canEditEverything} />
      </div>
      <div className="p-3 bg-[var(--bg)]/40 border border-dashed border-[var(--border)] rounded-xl flex flex-col min-h-[140px] flex-grow transition-all hover:border-amber-500/20">
        <div className="flex items-center gap-1.5 opacity-30 mb-2"><StickyNote size={11} /><span className="text-[8px] font-black uppercase tracking-wider">Notas Internas</span></div>
        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="flex-1 bg-transparent border-none p-0 text-[10px] outline-none resize-none leading-relaxed placeholder:opacity-20" placeholder="Anote observações importantes aqui..." disabled={!canEditEverything} />
      </div>
    </div>
  );

  const renderTimeline = () => {
    const totalDays = formData.scheduledStart && formData.estimatedDelivery ? Math.ceil((new Date(formData.estimatedDelivery).getTime() - new Date(formData.scheduledStart).getTime()) / 86400000) : 0;
    const daysUsed = formData.scheduledStart ? Math.ceil((new Date().getTime() - new Date(formData.scheduledStart).getTime()) / 86400000) : 0;
    const progressPerc = totalDays > 0 ? Math.min(Math.max((daysUsed / totalDays) * 100, 0), 100) : 0;

    return (
      <div className={`p-4 rounded-xl border transition-all shadow-lg flex flex-col gap-4 ${daysDelayed > 0 ? 'border-red-500/40 bg-red-500/5' : 'border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)]'}`}>
        <div className="flex items-center justify-between opacity-50">
          <div className="flex items-center gap-2"><Calendar size={14} /><h3 className="text-[9px] font-black uppercase tracking-widest">Cronograma</h3></div>
          {daysDelayed > 0 && <span className="text-[8px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={10} /> Em Atraso</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><label className="text-[7px] font-black uppercase opacity-30">Previsão Início</label><input type="date" value={formData.scheduledStart} onChange={e => setFormData({ ...formData, scheduledStart: e.target.value })} className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)]" disabled={!canEditEverything} /></div>
          <div className="space-y-1"><label className={`text-[7px] font-black uppercase opacity-30 ${daysDelayed > 0 ? 'text-red-400 opacity-100' : ''}`}>Previsão Entrega</label><input type="date" value={formData.estimatedDelivery} onChange={e => setFormData({ ...formData, estimatedDelivery: e.target.value })} className={`w-full p-2 rounded-lg text-[10px] font-bold border ${daysDelayed > 0 ? 'bg-red-500/10 border-red-500 text-red-200' : 'bg-[var(--bg)]/50 border-[var(--border)]'}`} disabled={!canEditEverything} /></div>
        </div>
        <div className="p-3 bg-[var(--bg)]/40 rounded-lg space-y-2">
          <div className="flex justify-between items-end"><span className="text-[8px] font-black uppercase opacity-30">Jornada</span><span className={`text-sm font-black ${daysDelayed > 0 ? 'text-red-500' : 'text-blue-500'}`}>{Math.round(progressPerc)}%</span></div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${daysDelayed > 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} style={{ width: `${progressPerc}%` }} /></div>
          <div className="flex justify-between text-[7px] font-bold opacity-30 uppercase"><span>{totalDays}d total</span><span className={daysDelayed > 0 ? 'text-red-500 opacity-100' : ''}>{daysDelayed > 0 ? `${daysDelayed}d extrapolados` : `${Math.max(0, totalDays - daysUsed)}d restantes`}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-[var(--bg)]/30 rounded-lg border border-[var(--border)]/20 text-center"><p className="text-[6px] font-black uppercase opacity-30">Real Início</p><p className="text-[10px] font-black text-blue-400">{formData.actualStart?.split('-').reverse().slice(0, 2).join('/') || '--'}</p></div>
          <div className={`p-2 bg-[var(--bg)]/30 rounded-lg border text-center ${formData.actualDelivery ? 'border-emerald-500/30' : 'border-[var(--border)]/20'}`}><p className="text-[6px] font-black uppercase opacity-30">Real Entrega</p><p className="text-[10px] font-black text-emerald-400">{formData.actualDelivery?.split('-').reverse().slice(0, 2).join('/') || '--'}</p></div>
        </div>
      </div>
    );
  };

  const renderEffort = () => (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-lg flex-1 flex flex-col gap-4">
      <div className="flex items-center gap-2 opacity-50"><Clock size={14} /><h3 className="text-[9px] font-black uppercase tracking-widest">Esforço</h3></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-[var(--bg)]/40 rounded-lg text-center border border-[var(--border)]/10">
          <label className="text-[7px] font-black uppercase opacity-30 block">Planejado</label>
          <input
            type="number"
            value={formData.estimatedHours || ''}
            onChange={e => {
              markDirty();
              const val = e.target.value === '' ? 0 : Number(e.target.value);
              setFormData({ ...formData, estimatedHours: val });
            }}
            className="bg-transparent border-none text-xl font-black text-center w-full outline-none placeholder:opacity-10"
            placeholder="0"
            disabled={!canEditEverything}
          />
          <span className="text-[8px] font-bold opacity-30">horas</span>
        </div>
        <div className="p-3 bg-[var(--bg)]/40 rounded-lg text-center border border-[var(--border)]/10"><label className="text-[7px] font-black uppercase opacity-30 block">Apontado</label><p className={`text-xl font-black ${actualHoursSpent > (formData.estimatedHours || 0) ? 'text-red-500' : 'text-emerald-500'}`}>{actualHoursSpent}</p><span className="text-[8px] font-bold opacity-30">horas</span></div>
      </div>
      <div className="mt-auto p-3 bg-purple-500/5 border border-purple-500/10 rounded-lg flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-purple-400" />
            <span className="text-[8px] font-black uppercase opacity-60">Peso no Projeto</span>
          </div>
          <span className="text-sm font-black text-purple-400">{formData.estimatedHours ? `${taskWeight.toFixed(1)}%` : '--'}</span>
        </div>

        {/* Barra Visual de Peso */}
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-purple-500" style={{ width: `${Math.min(taskWeight, 100)}%` }} />
        </div>

        {!formData.estimatedHours && (
          <p className="text-[8px] text-yellow-500/70 font-bold text-center mt-1 animate-pulse">Defina o Planejado para calcular</p>
        )}
      </div>
    </div>
  );

  const renderStatusPriority = () => (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-lg flex flex-col gap-4">
      <div className="flex items-center gap-2 opacity-50"><Activity size={14} /><h3 className="text-[9px] font-black uppercase tracking-widest">Estado & Prioridade</h3></div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            markDirty();
            const startParts = formData.scheduledStart?.split('-') || [];
            const start = startParts.length === 3 ? new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2])) : null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const autoStatus = (start && today >= start) ? 'In Progress' : 'Todo';
            setFormData({ ...formData, status: autoStatus });
          }}
          className={`col-span-2 py-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${formData.status === 'Todo' || formData.status === 'In Progress' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50 hover:opacity-100'}`}
          disabled={!canEditProgressStatus}
        >
          <Zap size={14} /><span className="text-[9px] font-black uppercase">Automático</span>
        </button>

        <button
          type="button"
          onClick={() => { markDirty(); setFormData({ ...formData, status: 'Review' }); }}
          className={`py-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${formData.status === 'Review' ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-500/20' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50 hover:opacity-100'}`}
          disabled={!canEditProgressStatus}
        >
          <Clock size={14} /><span className="text-[9px] font-black uppercase">Pendente</span>
        </button>

        <button
          type="button"
          onClick={() => { markDirty(); setFormData({ ...formData, status: 'Done' }); }}
          className={`py-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${formData.status === 'Done' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50 hover:opacity-100'}`}
          disabled={!canEditProgressStatus}
        >
          <CheckCircle size={14} /><span className="text-[9px] font-black uppercase">Concluído</span>
        </button>
      </div>
      <div className="space-y-1 mt-1">
        <label className="text-[7px] font-black uppercase opacity-30 ml-0.5">Prioridade</label>
        <div className="grid grid-cols-4 gap-1.5">
          {(['Low', 'Medium', 'High', 'Critical'] as Priority[]).map(p => (
            <button key={p} type="button" onClick={() => { markDirty(); setFormData({ ...formData, priority: p }); }} className={`py-2 rounded-lg text-[8px] font-black uppercase border transition-all ${formData.priority === p ? 'bg-purple-600 border-purple-400 text-white shadow-md' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-50 hover:opacity-100'}`} disabled={!canEditEverything}>{p === 'Low' ? 'Baixa' : p === 'Medium' ? 'Média' : p === 'High' ? 'Alta' : 'Crítica'}</button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)]/20 space-y-2.5">
        <div className="flex justify-between text-[8px] font-black uppercase px-0.5"><span className="opacity-40">Progresso Atual</span><span className="text-purple-400 font-black text-[10px] tabular-nums">{formData.progress}%</span></div>
        <input
          type="range"
          min="0"
          max="100"
          value={formData.progress}
          onChange={e => { markDirty(); setFormData({ ...formData, progress: Number(e.target.value) }); }}
          className="w-full h-2 rounded-full appearance-none bg-slate-800 accent-purple-500 cursor-pointer focus:outline-none hover:accent-purple-400 transition-all"
          disabled={!canEditProgressStatus}
        />
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-lg flex-1 flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between opacity-50">
        <div className="flex items-center gap-2">
          <Users size={14} />
          <h3 className="text-[9px] font-black uppercase tracking-widest">Equipe Alocada</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
        {taskTeamMetrics.map(m => (
          <div
            key={m.id}
            onClick={() => isAdmin && setActiveMemberId(activeMemberId === m.id ? null : m.id)}
            className={`relative p-3 rounded-xl border transition-all cursor-pointer group/member overflow-hidden ${activeMemberId === m.id ? 'bg-purple-500/10 border-purple-500/40' : 'bg-[var(--bg)]/40 border-[var(--border)] hover:border-purple-500/20'}`}
          >
            {/* Overlay de Ações */}
            {activeMemberId === m.id && isAdmin && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 flex items-center justify-center gap-4 rounded-xl animate-in fade-in zoom-in duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (m.isResponsible) return;
                    markDirty();
                    const currentCollabs = formData.collaboratorIds || [];
                    const oldDevId = formData.developerId;
                    let newCollabs = currentCollabs.filter(id => id !== m.id);
                    if (oldDevId && oldDevId !== m.id && !newCollabs.includes(oldDevId)) newCollabs.push(oldDevId);
                    setFormData({ ...formData, developerId: m.id, developer: m.name, collaboratorIds: newCollabs });
                    setActiveMemberId(null);
                  }}
                  title="Tornar Responsável"
                  className={`p-2 rounded-lg transition-all shadow-lg ${m.isResponsible ? 'bg-yellow-500/50 cursor-not-allowed text-white' : 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white'}`}
                >
                  <Crown size={16} />
                </button>
                {!m.isResponsible && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markDirty();
                      const current = formData.collaboratorIds || [];
                      setFormData({ ...formData, collaboratorIds: current.filter(id => id !== m.id) });
                      setActiveMemberId(null);
                    }}
                    title="Remover da Equipe"
                    className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); setActiveMemberId(null); }} className="absolute top-1.5 right-1.5 p-1 text-slate-500 hover:text-slate-300">
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-colors ${m.isResponsible ? 'border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'border-purple-500/10'}`}>
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-black text-xs">
                      {m.name.charAt(0)}
                    </div>
                  )}
                </div>
                {m.isResponsible && (
                  <div className="absolute -top-1 -right-1 bg-yellow-500 rounded p-0.5 border border-slate-900 shadow-sm">
                    <Crown size={8} className="text-white fill-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-black text-slate-100 truncate">{m.name}</p>
                    <p className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">{m.cargo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black uppercase opacity-30 mb-0.5 whitespace-nowrap">Apontado / Alocado</p>
                    <p className="text-[10px] font-black text-slate-100 tabular-nums">{m.spent.toFixed(1)}h<span className="opacity-30 mx-1">/</span><span className="text-purple-400">{m.limit.toFixed(1)}h</span></p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800/50 overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-700 ${m.percent > 90 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 to-indigo-500'}`}
                    style={{ width: `${Math.min(m.percent, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {isAdmin && (
          <button
            onClick={() => setIsAddMemberOpen(true)}
            className="w-full py-3 border border-dashed border-[var(--border)] rounded-xl text-[9px] font-black uppercase opacity-40 hover:opacity-100 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Adicionar Colaborador
          </button>
        )}

        {taskTeamMetrics.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[var(--border)] rounded-xl bg-slate-900/40 p-4 opacity-30">
            <Users size={20} className="mb-2 text-slate-600" />
            <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Sem membros alocados</p>
          </div>
        )}
      </div>
    </div>
  );

  if (!isNew && !task) return <div className="p-8 text-center" style={{ color: 'var(--textMuted)' }}>Tarefa não encontrada.</div>;

  return (
    <div className="h-full flex flex-col rounded-xl shadow-md border overflow-hidden bg-[var(--surface)] border-[var(--border)]">
      {renderHeader()}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto h-full flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full items-stretch">
            <div className="flex flex-col gap-4">{renderIdentification()}</div>
            <div className="flex flex-col gap-4">{renderTimeline()}{renderEffort()}</div>
            <div className="flex flex-col gap-4">{renderStatusPriority()}{renderTeam()}</div>
          </div>
        </div>
      </div>

      <ConfirmationModal isOpen={!!deleteConfirmation} title={deleteConfirmation?.force ? "Exclusão Forçada" : "Excluir Tarefa"} message={deleteConfirmation?.force ? "Esta tarefa possui horas. Excluir tudo?" : "Tem certeza?"} confirmText="Excluir" cancelText="Cancelar" onConfirm={performDelete} onCancel={() => setDeleteConfirmation(null)} />
      {showPrompt && <ConfirmationModal isOpen={true} title="Descartar alterações?" message="Você tem alterações não salvas." confirmText="Continuar editando" cancelText="Descartar" onConfirm={continueEditing} onCancel={() => { discardChanges(); navigate(-1); }} />}
      {task && isOwner && !isAdmin && (
        <TransferResponsibilityModal
          isOpen={transferModalOpen}
          currentOwner={{ id: currentUser?.id!, name: currentUser?.name! }}
          collaborators={(task.collaboratorIds || [])
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u)
            .map(u => ({ id: u.id, name: u.name }))}
          onConfirm={handleTransferResponsibility}
          onCancel={() => setTransferModalOpen(false)}
        />
      )}

      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsAddMemberOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center"><h4 className="text-[9px] font-black uppercase tracking-widest">Selecionar</h4><button onClick={() => setIsAddMemberOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button></div>
            <div className="p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
              {users.filter(u => u.active !== false && projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) && u.id !== formData.developerId && !formData.collaboratorIds?.includes(u.id)).map(u => (
                <button key={u.id} onClick={() => { markDirty(); const curr = formData.collaboratorIds || []; setFormData({ ...formData, collaboratorIds: [...curr, u.id] }); setIsAddMemberOpen(false); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-purple-500/10 transition-colors"><div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[8px] font-black">{u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.name[0]}</div><span className="text-[10px] font-bold">{u.name}</span></button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;

// ProjectDetailView.tsx - Dashboard Unificado do Projeto
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import {
  ArrowLeft, Plus, Edit, CheckSquare, Clock, Filter, ChevronDown, Check,
  Trash2, LayoutGrid, Target, ShieldAlert, Link as LinkIcon, Users,
  Calendar, Info, Zap, RefreshCw, AlertTriangle, StickyNote, DollarSign,
  TrendingUp, BarChart2, Save, FileText, Settings, Shield
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    tasks, clients, projects, users, projectMembers, timesheetEntries,
    deleteProject, deleteTask, updateProject, getProjectMembers,
    addProjectMember, removeProjectMember
  } = useDataController();

  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'tasks' | 'technical'>('technical');
  const [isEditing, setIsEditing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'task' } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    partnerId: '',
    status: 'Planejamento',
    description: '',
    managerClient: '',
    responsibleNicLabsId: '',
    startDate: '',
    estimatedDelivery: '',
    startDateReal: '',
    endDateReal: '',
    criticalDate: '',
    docLink: '',
    gapsIssues: '',
    importantConsiderations: '',
    weeklyStatusReport: '',
    valor_total_rs: 0,
    horas_vendidas: 0,
    complexidade: 'Média' as 'Alta' | 'Média' | 'Baixa'
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        clientId: project.clientId || '',
        partnerId: project.partnerId || '',
        status: project.status || 'Planejamento',
        description: project.description || '',
        managerClient: project.managerClient || '',
        responsibleNicLabsId: project.responsibleNicLabsId || '',
        startDate: project.startDate || '',
        estimatedDelivery: project.estimatedDelivery || '',
        startDateReal: project.startDateReal || '',
        endDateReal: project.endDateReal || '',
        criticalDate: project.criticalDate || '',
        docLink: project.docLink || '',
        gapsIssues: (project as any).gapsIssues || (project as any).gaps_issues || '',
        importantConsiderations: (project as any).importantConsiderations || (project as any).important_considerations || '',
        weeklyStatusReport: (project as any).weeklyStatusReport || (project as any).weekly_status_report || '',
        valor_total_rs: (project as any).valor_total_rs || 0,
        horas_vendidas: (project as any).horas_vendidas || 0,
        complexidade: (project as any).complexidade || 'Média'
      });
      const members = getProjectMembers(project.id);
      setSelectedUsers(members);
    }
  }, [project, projectId]);

  const handleSaveProject = async () => {
    if (!project || !projectId) return;
    setLoading(true);
    try {
      await updateProject(projectId, { ...formData, active: true } as any);
      const initialMembers = getProjectMembers(projectId);
      const currentMembersSet = new Set(initialMembers);
      const newMembersSet = new Set(selectedUsers);
      const toAdd = selectedUsers.filter(uid => !currentMembersSet.has(uid));
      for (const userId of toAdd) await addProjectMember(projectId, userId);
      const toRemove = initialMembers.filter(uid => !newMembersSet.has(uid));
      for (const userId of toRemove) await removeProjectMember(projectId, userId);
      setIsEditing(false);
      alert('Projeto atualizado!');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const projectTasks = useMemo(() => {
    const pTasks = tasks.filter(t => t.projectId === projectId);
    if (currentUser && !isAdmin) {
      return pTasks.filter(t => t.developerId === currentUser.id || (t.collaboratorIds && t.collaboratorIds.includes(currentUser.id)));
    }
    return pTasks;
  }, [tasks, projectId, currentUser, isAdmin]);

  const filteredTasks = useMemo(() => {
    let t = projectTasks;
    if (selectedStatus !== 'Todos') t = t.filter(task => task.status === selectedStatus);
    return t.sort((a, b) => (new Date(a.estimatedDelivery || '2099-12-31').getTime() - new Date(b.estimatedDelivery || '2099-12-31').getTime()));
  }, [projectTasks, selectedStatus]);

  const performance = useMemo(() => {
    if (!project) return null;
    const pTimesheets = timesheetEntries.filter(e => e.projectId === projectId);
    const committedCost = pTimesheets.reduce((acc, entry) => {
      const u = users.find(u => u.id === entry.userId);
      return acc + (entry.totalHours * (u?.hourlyCost || 0));
    }, 0);
    const totalEstimated = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const weightedProgress = totalEstimated > 0
      ? projectTasks.reduce((acc, t) => acc + ((t.progress || 0) * (t.estimatedHours || 0)), 0) / totalEstimated
      : (projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / (projectTasks.length || 1));

    let plannedProgress = 0;
    if (project.startDate && project.estimatedDelivery) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.estimatedDelivery).getTime();
      const now = Date.now();
      if (now > end) plannedProgress = 100;
      else if (now < start) plannedProgress = 0;
      else plannedProgress = ((now - start) / (end - start)) * 100;
    }
    return { committedCost, weightedProgress, totalEstimated, plannedProgress };
  }, [project, projectTasks, timesheetEntries, users, projectId]);

  if (!project) return <div className="p-20 text-center text-slate-400 font-bold">Projeto não encontrado</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* HEADER */}
      <div className="px-8 py-6 bg-gradient-to-r from-[#1e1b4b] to-[#4c1d95] shadow-lg flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
          <div className="flex items-center gap-4">
            {client?.logoUrl && <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-xl"><img src={client.logoUrl} className="w-full h-full object-contain" /></div>}
            <div>
              {isEditing ? (
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-white/10 border-b border-white outline-none px-2 py-1 text-xl font-bold rounded" />
              ) : (
                <h1 className="text-xl font-bold">{project.name}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-tighter">{project.status}</span>
                <span className="text-xs text-white/60">{client?.name}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-white/40">Progresso Real</p>
            <p className="text-2xl font-black">{Math.round(performance?.weightedProgress || 0)}%</p>
          </div>
          <button onClick={() => navigate(`/tasks/new?project=${projectId}`)} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-bold flex items-center gap-2 transition-all"><Plus size={18} /> Nova Tarefa</button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="space-y-8">
            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-8 bg-white rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Saúde do Projeto</h4>
                {(() => {
                  const delta = (performance?.weightedProgress || 0) - (performance?.plannedProgress || 0);
                  const health = delta >= -5 ? { label: 'Saudável', color: 'text-emerald-500', bg: 'bg-emerald-500' } :
                    delta >= -15 ? { label: 'Em Alerta', color: 'text-amber-500', bg: 'bg-amber-500' } :
                      { label: 'Crítico', color: 'text-red-500', bg: 'bg-red-500' };
                  return (
                    <div className="flex flex-col items-center justify-center py-1">
                      <div className={`w-3 h-3 rounded-full ${health.bg} animate-pulse shadow-[0_0_12px_rgba(0,0,0,0.1)] mb-2`} />
                      <span className={`text-xl font-black uppercase tracking-tighter ${health.color}`}>{health.label}</span>
                      <span className="text-[9px] text-slate-400 font-black mt-1 uppercase tracking-widest">Delta: {delta > 0 ? '+' : ''}{Math.round(delta)}%</span>
                    </div>
                  )
                })()}
              </div>
              <div className="p-8 bg-white rounded-[32px] border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progresso vs Plano</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1"><span>Real</span><span>{Math.round(performance?.weightedProgress || 0)}%</span></div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${performance?.weightedProgress || 0}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1"><span>Plano</span><span>{Math.round(performance?.plannedProgress || 0)}%</span></div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${performance?.plannedProgress || 0}%` }} /></div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-white rounded-[32px] border border-slate-200 shadow-sm relative">
                <div className="absolute top-4 right-6">
                  {isEditing ? (
                    <select
                      value={formData.complexidade}
                      onChange={e => setFormData({ ...formData, complexidade: e.target.value as any })}
                      className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-slate-100 text-slate-700 border-none outline-none"
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                    </select>
                  ) : (
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${project.complexidade === 'Alta' ? 'bg-red-100 text-red-600' : project.complexidade === 'Baixa' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      {project.complexidade || 'Média'}
                    </span>
                  )}
                </div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Finanças</h4>
                {isEditing ? (
                  <div className="space-y-3">
                    <input type="number" value={formData.valor_total_rs} onChange={e => setFormData({ ...formData, valor_total_rs: Number(e.target.value) })} className="text-xl font-black text-emerald-600 bg-emerald-50 w-full rounded p-1 outline-none" />
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Horas:</span>
                      <input type="number" value={formData.horas_vendidas} onChange={e => setFormData({ ...formData, horas_vendidas: Number(e.target.value) })} className="bg-slate-50 border-b border-slate-200 w-16 text-xs font-bold outline-none" />
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-emerald-600">{(project.valor_total_rs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <div className="flex justify-between mt-2">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Consumido: {performance?.committedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="p-8 bg-white rounded-[32px] border border-slate-200 shadow-sm relative">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Timeline</h4>
                {isEditing ? (
                  <div className="space-y-1">
                    <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="text-[10px] bg-slate-100 p-1 rounded w-full" />
                    <input type="date" value={formData.estimatedDelivery} onChange={e => setFormData({ ...formData, estimatedDelivery: e.target.value })} className="text-[10px] bg-blue-50 p-1 rounded w-full font-bold" />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-700">{project.estimatedDelivery ? new Date(project.estimatedDelivery).toLocaleDateString() : '?'}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Previsão de Entrega</span>
                  </div>
                )}
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-6 flex items-center gap-2"><Info size={16} /> Detalhes Estruturais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-50">
                    <div className="space-y-5">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cliente & Parceiro</p>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold">FINAL</p>
                            {isEditing ? (
                              <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} className="bg-slate-50 p-1 rounded text-[11px] font-bold border-b border-slate-200 outline-none">{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                            ) : <p className="text-xs font-bold text-slate-700">{clients.find(c => c.id === project.clientId)?.name || '--'}</p>}
                          </div>
                          <div className="w-px h-6 bg-slate-200" />
                          <div>
                            <p className="text-[8px] text-slate-400 font-bold">PARCEIRO</p>
                            {isEditing ? (
                              <select value={formData.partnerId} onChange={e => setFormData({ ...formData, partnerId: e.target.value })} className="bg-slate-50 p-1 rounded text-[11px] font-bold border-b border-slate-200 outline-none">
                                <option value="">Direto</option>
                                {clients.filter(c => c.tipo_cliente === 'parceiro').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : <p className="text-xs font-bold text-slate-700">{clients.find(c => c.id === project.partnerId)?.name || 'Nic-Labs'}</p>}
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Ponto Focal Nic-Labs</p>
                        {isEditing ? <select value={formData.responsibleNicLabsId} onChange={e => setFormData({ ...formData, responsibleNicLabsId: e.target.value })} className="w-full bg-slate-50 p-2 rounded text-xs">{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select> : <p className="text-sm font-bold">{users.find(u => u.id === project.responsibleNicLabsId)?.name || '--'}</p>}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Stakeholder Cliente</p>
                        {isEditing ? <input value={formData.managerClient} onChange={e => setFormData({ ...formData, managerClient: e.target.value })} className="w-full bg-slate-50 p-2 rounded text-xs" /> : <p className="text-sm font-bold">{project.managerClient || '--'}</p>}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Track record Real</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Início Real:</span>
                        {isEditing ? <input type="date" value={formData.startDateReal} onChange={e => setFormData({ ...formData, startDateReal: e.target.value })} className="bg-transparent border-b border-slate-300 outline-none text-right font-bold w-24" /> : <span className="font-bold">{project.startDateReal ? new Date(project.startDateReal).toLocaleDateString() : 'Awaiting...'}</span>}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Fim do Projeto:</span>
                        {isEditing ? <input type="date" value={formData.endDateReal} onChange={e => setFormData({ ...formData, endDateReal: e.target.value })} className="bg-transparent border-b border-slate-300 outline-none text-right font-bold w-24" /> : <span className="font-bold text-emerald-600">{project.endDateReal ? new Date(project.endDateReal).toLocaleDateString() : 'Ativo'}</span>}
                      </div>
                      <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between items-center">
                        <span className="text-red-500 font-black uppercase text-[9px]">Data Crítica:</span>
                        {isEditing ? <input type="date" value={formData.criticalDate} onChange={e => setFormData({ ...formData, criticalDate: e.target.value })} className="bg-white border border-red-100 rounded p-1 outline-none text-right font-bold text-red-600 w-24" /> : <span className="font-black text-red-600 underline text-xs">{project.criticalDate ? new Date(project.criticalDate).toLocaleDateString() : '--'}</span>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Visão de Escopo</p>
                    {isEditing ? <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full h-32 bg-slate-50 p-4 rounded-2xl border border-slate-200 focus:border-purple-300 outline-none text-sm" /> : <p className="text-sm text-slate-600 leading-relaxed italic bg-slate-50/50 p-5 rounded-2xl border border-slate-100">{project.description || 'Sem escopo detalhado.'}</p>}
                  </div>
                </div>

                {/* TASKS SECTION - Integrated below */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={18} className="text-emerald-500" /> Atividades em Andamento</h3>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{filteredTasks.length} TAREFAS</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTasks.map(task => (
                      <ProjectTaskCard key={task.id} task={task} users={users} timesheetEntries={timesheetEntries} onClick={() => navigate(`/tasks/${task.id}`)} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* SAÚDE QUALITATIVA */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><StickyNote size={16} className="text-amber-500" /> Saúde & Status</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status Report Semanal</p>
                      {isEditing ? (
                        <textarea value={formData.weeklyStatusReport} onChange={e => setFormData({ ...formData, weeklyStatusReport: e.target.value })} className="w-full h-20 bg-slate-50 p-2 rounded text-xs border border-slate-200" placeholder="O que aconteceu esta semana?" />
                      ) : <p className="text-xs text-slate-600 border-l-2 border-amber-300 pl-3 py-1 bg-slate-50 rounded-r-lg">{project.weeklyStatusReport || 'Sem reporte recente.'}</p>}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Gaps & Impedimentos</p>
                      {isEditing ? (
                        <textarea value={formData.gapsIssues} onChange={e => setFormData({ ...formData, gapsIssues: e.target.value })} className="w-full h-20 bg-slate-50 p-2 rounded text-xs border border-slate-200" placeholder="Ex: Acesso bloqueado, falta de doc..." />
                      ) : <p className="text-xs text-red-600 font-medium">{project.gapsIssues || 'Nenhum impedimento listado.'}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16} className="text-purple-500" /> Equipe Alocada</h3>
                  <div className="space-y-3">
                    {projectMembers.filter(pm => pm.projectId === projectId).map(pm => {
                      const u = users.find(user => user.id === pm.userId);
                      return u ? (
                        <div key={u.id} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                            {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-purple-600">{u.name.substring(0, 2).toUpperCase()}</div>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold truncate text-slate-700">{u.name}</p>
                            <p className="text-[8px] font-black text-purple-500 uppercase tracking-widest">{u.torre || 'Consultor'}</p>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><FileText size={16} /> Documentação</h3>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input value={formData.docLink} onChange={e => setFormData({ ...formData, docLink: e.target.value })} className="w-full text-[11px] p-2 bg-slate-100 rounded border border-slate-200 outline-none focus:border-blue-400" placeholder="Link do Sharepoint/OneDrive" />
                      <div className="p-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center hover:border-blue-300 transition-all cursor-pointer">
                        <Plus size={14} className="mx-auto text-slate-400 mb-1" />
                        <span className="text-[8px] font-black text-slate-400 uppercase">Anexar PDF</span>
                      </div>
                    </div>
                  ) : (
                    project.docLink ? (
                      <a href={project.docLink} target="_blank" className="flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-white hover:shadow-lg transition-all">
                        <span className="text-[10px] font-black uppercase">Doc. Principal</span>
                        <LinkIcon size={14} />
                      </a>
                    ) : <p className="text-[10px] text-slate-400 italic font-bold uppercase text-center py-2">Sem documentos.</p>
                  )}
                </div>

                {isEditing && (
                  <button onClick={() => setItemToDelete({ id: projectId, type: 'project' })} className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} className="inline mr-2" /> Deletar Projeto</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Confirmar Exclusão"
        message="Esta ação é definitiva. Deseja continuar?"
        onConfirm={async () => {
          if (itemToDelete?.type === 'project') {
            await deleteProject(itemToDelete.id);
            navigate(isAdmin ? '/admin/projects' : '/developer/projects');
          }
          setItemToDelete(null);
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

// SUBCOMPONENT
const ProjectTaskCard: React.FC<{ task: any, users: any[], timesheetEntries: any[], onClick: () => void }> = ({ task, users, timesheetEntries, onClick }) => {
  const dev = users.find(u => u.id === task.developerId);
  const actualHours = timesheetEntries.filter(e => e.taskId === task.id).reduce((sum, e) => sum + e.totalHours, 0);

  return (
    <motion.div whileHover={{ y: -4 }} onClick={onClick} className={`cursor-pointer bg-white p-6 rounded-[32px] border transition-all ${task.status === 'Done' ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-200 hover:border-purple-300 hover:shadow-xl'}`}>
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${task.status === 'Done' ? 'bg-emerald-100 text-emerald-700' : task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{task.status}</span>
        {task.priority === 'Critical' && <span className="text-[10px] font-bold text-red-500">CRITICAL</span>}
      </div>
      <h3 className="font-bold text-slate-800 text-lg leading-tight mb-6 line-clamp-2 min-h-[50px]">{task.title}</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1"><span>Progresso</span><span>{task.progress}%</span></div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-purple-600" style={{ width: `${task.progress}%` }} /></div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden">{dev?.avatarUrl ? <img src={dev.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-400">{task.developer?.substring(0, 2)}</div>}</div>
            <span className="text-[11px] font-bold text-slate-500 truncate max-w-[80px]">{task.developer || 'Sem resp.'}</span>
          </div>
          <p className="text-[10px] font-black text-slate-700">{actualHours}h <span className="text-slate-300 font-normal">/ {task.estimatedHours || 0}h</span></p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectDetailView;

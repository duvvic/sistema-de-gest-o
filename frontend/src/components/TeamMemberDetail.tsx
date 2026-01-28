// components/TeamMemberDetail.tsx - Reestruturado: Resumo Topo + Edição Principal
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Task, Role } from '@/types';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Briefcase, AlertCircle, Timer, Trash2, Palmtree, Save, User as UserIcon, Mail, Shield, Zap, Edit } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { getRoleDisplayName } from '@/utils/normalizers';
import { supabase } from '@/services/supabaseClient';

import TimesheetCalendar from './TimesheetCalendar';
import AbsenceManager from './AbsenceManager';

type ViewTab = 'details' | 'projects' | 'tasks' | 'delayed' | 'ponto' | 'absences';

const TeamMemberDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const { users, tasks, projects, projectMembers, timesheetEntries, deleteUser } = useDataController();

   const [activeTab, setActiveTab] = useState<ViewTab>('details');
   const [deleteModalOpen, setDeleteModalOpen] = useState(false);

   const user = users.find(u => u.id === userId);

   // --- FORM STATE (Trazido do UserForm) ---
   const [loading, setLoading] = useState(false);
   const [isManualCargo, setIsManualCargo] = useState(false);
   const [isManualLevel, setIsManualLevel] = useState(false);
   const [isManualTorre, setIsManualTorre] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState({
      name: '',
      email: '',
      cargo: '',
      nivel: '',
      role: 'developer' as Role,
      active: true,
      avatarUrl: '',
      torre: '',
      hourlyCost: 0,
      dailyAvailableHours: 8,
      monthlyAvailableHours: 160
   });

   useEffect(() => {
      if (user) {
         setFormData({
            name: user.name,
            email: user.email,
            cargo: user.cargo || '',
            nivel: user.nivel || '',
            role: user.role,
            active: user.active !== false,
            avatarUrl: user.avatarUrl || '',
            torre: user.torre || '',
            hourlyCost: user.hourlyCost || 0,
            dailyAvailableHours: user.dailyAvailableHours || 8,
            monthlyAvailableHours: user.monthlyAvailableHours || 160
         });
      }
   }, [user]);

   const existingCargos = useMemo(() => {
      const cargos = users.map(u => u.cargo).filter((c): c is string => !!c && c.trim() !== '');
      return Array.from(new Set(cargos)).sort();
   }, [users]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.email) {
         alert('Por favor, preencha nome e email.');
         return;
      }
      setLoading(true);
      try {
         const payload = {
            NomeColaborador: formData.name,
            email: formData.email,
            Cargo: formData.cargo,
            nivel: formData.nivel,
            role: formData.role.charAt(0).toUpperCase() + formData.role.slice(1),
            ativo: formData.active,
            avatar_url: formData.avatarUrl,
            torre: formData.torre,
            custo_hora: formData.hourlyCost,
            horas_disponiveis_dia: formData.dailyAvailableHours,
            horas_disponiveis_mes: formData.monthlyAvailableHours
         };

         const { error } = await supabase
            .from('dim_colaboradores')
            .update(payload)
            .eq('ID_Colaborador', userId);

         if (error) throw error;
         alert('Dados atualizados com sucesso!');
         setIsEditing(false); // Sai do modo de edição
      } catch (error: any) {
         console.error(error);
         alert('Erro ao salvar: ' + error.message);
      } finally {
         setLoading(false);
      }
   };

   // Helpers
   const getDelayDays = (task: Task) => (task.daysOverdue ?? 0);
   const getTaskPriority = (task: Task) => {
      const delay = getDelayDays(task);
      if (delay > 0) return 0;
      switch (task.status) {
         case 'In Progress': return 1;
         case 'Todo': return 2;
         case 'Review': return 3;
         case 'Done': return 4;
         default: return 5;
      }
   };

   // Cálculo de Dias de Ponto
   const missingPontoDays = useMemo(() => {
      if (!user) return 0;
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const userEntries = timesheetEntries.filter(e => e.userId === user.id);
      let missingCount = 0;
      const currentDate = new Date(firstDay);
      while (currentDate < today) {
         const dayOfWeek = currentDate.getDay();
         if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (!userEntries.some(e => e.date.startsWith(dateStr))) missingCount++;
         }
         currentDate.setDate(currentDate.getDate() + 1);
      }
      return missingCount;
   }, [user, timesheetEntries]);

   const handleDeleteUser = async () => {
      if (user && deleteUser) {
         await deleteUser(user.id);
         navigate('/admin/team');
      }
   };

   if (!user) return <div className="p-8">Colaborador não encontrado.</div>;

   // Logic vars
   let userTasks = tasks.filter(t => t.developerId === user.id || (t.collaboratorIds && t.collaboratorIds.includes(user.id)));
   const linkedProjectIds = projectMembers.filter(pm => pm.userId === user.id).map(pm => pm.projectId);
   const userProjects = projects.filter(p => linkedProjectIds.includes(p.id) && p.active !== false);
   const delayedTasks = userTasks.filter(t => getDelayDays(t) > 0 && t.status !== 'Review');
   const totalTasks = userTasks.length;
   userTasks = [...userTasks].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));

   return (
      <div className="h-full flex flex-col rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
         {/* HEADER */}
         <div className="px-8 py-6 border-b flex items-center justify-between gap-4 bg-gradient-to-r from-[#4c1d95] to-purple-600 sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-4">
               <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white shadow-lg overflow-hidden text-2xl font-bold text-white">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.substring(0, 2).toUpperCase()}
               </div>
               <div>
                  <h1 className="text-xl font-bold text-white">{user.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                     <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm border" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'rgba(255, 255, 255, 0.3)' }}>{getRoleDisplayName(user.role)}</span>
                     {user.cargo && <><span className="text-purple-200 opacity-50">•</span><p className="text-sm text-purple-100 font-medium">{user.cargo}</p></>}
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-7xl mx-auto space-y-8">

               {/* 1. CARDS DE RESUMO HORIZONTAL */}
               <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div onClick={() => setActiveTab('details')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${activeTab === 'details' ? 'ring-2 ring-slate-600 bg-slate-50' : 'hover:border-slate-300'} bg-white shadow-sm`}>
                     <div className="flex items-center gap-2 mb-2"><UserIcon className="w-4 h-4 text-slate-600" /><span className="text-xs font-bold text-slate-500 uppercase">Visão Geral</span></div>
                     <span className="text-xs font-bold text-slate-600">Dados & Info</span>
                  </div>
                  <div onClick={() => setActiveTab('projects')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${activeTab === 'projects' ? 'ring-2 ring-purple-600 bg-purple-50' : 'hover:border-purple-300'} bg-white shadow-sm`}>
                     <div className="flex items-center gap-2 mb-2"><Briefcase className="w-4 h-4 text-purple-600" /><span className="text-xs font-bold text-slate-500 uppercase">Projetos</span></div>
                     <span className="text-2xl font-black text-slate-800">{userProjects.length}</span>
                  </div>
                  <div onClick={() => setActiveTab('tasks')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${activeTab === 'tasks' ? 'ring-2 ring-blue-600 bg-blue-50' : 'hover:border-blue-300'} bg-white shadow-sm`}>
                     <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-blue-600" /><span className="text-xs font-bold text-slate-500 uppercase">Tarefas</span></div>
                     <span className="text-2xl font-black text-slate-800">{totalTasks}</span>
                  </div>
                  <div onClick={() => setActiveTab('delayed')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${activeTab === 'delayed' ? 'ring-2 ring-red-600 bg-red-50' : 'hover:border-red-300'} bg-white shadow-sm`}>
                     <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-xs font-bold text-slate-500 uppercase">Atrasos</span></div>
                     <span className="text-2xl font-black text-slate-800">{delayedTasks.length}</span>
                  </div>
                  <div onClick={() => setActiveTab('ponto')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${activeTab === 'ponto' ? 'ring-2 ring-orange-600 bg-orange-50' : 'hover:border-orange-300'} bg-white shadow-sm`}>
                     <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-orange-600" /><span className="text-xs font-bold text-slate-500 uppercase">Ponto</span></div>
                     <span className="text-2xl font-black text-slate-800">{missingPontoDays}</span>
                  </div>
                  <div onClick={() => setActiveTab('absences')} className={`cursor-pointer p-4 rounded-2xl border transition-all ${activeTab === 'absences' ? 'ring-2 ring-emerald-600 bg-emerald-50' : 'hover:border-emerald-300'} bg-white shadow-sm`}>
                     <div className="flex items-center gap-2 mb-2"><Palmtree className="w-4 h-4 text-emerald-600" /><span className="text-xs font-bold text-slate-500 uppercase">Ausências</span></div>
                     <span className="text-xs font-bold text-emerald-600">Gerenciar</span>
                  </div>
               </div>

               {/* 2. TAB CONTENT AREA */}
               {activeTab === 'details' && (
                  <div className="max-w-4xl mx-auto">
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                              <UserIcon className="w-6 h-6 text-purple-600" />
                              Dados do Colaborador
                           </h3>
                           <button
                              onClick={() => setIsEditing(!isEditing)}
                              className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${isEditing ? 'bg-slate-100 text-slate-600' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'}`}
                           >
                              {isEditing ? 'Cancelar Edição' : <> <Edit className="w-4 h-4" /> Editar Informações </>}
                           </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8">
                           <fieldset disabled={!isEditing} className="group-disabled:opacity-100 disabled:opacity-100 space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Completo</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" required />
                                 </div>

                                 <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" required />
                                 </div>

                                 <div>
                                    <div className="flex justify-between mb-2">
                                       <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">Cargo</label>
                                       {isEditing && <button type="button" onClick={() => setIsManualCargo(!isManualCargo)} className="text-xs font-bold text-purple-600 hover:text-purple-800">{isManualCargo ? 'Selecionar Lista' : '+ Novo'}</button>}
                                    </div>
                                    {isManualCargo ?
                                       <input type="text" value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" /> :
                                       <select value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg disabled:appearance-none">
                                          <option value="" disabled>Selecione...</option>
                                          {existingCargos.map(c => <option key={c} value={c}>{c}</option>)}
                                       </select>
                                    }
                                 </div>

                                 <div>
                                    <div className="flex justify-between mb-2">
                                       <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">Nível</label>
                                       {isEditing && <button type="button" onClick={() => setIsManualLevel(!isManualLevel)} className="text-xs font-bold text-purple-600 hover:text-purple-800">{isManualLevel ? 'Selecionar Lista' : '+ Novo'}</button>}
                                    </div>
                                    {isManualLevel ?
                                       <input type="text" value={formData.nivel} onChange={(e) => setFormData({ ...formData, nivel: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" /> :
                                       <select value={formData.nivel} onChange={(e) => setFormData({ ...formData, nivel: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg disabled:appearance-none">
                                          <option value="" disabled>Selecione...</option>
                                          {['Estagiário', 'Trainee', 'Júnior', 'Pleno', 'Sênior', 'Especialista'].map(l => <option key={l} value={l}>{l}</option>)}
                                       </select>
                                    }
                                 </div>

                                 <div>
                                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Permissão</label>
                                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg disabled:appearance-none">
                                       <option value="developer">Desenvolvedor</option>
                                       <option value="tech_lead">Tech Lead</option>
                                       <option value="pmo">PMO</option>
                                       <option value="executive">Diretoria</option>
                                       <option value="system_admin">Admin Sistema</option>
                                       <option value="ceo">CEO</option>
                                    </select>
                                 </div>

                                 <div>
                                    <div className="flex justify-between mb-2">
                                       <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">Torre / Especialidade</label>
                                       {isEditing && <button type="button" onClick={() => setIsManualTorre(!isManualTorre)} className="text-xs font-bold text-purple-600 hover:text-purple-800">{isManualTorre ? 'Selecionar Lista' : '+ Novo'}</button>}
                                    </div>
                                    {isManualTorre ?
                                       <input type="text" value={formData.torre} onChange={(e) => setFormData({ ...formData, torre: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" placeholder="Nova Torre..." /> :
                                       <select value={formData.torre} onChange={(e) => setFormData({ ...formData, torre: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg disabled:appearance-none">
                                          <option value="">Selecione...</option>
                                          <option value="ABAP">ABAP</option>
                                          <option value="Fiori">Fiori</option>
                                          <option value="FullStack">FullStack</option>
                                          {/* Add others as needed */}
                                       </select>
                                    }
                                 </div>
                              </div>

                              <div className="border-t border-slate-100 pt-8 mt-4">
                                 <h4 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><Shield className="w-4 h-4" /> Controle Administrativo</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div>
                                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Custo Hora (R$)</label>
                                       <input type="number" step="0.01" value={formData.hourlyCost} onChange={(e) => setFormData({ ...formData, hourlyCost: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-lg text-lg text-slate-800 font-bold disabled:bg-transparent disabled:px-0" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Horas/Dia</label>
                                       <input type="number" value={formData.dailyAvailableHours} onChange={(e) => setFormData({ ...formData, dailyAvailableHours: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-lg text-lg text-slate-800 font-bold disabled:bg-transparent disabled:px-0" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Horas/Mês</label>
                                       <input type="number" value={formData.monthlyAvailableHours} onChange={(e) => setFormData({ ...formData, monthlyAvailableHours: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-lg text-lg text-slate-800 font-bold disabled:bg-transparent disabled:px-0" />
                                    </div>
                                 </div>
                              </div>

                              <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
                                 <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors">
                                    <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="w-5 h-5 rounded text-purple-600 focus:ring-purple-600 border-slate-300" disabled={!isEditing} />
                                    <span className={`text-sm font-bold ${formData.active ? 'text-emerald-600' : 'text-slate-400'}`}>Colaborador Ativo no Sistema</span>
                                 </label>

                                 {isEditing && (
                                    <div className="flex items-center gap-4">
                                       <button type="button" onClick={() => setDeleteModalOpen(true)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors">Excluir</button>
                                       <button type="submit" className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                                          <Save className="w-4 h-4" /> Salvar Alterações
                                       </button>
                                    </div>
                                 )}
                              </div>
                           </fieldset>
                        </form>
                     </div>
                  </div>
               )}

               {activeTab === 'projects' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {userProjects.map(p => (
                        <div onClick={() => navigate(`/admin/projects/${p.id}`)} key={p.id} className="cursor-pointer bg-[var(--surface)] p-5 rounded-2xl border border-[var(--border)] hover:border-purple-500 hover:shadow-md transition-all">
                           <h4 className="font-bold text-[var(--textTitle)] mb-1">{p.name}</h4>
                           <span className="text-xs px-2 py-0.5 rounded bg-[var(--bgApp)] uppercase font-bold text-[var(--textMuted)]">{p.status}</span>
                        </div>
                     ))}
                     {userProjects.length === 0 && <p className="col-span-3 text-center text-slate-400 py-10 border-2 border-dashed rounded-2xl">Sem projetos vinculados.</p>}
                  </div>
               )}

               {activeTab === 'tasks' && (
                  <div className="space-y-3">
                     {userTasks.map(t => (
                        <div onClick={() => navigate(`/tasks/${t.id}`)} key={t.id} className="cursor-pointer bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)] hover:border-purple-500 flex justify-between items-center transition-all">
                           <div>
                              <p className="font-semibold text-[var(--textTitle)]">{t.title}</p>
                              <span className="text-xs text-[var(--textMuted)]">{t.status} • {t.estimatedDelivery || 'Sem data'}</span>
                           </div>
                           <span className="font-bold text-purple-600">{t.progress}%</span>
                        </div>
                     ))}
                     {userTasks.length === 0 && <p className="text-center text-slate-400 py-10 border-2 border-dashed rounded-2xl">Sem tarefas.</p>}
                  </div>
               )}

               {activeTab === 'delayed' && (
                  <div className="space-y-3">
                     {delayedTasks.map(t => (
                        <div onClick={() => navigate(`/tasks/${t.id}`)} key={t.id} className="cursor-pointer bg-red-50 border border-red-100 p-4 rounded-xl hover:border-red-300 flex justify-between items-center transition-all">
                           <div>
                              <p className="font-semibold text-red-900">{t.title}</p>
                              <span className="text-xs text-red-700">Atraso de {getDelayDays(t)} dias</span>
                           </div>
                        </div>
                     ))}
                     {delayedTasks.length === 0 && <p className="text-center text-emerald-600 py-10 bg-emerald-50 rounded-2xl border border-emerald-100 font-bold">Nenhuma tarefa atrasada! 🎉</p>}
                  </div>
               )}

               {activeTab === 'ponto' && <TimesheetCalendar userId={user.id} embedded={true} />}
               {activeTab === 'absences' && <AbsenceManager targetUserId={user.id} targetUserName={user.name} />}

            </div>
         </div>

         <ConfirmationModal
            isOpen={deleteModalOpen}
            title="Excluir Colaborador"
            message={`Tem certeza que deseja remover "${user.name}"?`}
            onConfirm={handleDeleteUser}
            onCancel={() => setDeleteModalOpen(false)}
         />
      </div>
   );
};

export default TeamMemberDetail;

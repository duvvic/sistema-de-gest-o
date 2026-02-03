// components/TeamMemberDetail.tsx - Reestruturado: Resumo Topo + Edição Principal
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Task, Role } from '@/types';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Briefcase, AlertCircle, Timer, Trash2, Palmtree, Save, User as UserIcon, Mail, Shield, Zap, Edit, Calculator } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { getRoleDisplayName } from '@/utils/normalizers';
import { supabase } from '@/services/supabaseClient';

import TimesheetCalendar from './TimesheetCalendar';
import AbsenceManager from './AbsenceManager';

type ViewTab = 'details' | 'projects' | 'tasks' | 'delayed' | 'ponto' | 'absences';

const TeamMemberDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const { users, tasks, projects, projectMembers, timesheetEntries, deleteUser, absences } = useDataController();

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
            torre: user.torre || (['desenvolvedor', 'infraestrutura de ti', 'ceo'].includes((user.cargo || '').toLowerCase()) ? '' : 'N/A'),
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
            role: formData.role, // Mantém lowercase conforme definido nos tipos
            ativo: formData.active,
            avatar_url: formData.avatarUrl,
            torre: formData.torre,
            custo_hora: Number(String(formData.hourlyCost).replace(',', '.')),
            horas_disponiveis_dia: Number(String(formData.dailyAvailableHours).replace(',', '.')),
            horas_disponiveis_mes: Number(String(formData.monthlyAvailableHours).replace(',', '.'))
         };

         const { error } = await supabase
            .from('dim_colaboradores')
            .update(payload)
            .eq('ID_Colaborador', Number(userId));

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

   // Helper de Feriados (Espelhado do TimesheetCalendar)
   const getHoliday = (d: number, m: number, y: number) => {
      const dates: { [key: string]: boolean } = {
         "1-0": true, "21-3": true, "1-4": true, "7-8": true, "12-9": true, "2-10": true, "15-10": true, "20-10": true, "25-11": true
      };
      if (y === 2026) {
         if (d === 3 && m === 3) return true; // Sexta-feira Santa
         if (d === 5 && m === 3) return true; // Páscoa
         if (d === 4 && m === 5) return true; // Corpus Christi
      }
      return dates[`${d}-${m}`];
   };

   const currentWorkingDays = useMemo(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let count = 0;

      for (let i = 1; i <= daysInMonth; i++) {
         const date = new Date(year, month, i);
         const day = date.getDay();
         const isWeekend = day === 0 || day === 6;
         const isHoliday = getHoliday(i, month, year);

         const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
         const isAbsent = user ? absences.some(a => a.userId === user.id && dateStr >= a.startDate && dateStr <= a.endDate && a.status === 'aprovada_gestao') : false;

         if (!isWeekend && !isHoliday && !isAbsent) count++;
      }
      return count;
   }, [user, absences]);

   // Helper paraInputs Numéricos (permite digitação livre de , e .)
   const handleNumberChange = (field: keyof typeof formData, value: string) => {
      // Permite apenas números, ponto e vírgula
      const cleanValue = value.replace(/[^0-9.,]/g, '');

      setFormData(prev => {
         const newData = { ...prev, [field]: cleanValue };

         // Se alterou a jornada diária, recalcula a mensal automaticamente
         if (field === 'dailyAvailableHours') {
            const dailyVal = cleanValue.replace(',', '.');
            const daily = parseFloat(dailyVal) || 0;
            // Usa o currentWorkingDays calculado com feriados/ausências
            newData.monthlyAvailableHours = Number((currentWorkingDays * daily).toFixed(2));
         }

         return newData;
      });
   };

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
         <div className="px-8 py-6 border-b flex items-center justify-between gap-4 bg-slate-900 sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
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
                     <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm border bg-white/10 text-white border-white/20">{getRoleDisplayName(user.role)}</span>
                     {user.cargo && <><span className="text-white/20">•</span><p className="text-sm text-white/70 font-medium">{user.cargo}</p></>}
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <div className="max-w-7xl mx-auto space-y-8">

               {/* NAVEGAÇÃO DE SUB-MENUS (VERSÃO COMPACTA & FUNCIONAL) */}
               <div className="flex bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)] w-fit mx-auto mb-6">
                  <button
                     onClick={() => setActiveTab('details')}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'details' ? 'bg-slate-800 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                        }`}
                  >
                     Geral
                  </button>

                  <button
                     onClick={() => setActiveTab('projects')}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'projects' ? 'bg-slate-800 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                        }`}
                  >
                     Projetos {userProjects.length > 0 && <span className="ml-1 opacity-60">({userProjects.length})</span>}
                  </button>

                  <button
                     onClick={() => setActiveTab('tasks')}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'tasks' ? 'bg-slate-800 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                        }`}
                  >
                     Tarefas {totalTasks > 0 && <span className="ml-1 opacity-60">({totalTasks})</span>}
                  </button>

                  <button
                     onClick={() => setActiveTab('delayed')}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'delayed' ? 'bg-red-800 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                        }`}
                  >
                     Atrasos {delayedTasks.length > 0 && <span className="ml-1 opacity-60">({delayedTasks.length})</span>}
                  </button>

                  <button
                     onClick={() => setActiveTab('ponto')}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'ponto' ? 'bg-slate-800 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                        }`}
                  >
                     Ponto
                  </button>

                  <button
                     onClick={() => setActiveTab('absences')}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'absences' ? 'bg-slate-800 text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                        }`}
                  >
                     Ausências
                  </button>
               </div>

               {/* 2. TAB CONTENT AREA */}
               {activeTab === 'details' && (
                  <div className="max-w-4xl mx-auto">
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center justify-between mb-8">
                           <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                              <UserIcon className="w-6 h-6 text-slate-600" />
                              Dados do Colaborador
                           </h3>
                           <button
                              onClick={() => setIsEditing(!isEditing)}
                              className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm ${isEditing ? 'bg-slate-100 text-slate-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                           >
                              {isEditing ? 'Sair' : <> <Edit className="w-4 h-4" /> Editar </>}
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
                                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Custo Hora (R$) (Interno)</label>
                                       <input type="text" value={formData.hourlyCost || ''} onChange={(e) => handleNumberChange('hourlyCost', e.target.value)} placeholder="0,00" className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-lg text-lg text-slate-800 font-bold disabled:bg-transparent disabled:px-0" />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Jornada Diária (Meta)</label>
                                       <input type="text" value={formData.dailyAvailableHours || ''} onChange={(e) => handleNumberChange('dailyAvailableHours', e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-lg text-lg text-slate-800 font-bold disabled:bg-transparent disabled:px-0" />
                                    </div>
                                    <div>
                                       <div className="flex justify-between items-center mb-2">
                                          <label className="block text-xs font-bold text-slate-400 uppercase">Meta Mensal (Horas)</label>
                                          <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 uppercase tracking-wide">
                                             Mês Atual: {currentWorkingDays} Dias Úteis
                                          </span>
                                       </div>
                                       <input type="text" value={formData.monthlyAvailableHours || ''} onChange={(e) => handleNumberChange('monthlyAvailableHours', e.target.value)} placeholder="0" className="w-full px-3 py-2 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-lg text-lg text-slate-800 font-bold disabled:bg-transparent disabled:px-0" />
                                    </div>
                                 </div>
                              </div>

                              <div className="border-t border-slate-100 pt-6 flex flex-col gap-6">
                                 {/* Controle de Fluxo / Monitoramento */}
                                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <label className="flex items-center gap-4 cursor-pointer">
                                       <div className="relative">
                                          <input
                                             type="checkbox"
                                             checked={formData.torre !== 'N/A'}
                                             onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                setFormData({
                                                   ...formData,
                                                   torre: isChecked ? (users.find(u => u.id === userId)?.torre || 'Desenvolvimento') : 'N/A'
                                                });
                                             }}
                                             className="sr-only peer"
                                             disabled={!isEditing}
                                          />
                                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                       </div>
                                       <div className="flex-1">
                                          <span className="block text-sm font-bold text-slate-700">Participa do Fluxo (Monitoramento)</span>
                                          <span className="text-xs text-slate-500">Se desmarcado, o colaborador será classificado como <strong className="text-slate-700">N/A</strong> e ocultado das atividades e métricas, mas manterá acesso ao sistema.</span>
                                       </div>
                                    </label>
                                 </div>

                                 {/* Controle de Acesso / Desligamento */}
                                 <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                       <div className={`w-3 h-3 rounded-full animate-pulse ${formData.active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                       <div className="flex flex-col">
                                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Status da Conta</span>
                                          <span className={`text-sm font-bold ${formData.active ? 'text-emerald-600' : 'text-red-600'}`}>
                                             {formData.active ? 'ATIVO (ACESSO PERMITIDO)' : 'DESLIGADO (ACESSO BLOQUEADO)'}
                                          </span>
                                       </div>
                                    </div>

                                    {isEditing && (
                                       <button
                                          type="button"
                                          onClick={() => {
                                             if (window.confirm(formData.active ? 'Tem certeza que deseja REALIZAR O DESLIGAMENTO deste colaborador? O acesso ao sistema será bloqueado.' : 'Deseja REATIVAR a conta deste colaborador?')) {
                                                setFormData({ ...formData, active: !formData.active });
                                             }
                                          }}
                                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-all border ${formData.active
                                             ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                                             : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                                             }`}
                                       >
                                          {formData.active ? 'Realizar Desligamento' : 'Reativar Acesso'}
                                       </button>
                                    )}
                                 </div>
                              </div>

                              {isEditing && (
                                 <div className="flex items-center gap-4 border-t border-slate-100 pt-6">
                                    <button type="button" onClick={() => setDeleteModalOpen(true)} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm transition-colors">Excluir</button>
                                    <button type="submit" className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                                       <Save className="w-4 h-4" /> Salvar Alterações
                                    </button>
                                 </div>
                              )}

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
      </div >
   );
};

export default TeamMemberDetail;

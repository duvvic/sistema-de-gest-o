import React, { useState, useEffect, useCallback } from 'react';
import { TimesheetEntry, Client, Project, Task, User } from '../types';
import { ArrowLeft, Save, Clock, Trash2, User as UserIcon, Briefcase, CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useUnsavedChangesPrompt } from '../hooks/useUnsavedChangesPrompt';

interface TimesheetFormProps {
  initialEntry?: TimesheetEntry | null; // Null if creating
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  user: User;
  preSelectedDate?: string;
  onSave: (entry: TimesheetEntry) => void;
  onDelete?: (entryId: string) => void;
  onBack: () => void;
  onUpdateTaskProgress?: (taskId: string, progress: number) => void;
}

const TimesheetForm: React.FC<TimesheetFormProps> = ({ 
  initialEntry, 
  clients, 
  projects, 
  tasks, 
  user, 
  preSelectedDate,
  onSave, 
  onDelete,
  onBack,
  onUpdateTaskProgress
}) => {
  const isAdmin = user.role === 'admin';
  const isEditing = !!initialEntry;

  const [formData, setFormData] = useState<Partial<TimesheetEntry>>({
    clientId: '',
    projectId: '',
    taskId: '',
    date: preSelectedDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    description: '',
    userId: user.id,
    userName: user.name
  });

  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [deductLunch, setDeductLunch] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<TimesheetEntry | null>(null);
  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

  useEffect(() => {
    if (initialEntry) {
      setFormData(initialEntry);
    }
  }, [initialEntry]);

  // Atualiza progresso quando tarefa é selecionada
  useEffect(() => {
    if (formData.taskId) {
      const selectedTask = tasks.find(t => t.id === formData.taskId);
      if (selectedTask) {
        setTaskProgress(selectedTask.progress || 0);
      }
    }
  }, [formData.taskId, tasks]);

  // Calculations
  const calculateTotalHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight if needed
    
    return Number((diffMinutes / 60).toFixed(2));
  };

  const calculateTimeDisplay = (start: string, end: string, deductLunch: boolean = false) => {
    if (!start || !end) return '0h 0min';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    
    // Desconta 1h (60 minutos) se a opção estiver marcada
    if (deductLunch) {
      diffMinutes = Math.max(0, diffMinutes - 60);
    }
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    return minutes > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${hours}h`;
  };

  const totalHours = calculateTotalHours(formData.startTime || '00:00', formData.endTime || '00:00');
  const adjustedTotalHours = deductLunch ? Math.max(0, totalHours - 1) : totalHours;
  const timeDisplay = calculateTimeDisplay(formData.startTime || '00:00', formData.endTime || '00:00', deductLunch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.projectId || !formData.taskId || !formData.date || !formData.startTime || !formData.endTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const selectedTask = tasks.find(t => t.id === formData.taskId);
    const isTaskCurrentlyDone = selectedTask?.status === 'Done' || selectedTask?.actualDelivery != null;
    const willBeCompleted = !isTaskCurrentlyDone && taskProgress === 100;

    const entry: TimesheetEntry = {
      id: initialEntry?.id || crypto.randomUUID(),
      userId: formData.userId || user.id,
      userName: formData.userName || user.name,
      clientId: formData.clientId!,
      projectId: formData.projectId!,
      taskId: formData.taskId!,
      date: formData.date!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      totalHours: adjustedTotalHours,
      description: formData.description,
    };

    // Se a tarefa vai ser concluída, mostra modal de confirmação
    if (willBeCompleted) {

      setPendingSave(entry);
      setCompletionModalOpen(true);


      return;
    }

    // Atualiza progresso da tarefa se não estiver concluída
    if (selectedTask && !isTaskCurrentlyDone && onUpdateTaskProgress) {

      onUpdateTaskProgress(formData.taskId!, taskProgress);
    }

    onSave(entry);
    if (isDirty) discardChanges();
  };

  const handleConfirmCompletion = async () => {

    if (!pendingSave) {

      return;
    }

    // Atualiza progresso para 100% e status para Done
    if (onUpdateTaskProgress && formData.taskId) {

      await onUpdateTaskProgress(formData.taskId, 100);
    }

    onSave(pendingSave);
    if (isDirty) discardChanges();
    setCompletionModalOpen(false);
    setPendingSave(null);
  };

  const handleBack = useCallback(() => {
    const canGoBack = requestBack();
    if (canGoBack) onBack();
  }, [requestBack, onBack]);

  // Filter Logic
  const filteredProjects = projects.filter(p => !formData.clientId || p.clientId === formData.clientId);
  const filteredTasks = tasks.filter(t => !formData.projectId || t.projectId === formData.projectId);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
       {/* Header */}
       <div className="px-8 py-6 bg-gradient-to-r from-[#4c1d95] to-[#5d2aa8] border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? '✏️ Editar Apontamento' : '➕ Novo Apontamento de Horas'}
            </h1>
            <p className="text-sm text-purple-100">Registre suas atividades e horas trabalhadas com precisão</p>
          </div>
        </div>
        <div className="flex gap-2">
           {isEditing && onDelete && (
             <button 
               onClick={() => setDeleteModalOpen(true)}
               className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
             >
               <Trash2 className="w-4 h-4" />
               Excluir
             </button>
           )}
           <button 
             onClick={handleSubmit} 
             className="bg-white hover:bg-slate-100 text-[#4c1d95] px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-bold hover:shadow-lg"
           >
             <Save className="w-4 h-4" />
             Salvar Apontamento
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Context Card */}
            <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-shadow space-y-6">
               <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <UserIcon className="w-6 h-6 text-[#4c1d95]" />
                  <h2 className="font-bold text-lg text-slate-800">Informações do Projeto</h2>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                     <div className="w-5 h-5 flex items-center justify-center bg-[#4c1d95] text-white rounded text-xs font-bold">1</div>
                     Colaborador
                  </label>
                  <input 
                     type="text" 
                     value={formData.userName} 
                     disabled={!isAdmin}
                     className="w-full p-3 bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl text-slate-600 cursor-not-allowed font-medium"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                       <Briefcase className="w-4 h-4 text-[#4c1d95]" />
                       Cliente
                    </label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => { markDirty(); setFormData({...formData, clientId: e.target.value, projectId: '', taskId: ''}); }}
                      className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] outline-none font-medium hover:border-[#4c1d95] transition-colors"
                    >
                       <option value="">👉 Selecione um cliente...</option>
                       {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                       <Briefcase className="w-4 h-4 text-[#4c1d95]" />
                       Projeto
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => { markDirty(); setFormData({...formData, projectId: e.target.value, taskId: ''}); }}
                      className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] outline-none font-medium hover:border-[#4c1d95] transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300"
                      disabled={!formData.clientId}
                    >
                       <option value="">👉 Selecione um projeto...</option>
                       {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                     <CheckSquare className="w-4 h-4 text-[#4c1d95]" />
                     Tarefa
                  </label>
                  <select
                    value={formData.taskId}
                    onChange={(e) => { markDirty(); setFormData({...formData, taskId: e.target.value}); }}
                    className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] outline-none font-medium hover:border-[#4c1d95] transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-300"
                    disabled={!formData.projectId}
                  >
                      <option value="">👉 Selecione a tarefa...</option>
                      {filteredTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
               </div>
            </div>

            {/* Time Card - Seção fixa consolidada */}
            <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-shadow space-y-6">
               <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <Clock className="w-6 h-6 text-blue-500" />
                  <h3 className="font-bold text-lg text-slate-800">Horário e Data</h3>
               </div>
               
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-blue-500" />
                     Data do Apontamento
                  </label>
                  <input 
                     type="date" 
                     value={formData.date}
                     onChange={(e) => { markDirty(); setFormData({...formData, date: e.target.value}); }}
                     className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium hover:border-blue-500 transition-colors"
                  />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        Hora de Início
                     </label>
                     <input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => { markDirty(); setFormData({...formData, startTime: e.target.value}); }}
                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none font-medium hover:border-green-500 transition-colors"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-red-500" />
                        Hora de Fim
                     </label>
                     <input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => { markDirty(); setFormData({...formData, endTime: e.target.value}); }}
                        className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-medium hover:border-red-500 transition-colors"
                     />
                  </div>
               </div>

               <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-xl border-2 border-amber-200">
                  <input 
                     type="checkbox" 
                     id="deductLunch"
                     checked={deductLunch}
                     onChange={(e) => setDeductLunch(e.target.checked)}
                     className="w-5 h-5 text-[#4c1d95] border-2 border-slate-300 rounded focus:ring-2 focus:ring-[#4c1d95] cursor-pointer"
                  />
                  <label htmlFor="deductLunch" className="font-semibold text-slate-700 cursor-pointer select-none">
                     🍽️ Descontar 1h de almoço
                  </label>
               </div>

               <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-2">
                     <Clock className="w-5 h-5 text-[#4c1d95]" />
                     <span className="font-bold text-slate-700">Total Calculado:</span>
                  </div>
                  <span className="text-3xl font-black text-[#4c1d95] drop-shadow-sm">{timeDisplay}</span>
               </div>

               {/* Campo de Progresso - integrado na seção Horário e Data */}
               {(() => {
                 const selectedTask = tasks.find(t => t.id === formData.taskId);
                 const isTaskDone = selectedTask?.status === 'Done' || selectedTask?.actualDelivery != null;
                 return formData.taskId && !isTaskDone ? (
                   <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200">
                     <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                       <span className="flex items-center gap-2">
                         <CheckSquare className="w-4 h-4 text-purple-600" />
                         Progresso da Tarefa
                       </span>
                       <span className="text-2xl font-black text-purple-600">{taskProgress}%</span>
                     </label>
                     <input 
                       type="range" 
                       min="0" 
                       max="100" 
                       value={taskProgress}
                       onChange={(e) => { 
                         markDirty(); 
                         const newProgress = Number(e.target.value);
                         setTaskProgress(newProgress);
                       }}
                       className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                     />
                     <p className="text-xs text-slate-600 mt-2">
                       {taskProgress === 100 
                         ? '🎉 Tarefa será marcada como concluída ao salvar!' 
                         : '💡 Atualize o progresso da tarefa após este apontamento'}
                     </p>
                   </div>
                 ) : null;
               })()}
            </div>

            {/* Notes Card */}
            <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-shadow space-y-4">
               <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  <h3 className="font-bold text-lg text-slate-800">Notas e Observações</h3>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Descrição (Opcional)</label>
                  <textarea 
                     rows={4}
                     value={formData.description || ''}
                     onChange={(e) => { markDirty(); setFormData({...formData, description: e.target.value}); }}
                     className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none font-medium hover:border-slate-300 transition-colors"
                     placeholder="💡 Descreva o que foi feito neste período, atividades, reuniões, etc..."
                  />
               </div>
            </div>
         </div>
      </div>

      <ConfirmationModal 
        isOpen={completionModalOpen}
        title="🎉 Parabéns! Tarefa Concluída"
        message="A tarefa atingiu 100% de progresso e será marcada como Concluída. Após salvar, a tarefa será armazenada e não poderá ser mais editada. Deseja continuar?"
        onConfirm={handleConfirmCompletion}
        onCancel={() => {
          setCompletionModalOpen(false);
          setPendingSave(null);
        }}
      />

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        title="Excluir Apontamento"
        message="Tem certeza que deseja remover este apontamento de horas? O total será recalculado."
        onConfirm={() => {
          if (initialEntry && onDelete) onDelete(initialEntry.id);
          setDeleteModalOpen(false);
        }}
        onCancel={() => setDeleteModalOpen(false)}
      />
      {showPrompt && (
        <ConfirmationModal
          isOpen={true}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Deseja continuar editando ou descartar?"
          onConfirm={continueEditing}
          onCancel={() => {
            discardChanges();
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default TimesheetForm;
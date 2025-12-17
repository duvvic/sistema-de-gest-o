import React, { useState, useMemo } from 'react';
import { User, Task, TimesheetEntry } from '../types';
import { Briefcase, Mail, CheckSquare, ShieldCheck, User as UserIcon, Search, Trash2, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TeamListProps {
  users: User[];
  tasks: Task[];
  timesheetEntries?: TimesheetEntry[];
  onUserClick: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onAddUser?: () => void;
  onEditUser?: (userId: string) => void;
}

const TeamList: React.FC<TeamListProps> = ({ users, tasks, timesheetEntries = [], onUserClick, onDeleteUser, onAddUser, onEditUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<'Todos' | string>('Todos');
  const [showInactive, setShowInactive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Livre' | 'Ocupado' | 'Ausente'>('Todos');

  // Calcular dias sem apontamento para cada usuário
  const userMissingDays = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const workDaysUntilYesterday: string[] = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    
    for (let d = new Date(firstDayOfMonth); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        workDaysUntilYesterday.push(d.toISOString().split('T')[0]);
      }
    }

    const userMissingMap = new Map<string, number>();
    
    users.forEach(user => {
      const userEntries = timesheetEntries.filter(e => 
        e.userId === user.id && 
        new Date(e.date).getMonth() === currentMonth &&
        new Date(e.date).getFullYear() === currentYear
      );
      
      const datesWithEntries = new Set(userEntries.map(e => e.date));
      const missingDays = workDaysUntilYesterday.filter(day => !datesWithEntries.has(day));
      
      userMissingMap.set(user.id, missingDays.length);
    });
    
    return userMissingMap;
  }, [users, timesheetEntries]);

  // Função para verificar se uma tarefa está atrasada
  const isTaskDelayed = (task: Task): boolean => {
    if (task.status === 'Done') return false;
    if (!task.estimatedDelivery) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const parts = task.estimatedDelivery.split('-');
    const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    return today > dueDate;
  };

  // Filtra por status ativo/inativo (strict check: false = inativo, qualquer outra coisa = ativo)
  const visibleUsers = showInactive 
    ? users.filter(u => u.active === false) 
    : users.filter(u => u.active === true);


  const cargoOptions = Array.from(
    new Set(visibleUsers.map(user => user.cargo || 'Sem cargo informado'))
  );

  const filteredUsers = visibleUsers.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const cargoValue = user.cargo || 'Sem cargo informado';
    const matchesCargo = selectedCargo === 'Todos' || cargoValue === selectedCargo;
    
    // Filtro de status
    const userAllTasks = tasks.filter(t => t.developerId === user.id);
    const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');
    
    let matchesStatus = true;
    if (statusFilter === 'Livre') {
      matchesStatus = userActiveTasks.length === 0;
    } else if (statusFilter === 'Ocupado') {
      matchesStatus = userActiveTasks.length > 0;
    } else if (statusFilter === 'Ausente') {
      // Futuramente: verificar apontamentos de horas faltando
      matchesStatus = false; // Por enquanto não mostra ninguém como ausente
    }
    
    return matchesSearch && matchesCargo && matchesStatus;
  });

  const handleDeleteClick = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (userToDelete && onDeleteUser) {
        await onDeleteUser(userToDelete.id);
      }
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {

      alert('Não foi possível excluir. Verifique permissões e tente novamente.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{showInactive ? 'Colaboradores Desligados' : 'Equipe'}</h1>
            <p className="text-sm text-slate-500">{showInactive ? 'Colaboradores inativos' : 'Colaboradores, papéis e carga de tarefas'}</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {!showInactive && onAddUser && (
            <button
              onClick={onAddUser}
              className="px-4 py-2.5 bg-gradient-to-r from-[#4c1d95] to-purple-600 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Desenvolvedor
            </button>
          )}
          <div className="relative w-full md:w-56">
            <select
              value={selectedCargo}
              onChange={(e) => setSelectedCargo(e.target.value)}
              className={`w-full appearance-none pl-3 pr-9 py-2.5 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm font-semibold ${
                selectedCargo === 'Todos'
                  ? 'bg-blue-500 text-white border-2 border-blue-400'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
              style={selectedCargo === 'Todos' ? {} : {}}
            >
              <option value="Todos" className="bg-white text-slate-700">Todos os cargos</option>
              {cargoOptions.map(cargo => (
                <option key={cargo} value={cargo} className="bg-white text-slate-700">{cargo}</option>
              ))}
            </select>
            <Briefcase className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative w-full md:w-72">
             <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
             <input 
               type="text"
               placeholder="Pesquisar por nome ou email..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm"
             />
          </div>
        </div>
      </div>

      {/* Filtros de Status */}
      {!showInactive && (
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold text-slate-700">Status:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('Todos')}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
                  statusFilter === 'Todos'
                    ? 'bg-gradient-to-r from-[#4c1d95] to-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('Livre')}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Livre'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white text-green-600 border border-green-200 hover:border-green-400'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Livres
              </button>
              <button
                onClick={() => setStatusFilter('Ocupado')}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Ocupado'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white text-amber-600 border border-amber-200 hover:border-amber-400'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Ocupados
              </button>
              <button
                onClick={() => setStatusFilter('Ausente')}
                className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 ${
                  statusFilter === 'Ausente'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-white text-red-600 border border-red-200 hover:border-red-400'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Ausentes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map(user => {
            const userAllTasks = tasks.filter(t => t.developerId === user.id);
            const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');
            const delayedTasks = userActiveTasks.filter(isTaskDelayed);
            const onTimeTasks = userActiveTasks.filter(t => !isTaskDelayed(t));
            const missingDays = userMissingDays.get(user.id) || 0;

            return (
              <div 
                key={user.id}
                className="bg-gradient-to-br from-white via-white to-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all group relative"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-7 h-7 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-800 truncate">{user.name}</h3>
                      {showInactive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">DESLIGADO</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-1">
                      {user.role === 'admin' ? (
                        <span className="bg-purple-100 text-[#4c1d95] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-[0_1px_2px_rgba(76,29,149,0.12)]">
                          <ShieldCheck className="w-3 h-3" /> {user.cargo || 'Cargo não informado'}
                        </span>
                      ) : (
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-[0_1px_2px_rgba(59,130,246,0.12)]">
                          <Briefcase className="w-3 h-3" /> {user.cargo || 'Cargo não informado'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${delayedTasks.length ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <AlertCircle className="w-4 h-4" />
                      {delayedTasks.length} atrasada{delayedTasks.length === 1 ? '' : 's'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${onTimeTasks.length ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <CheckCircle className="w-4 h-4" />
                      {onTimeTasks.length} no prazo
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${missingDays > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      <AlertCircle className="w-4 h-4" />
                      {missingDays} falta apontar
                    </span>
                  </div>

                  {userActiveTasks.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                      <CheckSquare className="w-4 h-4 text-green-600" />
                      <span className="px-2.5 py-1 rounded-full bg-green-50 border border-green-100">Livre</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100">Ocupado</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-sm gap-2">
                   <div className="flex gap-2">
                      {onDeleteUser && !showInactive && (
                         <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(e, user);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir Colaborador"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      )}
                   </div>
                   <div className="flex gap-2">
                      {onEditUser && (
                         <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditUser(user.id);
                            }}
                            className="px-3 py-1.5 rounded-lg text-purple-600 font-semibold hover:bg-purple-50 transition-colors text-xs border border-purple-200"
                         >
                            Editar
                         </button>
                      )}
                      <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           onUserClick(user.id);
                         }}
                         className="px-3 py-1.5 rounded-lg text-[#4c1d95] font-semibold hover:bg-purple-50 transition-colors text-xs"
                      >
                         Ver detalhes
                      </button>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        title="Excluir Colaborador"
        message={`Tem certeza que deseja remover "${userToDelete?.name}" da equipe?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default TeamList;

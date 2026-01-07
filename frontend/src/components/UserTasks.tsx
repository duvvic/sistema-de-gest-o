// components/UserTasks.tsx
import React, { useMemo, useState } from "react";
import { Task, Project, Client, User, TimesheetEntry } from '@/types';
import { ArrowLeft, Plus, FolderKanban, Calendar, Building2, TrendingUp, Clock } from "lucide-react";

interface UserTasksProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  filterProjectId?: string | null;

  onTaskClick: (taskId: string) => void;
  onNewTask: () => void;
  onCreateTimesheetForTask?: (task: Task) => void;
  timesheetEntries?: TimesheetEntry[];

  onBack?: () => void;
}

const UserTasks: React.FC<UserTasksProps> = ({
  user,
  tasks,
  projects,
  clients,
  filterProjectId,
  onTaskClick,
  onNewTask,
  onBack,
  onCreateTimesheetForTask,
  timesheetEntries
}) => {

  const [viewFilter, setViewFilter] = useState<'all' | 'concluded' | 'delayed' | 'inprogress'>('all');

  // ================================
  // 1) Filtra apenas tarefas do usuário
  // ================================
  const myTasks = useMemo(
    () => tasks.filter((t) => t.developerId === user.id),
    [tasks, user.id]
  );

  // ================================
  // 2) Filtra por projeto (se houver)
  // ================================
  const filteredTasks = useMemo(() => {
    if (!filterProjectId) return myTasks;
    return myTasks.filter((t) => t.projectId === filterProjectId);
  }, [myTasks, filterProjectId]);

  const isTaskDelayed = (task: Task) => {
    if (!task.estimatedDelivery) return false;
    if (task.actualDelivery) return false; // already done
    try {
      const due = new Date(task.estimatedDelivery);
      const today = new Date();
      // normalize dates (compare yyyy-mm-dd only)
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return dueDay < todayDay;
    } catch (e) {
      return false;
    }
  };


  // ================================
  // 3) Agrupar em 3 colunas: Em Progresso, Atrasadas, Concluídas
  // ================================
  const tasksByStatus = useMemo(() => {
    const concluded = filteredTasks.filter(t => !!t.actualDelivery || t.status === 'Done');
    const delayed = filteredTasks.filter(t => !concluded.includes(t) && isTaskDelayed(t));
    const inProgress = filteredTasks.filter(t => !concluded.includes(t) && !delayed.includes(t));

    return {
      InProgress: inProgress,
      Delayed: delayed,
      Concluded: concluded,
    };
  }, [filteredTasks]);


  // ================================
  // 4) Render
  // ================================
  return (
    <div className="h-full flex flex-col p-2" style={{ backgroundColor: 'var(--bgApp)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4c1d95] to-purple-600 rounded-2xl px-8 py-6 mb-6 shadow-lg border-2 border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              📋 Minhas Tarefas
            </h1>
            <p className="text-purple-100 text-sm mt-2">
              {filterProjectId
                ? "Tarefas do projeto selecionado"
                : "Todas as suas tarefas atribuídas"}
            </p>
          </div>

          <div className="flex items-center gap-3">

            <button
              onClick={onNewTask}
              className="px-5 py-2.5 rounded-xl bg-white text-[#4c1d95] hover:bg-slate-100 transition-all flex items-center gap-2 shadow-lg font-bold transform hover:scale-105"
            >
              <Plus size={20} />
              Nova Tarefa
            </button>
          </div>
        </div>
      </div>

      {/* Top status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-2xl border-2 shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--textMuted)' }}>Em Progresso</div>
              <div className="text-3xl font-black mt-2 text-blue-600">⚙️ {tasksByStatus.InProgress.length}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-300" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border-2 shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--textMuted)' }}>Atrasadas</div>
              <div className="text-3xl font-black mt-2 text-red-600">⏰ {tasksByStatus.Delayed.length}</div>
            </div>
            <Clock className="w-8 h-8 text-red-300" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border-2 shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--textMuted)' }}>Concluídas</div>
              <div className="text-3xl font-black mt-2 text-emerald-600">✅ {tasksByStatus.Concluded.length}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--textMuted)' }}>
          <FolderKanban className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-semibold">Nenhuma tarefa encontrada.</p>
          <p className="text-sm mt-2">Crie uma nova tarefa para começar</p>
        </div>
      )}

      {/* Kanban / Filtered Lists */}
      {filteredTasks.length > 0 && (
        <div className="h-full overflow-y-auto pb-4 custom-scrollbar">
          {viewFilter === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TaskColumn
                title="Em Progresso"
                tasks={tasksByStatus.InProgress}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
              />

              <TaskColumn
                title="Atrasadas"
                tasks={tasksByStatus.Delayed}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
              />

              <TaskColumn
                title="Concluídas"
                tasks={tasksByStatus.Concluded}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
              />
            </div>
          )}

          {viewFilter === 'concluded' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--textTitle)' }}>Tarefas Concluídas</h3>
                <div className="space-y-3">
                  {tasksByStatus.Concluded.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left transition border rounded-xl p-4 shadow-sm"
                      style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--textMuted)' }}>Entrega: {t.actualDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewFilter === 'delayed' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-red-600 mb-3">Tarefas Atrasadas</h3>
                <div className="space-y-3">
                  {tasksByStatus.Delayed.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left transition border rounded-xl p-4 shadow-sm"
                      style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--textMuted)' }}>Prevista: {t.estimatedDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewFilter === 'inprogress' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--textTitle)' }}>Em Progresso</h3>
                <div className="space-y-3">
                  {tasksByStatus.InProgress.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left transition border rounded-xl p-4 shadow-sm"
                      style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--textMuted)' }}>Prevista: {t.estimatedDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserTasks;


// ================================================
// COMPONENTE: COLUNA DO KANBAN
// ================================================
const TaskColumn: React.FC<{
  title: string;
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (id: string) => void;
  onCreateTimesheetForTask?: (task: Task) => void;
  timesheetEntries?: TimesheetEntry[];
  currentUserId?: string;
}> = ({ title, tasks, clients, projects, onTaskClick, onCreateTimesheetForTask, timesheetEntries, currentUserId }) => {

  return (
    <div className="rounded-2xl border p-4 flex flex-col" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--textTitle)' }}>{title}</h2>

      <div className="space-y-3 overflow-y-auto custom-scrollbar">
        {tasks.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const client = clients.find(c => c.id === task.clientId);

          return (
            <div key={task.id} className="w-full transition border rounded-xl p-4 shadow-sm group"
              style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
              <button
                onClick={() => onTaskClick(task.id)}
                className="w-full text-left"
              >
                <p className="font-bold" style={{ color: 'var(--text)' }}>{task.title}</p>

                <div className="text-xs mt-2 flex items-center gap-2" style={{ color: 'var(--textMuted)' }}>
                  <Calendar size={14} />
                  {task.estimatedDelivery}
                </div>

                <div className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Building2 size={14} style={{ color: 'var(--brand)' }} />
                  {client?.name ?? "Cliente"}
                </div>

                <div className="text-xs mt-1" style={{ color: 'var(--textMuted)' }}>
                  Projeto: {project?.name ?? "Sem projeto"}
                </div>
              </button>

              {/* badge: show if user has no timesheet for this task today and task not done */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const hasEntry = !!timesheetEntries?.some(e => e.taskId === task.id && e.date === today && e.userId === currentUserId);
                const show = !hasEntry && task.status !== 'Done';
                return show ? (
                  <div className="mt-3">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">Sem Apont.</span>
                  </div>
                ) : null;
              })()}

              {task.status !== 'Done' && task.actualDelivery == null && (
                <div className="mt-3 flex items-center gap-2">
                  {onCreateTimesheetForTask && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCreateTimesheetForTask(task); }}
                      className="px-3 py-1 rounded-lg text-white text-sm transition"
                      style={{ backgroundColor: 'var(--brand)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brandHover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand)'}
                    >
                      Apontar Hoje
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

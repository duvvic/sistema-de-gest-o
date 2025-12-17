import React, { useState } from 'react';
import { TimesheetEntry } from '../types';
import { ChevronLeft, ChevronRight, Plus, Clock, TrendingUp, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TimesheetCalendarProps {
  entries: TimesheetEntry[];
  onDateClick: (date: string) => void;
  onEntryClick: (entry: TimesheetEntry) => void;
  onDeleteEntry?: (entryId: string) => void;
  tasks?: { id: string; title: string }[];
}

const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({ entries, onDateClick, onEntryClick, onDeleteEntry, tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimesheetEntry | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Verifica se pode avançar para o próximo mês (não permite meses futuros)
  const today = new Date();
  const canGoNext = currentDate.getFullYear() < today.getFullYear() || 
                   (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="bg-slate-200 border border-slate-300 min-h-[100px]"></div>);
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEntries = entries.filter(e => e.date === dateStr);
    const totalHours = dayEntries.reduce((acc, curr) => acc + curr.totalHours, 0);

    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const hasEntries = dayEntries.length > 0;
    const dayOfWeek = new Date(year, month, d).getDay(); // Usar construtor numérico
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou Sábado

    days.push(
      <div 
        key={d} 
        onClick={() => onDateClick(dateStr)}
        className={`
          min-h-[140px] p-3 relative group cursor-pointer transition-all border-2 rounded-xl
          ${hasEntries
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 hover:shadow-lg hover:scale-105'
            : isToday
            ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-400 hover:shadow-lg hover:scale-105'
            : isWeekend
            ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 hover:shadow-md'
            : 'bg-white border-slate-200 hover:shadow-md'
          }
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`
            text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full
            ${hasEntries
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md'
              : isToday
              ? 'bg-gradient-to-br from-[#4c1d95] to-purple-600 text-white shadow-md'
              : 'text-slate-700 font-semibold'
            }
          `}>
            {d}
          </span>
          {hasEntries && (
            <span className="text-xs font-bold text-emerald-700 bg-gradient-to-r from-emerald-200 to-teal-200 px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-emerald-300">
              <TrendingUp className="w-3 h-3" />
              <span>{totalHours.toFixed(1)}h</span>
            </span>
          )}
        </div>

        <div className="space-y-1.5 overflow-y-auto max-h-[85px] custom-scrollbar">
          {(() => {
            if (dayEntries.length === 0) {
              return (
                <div className="text-slate-300 text-2xl text-center py-4">
                  +
                </div>
              );
            }

            const previews = dayEntries.slice(0, 3).map(entry => {
              const taskTitle = tasks?.find(t => t.id === entry.taskId)?.title || entry.description || 'Sem descrição';
              return (
                <div
                  key={entry.id}
                  className="text-[10px] bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-300 hover:bg-gradient-to-r hover:from-emerald-200 hover:to-teal-200 transition-all font-semibold shadow-sm flex items-center justify-between gap-1 group/entry"
                >
                  <span 
                    onClick={(e) => { e.stopPropagation(); onEntryClick(entry); }}
                    className="truncate cursor-pointer flex-1"
                  >
                    ⏰ {entry.startTime} • {taskTitle}
                  </span>
                  {onDeleteEntry && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToDelete(entry);
                        setDeleteModalOpen(true);
                      }}
                      className="opacity-0 group-hover/entry:opacity-100 transition-opacity p-0.5 hover:bg-red-200 rounded"
                      title="Excluir apontamento"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  )}
                </div>
              );
            });

            const more = dayEntries.length - previews.length;
            return (
              <>
                {previews}
                {more > 0 && (
                  <div className="text-[10px] text-emerald-700 font-bold px-2.5 py-1.5 bg-emerald-100 rounded-lg border border-emerald-200">📌 +{more} mais</div>
                )}
              </>
            );
          })()}
        </div>

        {/* Hover Add Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity rounded-xl">
           <div className="bg-gradient-to-br from-[#4c1d95] to-purple-600 text-white p-3 rounded-full shadow-xl transform hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
           </div>
        </div>
      </div>
    );
  }

  // Calculate month stats
  const monthTotalHours = entries
    .filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === month && eDate.getFullYear() === year;
    })
    .reduce((acc, curr) => acc + curr.totalHours, 0);

  const entriesSet = new Set(entries
    .filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === month && eDate.getFullYear() === year;
    })
    .map(e => e.date)
  );

  // Calcular dias úteis sem registro (segunda a sexta, até hoje)
  const todayStr = today.toISOString().split('T')[0];
  const daysMissing = (() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, d).getDay(); // Usar construtor numérico
      const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      const isPastOrToday = dateStr <= todayStr;
      const hasEntry = entriesSet.has(dateStr);
      
      // Apenas dias úteis (seg-sex), que já passaram ou é hoje, sem registro
      if (isWorkDay && isPastOrToday && !hasEntry) {
        count++;
      }
    }
    return count;
  })();

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-[#4c1d95] to-purple-600 px-8 py-6 border-b-2 border-slate-200 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <Clock className="w-7 h-7 text-purple-200" />
             Apontamento de Horas
          </h2>
          
          <div className="flex items-center gap-6">
            <button onClick={prevMonth} className="p-2.5 hover:bg-white/20 rounded-full text-white transition-colors">
               <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold text-white min-w-[180px] text-center">
              📅 {monthNames[month]} {year}
            </span>
            <button 
              onClick={nextMonth} 
              disabled={!canGoNext}
              className={`p-2.5 rounded-full transition-colors ${
                canGoNext 
                  ? 'hover:bg-white/20 text-white' 
                  : 'opacity-30 cursor-not-allowed text-white/50'
              }`}
            >
               <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <button 
            onClick={() => onDateClick(new Date().toISOString().split('T')[0])}
            className="bg-white hover:bg-purple-50 text-[#4c1d95] px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Registrar Hoje
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
            <p className="text-purple-200 text-xs font-semibold uppercase tracking-wide">Horas Este Mês</p>
            <p className="text-white text-2xl font-black mt-1">⏱️ {monthTotalHours.toFixed(1)}h</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
            <p className="text-purple-200 text-xs font-semibold uppercase tracking-wide">Dias sem Registro</p>
            <p className="text-white text-2xl font-black mt-1">📊 {daysMissing} dias</p>
          </div>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-gradient-to-r from-slate-100 to-slate-200 shadow-sm">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
          <div 
            key={day} 
            className={`py-3 text-center text-xs font-bold uppercase tracking-widest ${
              idx === 0 || idx === 6 ? 'text-red-600' : 'text-slate-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-2 gap-1.5">
        {days}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="🗑️ Excluir Apontamento"
        message={`Tem certeza que deseja excluir o apontamento de ${entryToDelete?.startTime} às ${entryToDelete?.endTime}? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (entryToDelete && onDeleteEntry) {
            onDeleteEntry(entryToDelete.id);
          }
          setDeleteModalOpen(false);
          setEntryToDelete(null);
        }}
        onCancel={() => {
          setDeleteModalOpen(false);
          setEntryToDelete(null);
        }}
      />
    </div>
  );
};

export default TimesheetCalendar;
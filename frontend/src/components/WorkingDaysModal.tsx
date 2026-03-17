import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Info, AlertTriangle, CheckCircle, Clock, Palmtree, Umbrella, Zap, FileText } from 'lucide-react';
import { WorkingDayDetail } from '../utils/capacity';

interface WorkingDaysModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    details: WorkingDayDetail[];
}

const WorkingDaysModal: React.FC<WorkingDaysModalProps> = ({
    isOpen,
    onClose,
    title,
    details
}) => {
    if (!isOpen) return null;

    const summary = useMemo(() => {
        let working = 0;
        let weekends = 0;
        let holidays = 0;
        let absences = 0;
        let partials = 0;

        details.forEach(d => {
            if (d.isWeekend) weekends++;
            else if (d.holiday) holidays++;
            else if (d.absence) {
                if (d.effectiveDayValue > 0) partials++;
                else absences++;
            }
            else working += d.effectiveDayValue;
        });

        return { working, weekends, holidays, absences, partials, total: details.length };
    }, [details]);

    // Group details by month
    const groupedDetails = useMemo(() => {
        const groups: Record<string, WorkingDayDetail[]> = {};
        details.forEach(d => {
            const monthKey = d.date.substring(0, 7); // YYYY-MM
            if (!groups[monthKey]) groups[monthKey] = [];
            groups[monthKey].push(d);
        });
        return groups;
    }, [details]);

    const getMonthName = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(Number(year), Number(month) - 1, 1);
        return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-md bg-black/60" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[40px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-8 border-b border-[var(--border)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500" />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">Cálculo de Capacidade</p>
                                    <h2 className="text-xl font-black text-[var(--text)] tracking-tight uppercase">{title}</h2>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] rounded-2xl text-[var(--text-muted)] transition-all hover:rotate-90"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary Chips */}
                        <div className="flex flex-wrap gap-2 mt-8">
                            <div className="px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center gap-2">
                                <CheckCircle size={14} className="text-blue-500" />
                                <span className="text-xs font-black text-blue-500">{summary.working.toFixed(1)} Dias Úteis</span>
                            </div>
                            {summary.holidays > 0 && (
                                <div className="px-4 py-2 bg-orange-500/10 rounded-xl border border-orange-500/20 flex items-center gap-2 text-orange-500">
                                    <Palmtree size={14} />
                                    <span className="text-xs font-black">{summary.holidays} Feriados</span>
                                </div>
                            )}
                            {summary.absences > 0 && (
                                <div className="px-4 py-2 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center gap-2 text-purple-500">
                                    <Umbrella size={14} />
                                    <span className="text-xs font-black">{summary.absences} Ausências</span>
                                </div>
                            )}
                            {summary.partials > 0 && (
                                <div className="px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center gap-2 text-indigo-500">
                                    <Zap size={14} />
                                    <span className="text-xs font-black">{summary.partials} Parciais</span>
                                </div>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-[var(--border)]">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                <span className="text-[8px] font-black uppercase text-[var(--muted)]">Dia Útil</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="text-[8px] font-black uppercase text-[var(--muted)]">Feriado</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                <span className="text-[8px] font-black uppercase text-[var(--muted)]">Ausência</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-slate-400 opacity-40" />
                                <span className="text-[8px] font-black uppercase text-[var(--muted)]">FDS</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar bg-[var(--surface)]">
                        {Object.entries(groupedDetails).map(([monthKey, monthDays]) => (
                            <div key={monthKey} className="mb-10 last:mb-0">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)] mb-4 sticky top-0 bg-[var(--surface)] py-2 z-10">
                                    {getMonthName(monthKey)}
                                </h3>

                                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                                    {monthDays.map((d, i) => {
                                        const dayNum = Number(d.date.split('-')[2]);
                                        const isWorking = d.isWorkingDay;
                                        const isAbsence = !!d.absence;
                                        const isHoliday = !!d.holiday;
                                        const isWeekend = d.isWeekend;

                                        let bgColor = 'var(--surface-2)';
                                        let borderColor = 'var(--border)';
                                        let textColor = 'var(--text-muted)';
                                        let Icon = null;

                                        if (isWorking) {
                                            bgColor = d.effectiveDayValue < 1 ? 'rgba(79, 70, 229, 0.05)' : 'rgba(59, 130, 246, 0.08)';
                                            borderColor = d.effectiveDayValue < 1 ? 'rgba(79, 70, 229, 0.3)' : 'rgba(59, 130, 246, 0.3)';
                                            textColor = 'var(--text)';
                                        } else if (isHoliday) {
                                            bgColor = 'rgba(249, 115, 22, 0.1)';
                                            borderColor = 'rgba(249, 115, 22, 0.3)';
                                            textColor = 'rgb(249, 115, 22)';
                                            Icon = Palmtree;
                                        } else if (isAbsence) {
                                            bgColor = 'rgba(168, 85, 247, 0.1)';
                                            borderColor = 'rgba(168, 85, 247, 0.3)';
                                            textColor = 'rgb(168, 85, 247)';
                                            Icon = Umbrella;
                                        } else if (isWeekend) {
                                            bgColor = 'transparent';
                                            borderColor = 'var(--border)';
                                            textColor = 'var(--text-secondary)';
                                            Icon = Clock;
                                        }

                                        return (
                                            <div
                                                key={d.date}
                                                className={`
                                                    relative flex flex-col p-3 rounded-2xl border transition-all hover:scale-105
                                                    ${isWorking ? 'shadow-sm shadow-blue-500/10' : ''}
                                                `}
                                                style={{ backgroundColor: bgColor, borderColor }}
                                            >
                                                <span className="text-[9px] font-black" style={{ color: textColor }}>{dayNum}</span>
                                                <div className="mt-1.5 flex flex-col gap-1 flex-1">
                                                    {isWorking && (
                                                        <span className="text-[7px] font-black uppercase text-blue-500/60 tabular-nums">
                                                            {d.effectiveDayValue === 1 ? 'Integral' : `${d.effectiveDayValue.toFixed(1)} d`}
                                                        </span>
                                                    )}
                                                    {(isHoliday || isAbsence) && (
                                                        <>
                                                            <div className="flex items-center justify-between">
                                                                {Icon && <Icon size={12} style={{ color: textColor }} />}
                                                                <span className="text-[8px] font-black text-red-500">-{d.deduction}h</span>
                                                            </div>
                                                            <span className="text-[6px] font-black uppercase leading-[1.1] opacity-60" style={{ color: textColor }}>
                                                                {isHoliday ? d.holiday?.name : d.absence?.type}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Tooltip detail (visible on hover) */}
                                                {(isHoliday || isAbsence) && (
                                                    <div className="absolute inset-0 opacity-0 hover:opacity-100 bg-black/80 rounded-2xl flex flex-col items-center justify-center p-2 text-center transition-opacity z-10 pointer-events-none">
                                                        <p className="text-[7px] font-black uppercase text-white line-clamp-2">
                                                            {isHoliday ? (d.holiday?.name) : (d.absence?.type)}
                                                        </p>
                                                        {d.deduction > 0 && (
                                                            <p className="text-[8px] font-bold text-red-400 mt-1">-{d.deduction}h</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Detalhamento de Eventos (User Request: Mostrar todas ausências de dias e horas) */}
                        {(summary.absences > 0 || summary.holidays > 0 || summary.partials > 0) && (
                            <div className="mt-12 pt-8 border-t border-[var(--border)]">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] mb-6 flex items-center gap-2">
                                    <FileText size={14} className="text-purple-500" /> Eventos no Período
                                </h4>
                                <div className="space-y-3">
                                    {details
                                        .filter(d => d.holiday || d.absence)
                                        .map((d, idx) => (
                                            <div
                                                key={`event-${idx}`}
                                                className="flex items-center justify-between p-4 rounded-2xl border bg-[var(--surface-2)] border-[var(--border)] hover:border-purple-500/30 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.holiday ? 'bg-orange-500/10 text-orange-500' : 'bg-purple-500/10 text-purple-500'}`}>
                                                        {d.holiday ? <Palmtree size={18} /> : <Umbrella size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-[var(--text)] uppercase tracking-tight">
                                                            {d.holiday ? d.holiday.name : d.absence?.type}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Calendar size={10} className="text-[var(--muted)]" />
                                                            <span className="text-[9px] font-bold text-[var(--muted)]">
                                                                {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-black text-red-500">-{d.deduction} horas</p>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--muted)] mt-0.5">Dedução de Capacidade</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-[var(--border)] flex justify-between items-center bg-[var(--surface-2)]">
                        <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px] font-bold">
                            <Info size={14} className="text-blue-500" />
                            <span>Contagem baseada em feriados nacionais e ausências aprovadas.</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 active:scale-95"
                        >
                            Entendido
                        </button>
                    </div>
                </motion.div>
            </div >
        </AnimatePresence >
    );
};

export default WorkingDaysModal;

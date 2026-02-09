import React, { useState, useMemo } from 'react';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { Absence, User } from '@/types';
import {
    Calendar, Users, Clock, CheckCircle, XCircle, AlertCircle,
    Palmtree, Search, Filter, ArrowRight, UserPlus,
    MessageSquare, History, FileText, Download, Briefcase, Trash2,
    ShieldCheck, CheckCheck, Landmark, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';
import HolidayManager from '@/components/HolidayManager';
import AbsenceManager from '@/components/AbsenceManager';

const RHManagement: React.FC = () => {
    const { isAdmin, currentUser } = useAuth();
    const { absences, users, updateAbsence, deleteAbsence } = useDataController();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Absence['status']>('all');
    const [towerFilter, setTowerFilter] = useState('all');
    const [activeTab, setActiveTab] = useState<'requests' | 'calendar' | 'collaborators' | 'holidays'>('requests');

    const [loading, setLoading] = useState(false);
    const [actionModal, setActionModal] = useState<{ id: string, type: 'approve' | 'reject' | 'delete' } | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);


    // ... rest of the code logic remains ...


    // Filters
    const filteredAbsences = useMemo(() => {
        return absences.filter(a => {
            const user = users.find(u => u.id === a.userId);
            const matchesSearch = user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.observations?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
            const matchesTower = towerFilter === 'all' || user?.torre === towerFilter;
            return matchesSearch && matchesStatus && matchesTower;
        }).sort((a, b) => b.startDate.localeCompare(a.startDate));
    }, [absences, users, searchTerm, statusFilter, towerFilter]);

    const pendingRequests = useMemo(() => {
        return absences.filter(a => a.status === 'sugestao' || a.status === 'aprovada_gestao' || a.status === 'aprovada_rh');
    }, [absences]);

    const handleAction = async () => {
        if (!actionModal) return;
        setLoading(true);
        try {
            const current = absences.find(a => a.id === actionModal.id);
            if (!current) return;

            if (actionModal.type === 'approve') {
                let nextStatus: Absence['status'] = current.status;
                let statusLabel = '';

                if (current.status === 'sugestao') {
                    nextStatus = 'aprovada_gestao';
                    statusLabel = 'Aprovada pela Gestão';
                } else if (current.status === 'aprovada_gestao') {
                    nextStatus = 'aprovada_rh';
                    statusLabel = 'Aprovada pelo RH';
                } else if (current.status === 'aprovada_rh') {
                    nextStatus = 'finalizada_dp';
                    statusLabel = 'Finalizada no DP';
                }

                await updateAbsence(actionModal.id, { status: nextStatus });

                // Feedback visual
                const userName = users.find(u => u.id === current.userId)?.name || 'Colaborador';
                alert(`✅ Solicitação aprovada!\n\n${userName}\nNovo status: ${statusLabel}\n\nA solicitação agora aparece com a nova etapa na lista.`);
            } else if (actionModal.type === 'reject') {
                await updateAbsence(actionModal.id, { status: 'rejeitado' });
                alert('❌ Solicitação rejeitada.');
            } else if (actionModal.type === 'delete') {
                await deleteAbsence(actionModal.id);
                alert('🗑️ Solicitação excluída.');
            }
            setActionModal(null);
        } catch (error) {
            alert('Erro ao processar ação.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: Absence['status']) => {
        switch (status) {
            case 'sugestao': return 'bg-amber-100 text-amber-700 border-amber-200'; // Amarelo
            case 'aprovada_gestao': return 'bg-blue-100 text-blue-700 border-blue-200'; // Azul
            case 'aprovada_rh': return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Verde
            case 'finalizada_dp': return 'bg-purple-100 text-purple-700 border-purple-200'; // Lilas
            case 'rejeitado': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: Absence['status']) => {
        switch (status) {
            case 'sugestao': return '1. Sugestão';
            case 'aprovada_gestao': return '2. Aprovada Gestão';
            case 'aprovada_rh': return '3. Aprovada RH';
            case 'finalizada_dp': return '4. Lançada DP';
            default: return status;
        }
    };

    const calculateDays = (start: string, end: string) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diff = d2.getTime() - d1.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    };

    // Função para exportar relatório em CSV
    const handleExportReport = () => {
        const csvRows = [];
        const headers = ['Colaborador', 'Cargo', 'Torre', 'Data Início', 'Data Fim', 'Dias', 'Status', 'Periodo', 'Observações'];
        csvRows.push(headers.join(','));

        filteredAbsences.forEach(absence => {
            const user = users.find(u => u.id === absence.userId);
            const days = calculateDays(absence.startDate, absence.endDate);
            const row = [
                user?.name || 'N/A',
                user?.cargo || 'N/A',
                user?.torre || 'N/A',
                new Date(absence.startDate).toLocaleDateString('pt-BR'),
                new Date(absence.endDate).toLocaleDateString('pt-BR'),
                days,
                getStatusLabel(absence.status),
                absence.period || 'integral',
                absence.observations || ''
            ];
            csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `ferias_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Função para calcular estatísticas mensais
    const getMonthlyStats = (monthIdx: number) => {
        const monthAbsences = absences.filter(a => {
            const date = new Date(a.startDate);
            return date.getMonth() === monthIdx && date.getFullYear() === 2026;
        });

        const totalDays = monthAbsences.reduce((acc, a) => acc + calculateDays(a.startDate, a.endDate), 0);
        const uniqueCollaborators = new Set(monthAbsences.map(a => a.userId)).size;

        return {
            total: monthAbsences.length,
            totalDays,
            collaborators: uniqueCollaborators,
            byStatus: {
                sugestao: monthAbsences.filter(a => a.status === 'sugestao').length,
                aprovada_gestao: monthAbsences.filter(a => a.status === 'aprovada_gestao').length,
                aprovada_rh: monthAbsences.filter(a => a.status === 'aprovada_rh').length,
                finalizada_dp: monthAbsences.filter(a => a.status === 'finalizada_dp').length,
            }
        };
    };


    return (
        <div className="h-full flex flex-col p-8 gap-8 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text)] flex items-center gap-3">
                        <Users className="text-[var(--primary)]" />
                        Gestão de Férias NIC-LABS
                    </h1>
                    <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mt-1">
                        Fluxo de Aprovação e Planejamento Anual
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                    >
                        <Palmtree size={18} /> Solicitar Férias
                    </button>
                </div>

                <div className="flex bg-[var(--surface-2)] p-1 rounded-2xl border border-[var(--border)] overflow-hidden">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'requests' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    >
                        Fluxo {pendingRequests.length > 0 && <span className="ml-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{pendingRequests.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'calendar' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    >
                        Visão Mensal
                    </button>
                    <button
                        onClick={() => setActiveTab('collaborators')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'collaborators' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    >
                        Regras e Saldos
                    </button>
                    <button
                        onClick={() => setActiveTab('holidays')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'holidays' ? 'bg-[var(--primary)] text-white shadow-lg' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
                    >
                        Feriados
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col gap-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600"><Clock size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-[var(--muted)]">Sugestões</p>
                            <p className="text-2xl font-black">{absences.filter(a => a.status === 'sugestao').length}</p>
                        </div>
                    </div>
                    <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600"><ShieldCheck size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-[var(--muted)]">Aprov. Gestão</p>
                            <p className="text-2xl font-black">{absences.filter(a => a.status === 'aprovada_gestao').length}</p>
                        </div>
                    </div>
                    <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600"><CheckCheck size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-[var(--muted)]">Aprov. RH</p>
                            <p className="text-2xl font-black">{absences.filter(a => a.status === 'aprovada_rh').length}</p>
                        </div>
                    </div>
                    <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-600"><Landmark size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-[var(--muted)]">Finalizadas DP</p>
                            <p className="text-2xl font-black">{absences.filter(a => a.status === 'finalizada_dp').length}</p>
                        </div>
                    </div>
                </div>

                {activeTab === 'requests' && (
                    <div className="flex-1 flex flex-col gap-4 min-h-0">
                        {/* Guia Visual do Fluxo */}
                        <div className="bg-[var(--surface-2)] p-4 rounded-3xl border border-[var(--border)] flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-black text-xs">1</div>
                                <span className="text-[10px] font-black uppercase text-amber-700">Sugestão</span>
                            </div>
                            <div className="h-px bg-[var(--border)] flex-1 min-w-[20px]" />
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center font-black text-xs">2</div>
                                <span className="text-[10px] font-black uppercase text-blue-700">Gestão</span>
                            </div>
                            <div className="h-px bg-[var(--border)] flex-1 min-w-[20px]" />
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-black text-xs">3</div>
                                <span className="text-[10px] font-black uppercase text-emerald-700">RH</span>
                            </div>
                            <div className="h-px bg-[var(--border)] flex-1 min-w-[20px]" />
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center font-black text-xs">4</div>
                                <span className="text-[10px] font-black uppercase text-purple-700">DP (Finalizada)</span>
                            </div>
                        </div>

                        <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border)] shadow-sm flex flex-wrap items-center gap-4">
                            <div className="flex-1 flex items-center bg-[var(--bgApp)] rounded-xl border border-[var(--border)] px-4 py-2 gap-3 min-w-[200px]">
                                <Search size={18} className="text-[var(--muted)]" />
                                <input
                                    type="text"
                                    placeholder="Buscar por colaborador ou observação..."
                                    className="bg-transparent border-none outline-none w-full text-sm font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                value={towerFilter}
                                onChange={(e) => setTowerFilter(e.target.value)}
                                className="bg-[var(--bgApp)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                            >
                                <option value="all">Todas as Torres</option>
                                <option value="Engenharia">Engenharia</option>
                                <option value="Design">Design</option>
                                <option value="QA">QA</option>
                                <option value="DevOps">DevOps</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="bg-[var(--bgApp)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold outline-none cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                            >
                                <option value="all">Todos os Status</option>
                                <option value="sugestao">1. Sugestão</option>
                                <option value="aprovada_gestao">2. Gestão (Azul)</option>
                                <option value="aprovada_rh">3. RH (Verde)</option>
                                <option value="finalizada_dp">4. DP (Lilas)</option>
                                <option value="rejeitado">Rejeitados</option>
                            </select>
                            <button
                                onClick={handleExportReport}
                                className="p-2.5 bg-[var(--surface-2)] text-[var(--text)] rounded-xl border border-[var(--border)] hover:bg-[var(--primary)] hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                            >
                                <Download size={16} /> Exportar
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8 min-h-0">
                            {/* Seção de Pendentes */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-amber-600 tracking-widest pl-2 flex items-center gap-2">
                                    <Clock size={14} /> Solicitações em Fluxo
                                </h3>
                                <AnimatePresence mode="popLayout">
                                    {filteredAbsences.filter(a => a.status !== 'finalizada_dp' && a.status !== 'rejeitado').map((absence) => {
                                        const user = users.find(u => u.id === absence.userId);
                                        const days = calculateDays(absence.startDate, absence.endDate);
                                        const daysUntilStart = Math.ceil((new Date(absence.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                key={absence.id}
                                                className="bg-[var(--surface)] p-5 rounded-[32px] border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center gap-6 group relative overflow-hidden"
                                            >
                                                {/* Indicador lateral da fase atual */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${absence.status === 'sugestao' ? 'bg-amber-400' :
                                                    absence.status === 'aprovada_gestao' ? 'bg-blue-400' :
                                                        'bg-emerald-400'
                                                    }`} />

                                                <div className="flex items-center gap-4 min-w-[200px]">
                                                    <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-black text-sm">
                                                        {user?.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-sm text-[var(--text)]">{user?.name}</h3>
                                                        <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-tighter">{user?.cargo}</p>
                                                    </div>
                                                </div>

                                                <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-[var(--muted)] mb-1">Datas</p>
                                                        <p className="text-[11px] font-black text-[var(--text)] whitespace-nowrap">
                                                            {new Date(absence.startDate).toLocaleDateString()}
                                                            <ArrowRight size={12} className="inline mx-1 opacity-40" />
                                                            {new Date(absence.endDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-[var(--muted)] mb-1">Duração</p>
                                                        <p className="text-xs font-black">{days} {days === 1 ? 'dia' : 'dias'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-[var(--muted)] mb-1">Fase Atual</p>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border whitespace-nowrap ${getStatusStyle(absence.status)}`}>
                                                            {getStatusLabel(absence.status)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase text-[var(--muted)] mb-1">Antecedência</p>
                                                        <p className={`text-[10px] font-black ${daysUntilStart < 30 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {daysUntilStart} dias
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => setActionModal({ id: absence.id, type: 'approve' })}
                                                        className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 text-[9px] font-black uppercase"
                                                    >
                                                        {absence.status === 'sugestao' ? 'Passar p/ Gestão' : absence.status === 'aprovada_gestao' ? 'Passar p/ RH' : 'Passar p/ DP'}
                                                    </button>
                                                    <button
                                                        onClick={() => setActionModal({ id: absence.id, type: 'reject' })}
                                                        className="p-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-200"
                                                        title="Rejeitar"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActionModal({ id: absence.id, type: 'delete' })}
                                                        className="p-2.5 text-[var(--muted)] hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {filteredAbsences.filter(a => a.status !== 'finalizada_dp' && a.status !== 'rejeitado').length === 0 && (
                                    <div className="text-center py-10 bg-[var(--surface-2)] rounded-[32px] border border-dashed border-[var(--border)]">
                                        <p className="text-[var(--muted)] text-xs font-bold uppercase tracking-widest">Nenhuma solicitação pendente</p>
                                    </div>
                                )}
                            </div>

                            {/* Seção de Finalizadas */}
                            <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity">
                                <h3 className="text-[10px] font-black uppercase text-purple-600 tracking-widest pl-2 flex items-center gap-2">
                                    <CheckCheck size={14} /> Recentemente Finalizadas (Histórico)
                                </h3>
                                <div className="space-y-3">
                                    {filteredAbsences.filter(a => a.status === 'finalizada_dp' || a.status === 'rejeitado').map((absence) => {
                                        const user = users.find(u => u.id === absence.userId);
                                        const isRejected = absence.status === 'rejeitado';

                                        return (
                                            <div
                                                key={absence.id}
                                                className={`bg-[var(--bgApp)] p-4 rounded-3xl border ${isRejected ? 'border-red-100' : 'border-purple-100'} flex items-center gap-4 group transition-all`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isRejected ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-500'}`}>
                                                    {user?.name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-xs">{user?.name}</h4>
                                                    <p className="text-[9px] font-black text-[var(--muted)]">{new Date(absence.startDate).toLocaleDateString()} a {new Date(absence.endDate).toLocaleDateString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${getStatusStyle(absence.status)}`}>
                                                        {getStatusLabel(absence.status)}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setActionModal({ id: absence.id, type: 'delete' })}
                                                    className="p-2 text-[var(--muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="flex-1 bg-[var(--surface)] rounded-[40px] border border-[var(--border)] overflow-hidden flex flex-col">
                        <div className="p-8 border-b flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black flex items-center gap-3">
                                    <Calendar className="text-[var(--primary)]" />
                                    Visão Geral Mensal (spreadsheet view)
                                </h3>
                                <p className="text-xs font-bold text-[var(--muted)] uppercase mt-1">Legenda por etapa do fluxo</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-500"><div className="w-2 h-2 bg-amber-400 rounded-sm" /> Sugestão</span>
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-500"><div className="w-2 h-2 bg-blue-300 rounded-sm" /> Gestão</span>
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500"><div className="w-2 h-2 bg-emerald-400 rounded-sm" /> RH</span>
                                <span className="flex items-center gap-1.5 text-[9px] font-black uppercase text-purple-500"><div className="w-2 h-2 bg-purple-400 rounded-sm" /> DP</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                            <div className="h-full flex gap-4 min-w-max">
                                {[...Array(12)].map((_, monthIdx) => {
                                    const monthDate = new Date(2026, monthIdx, 1);
                                    const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: '2-digit' });
                                    const monthAbsences = absences.filter(a => {
                                        const date = new Date(a.startDate);
                                        return date.getMonth() === monthIdx && date.getFullYear() === 2026;
                                    });
                                    const stats = getMonthlyStats(monthIdx);

                                    return (
                                        <div key={monthIdx} className="w-80 flex-shrink-0 flex flex-col gap-4">
                                            <div className="bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-700 space-y-2">
                                                <div className="text-center text-[11px] font-black uppercase text-purple-900 dark:text-purple-200">
                                                    {monthLabel}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-lg">
                                                        <p className="text-[8px] font-black uppercase opacity-60">Solicit.</p>
                                                        <p className="text-sm font-black text-purple-600 dark:text-purple-400">{stats.total}</p>
                                                    </div>
                                                    <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-lg">
                                                        <p className="text-[8px] font-black uppercase opacity-60">Pessoas</p>
                                                        <p className="text-sm font-black text-blue-600 dark:text-blue-400">{stats.collaborators}</p>
                                                    </div>
                                                    <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-lg">
                                                        <p className="text-sm font-black uppercase opacity-60">Dias</p>
                                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.totalDays}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 bg-[var(--bgApp)] rounded-2xl border border-[var(--border)] p-2 space-y-2 overflow-y-auto custom-scrollbar">
                                                <div className="grid grid-cols-4 gap-1 text-[8px] font-black uppercase opacity-60 px-2">
                                                    <span className="col-span-1">Nome</span>
                                                    <span className="text-center">Início</span>
                                                    <span className="text-center">Fim</span>
                                                    <span className="text-right">D</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {monthAbsences.length === 0 && <p className="text-[10px] text-center py-4 opacity-30 italic">Sem registros</p>}
                                                    {monthAbsences.map(a => {
                                                        const user = users.find(u => u.id === a.userId);
                                                        const days = calculateDays(a.startDate, a.endDate);
                                                        const bgColor = a.status === 'sugestao' ? '#fbbf24' : a.status === 'aprovada_gestao' ? '#93c5fd' : a.status === 'aprovada_rh' ? '#34d399' : a.status === 'finalizada_dp' ? '#c084fc' : '#f1f5f9';

                                                        return (
                                                            <div
                                                                key={a.id}
                                                                className="grid grid-cols-4 gap-1 p-2 rounded-lg text-[9px] font-bold border border-black/5 shadow-sm"
                                                                style={{ backgroundColor: bgColor }}
                                                            >
                                                                <span className="truncate">{user?.name.split(' ')[0]}</span>
                                                                <span className="text-center font-black">{new Date(a.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                                <span className="text-center font-black">{new Date(a.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                                                <span className="text-right font-black">{days}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'collaborators' && (
                    <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-800 flex items-start gap-4 shadow-sm">
                            <Info className="text-blue-500 shrink-0" />
                            <div className="space-y-2">
                                <p className="text-sm font-black text-blue-900 dark:text-blue-200">Políticas de Férias NIC-LABS</p>
                                <ul className="text-xs space-y-1 text-blue-800 dark:text-blue-300 list-disc pl-4 font-bold">
                                    <li>Solicitações devem ser enviadas com pelo menos <strong>30 dias</strong> de antecedência.</li>
                                    <li>As férias podem ser divididas em até <strong>3 períodos</strong>.</li>
                                    <li>Um período deve ter no mínimo <strong>14 dias corridos</strong>.</li>
                                    <li>Nenhum período pode ser inferior a <strong>5 dias</strong>.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.filter(u => u.active !== false).map(user => {
                                const userAbsences = absences.filter(a => a.userId === user.id && a.type === 'férias' && a.status !== 'rejeitado' && a.status !== 'cancelado');
                                const totalVacationDays = userAbsences.reduce((acc, a) => acc + calculateDays(a.startDate, a.endDate), 0);
                                const has14DayRule = userAbsences.some(a => calculateDays(a.startDate, a.endDate) >= 14);
                                const hasInvalidSmallPeriod = userAbsences.some(a => calculateDays(a.startDate, a.endDate) < 5);

                                return (
                                    <div key={user.id} className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-black">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm">{user.name}</h4>
                                                <p className="text-[10px] text-[var(--muted)] uppercase font-black">{user.cargo}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <p className="text-[10px] font-black uppercase text-[var(--muted)]">Consumo do Saldo (Ano)</p>
                                                <p className="text-xl font-black text-emerald-600">{totalVacationDays} / 30 d</p>
                                            </div>
                                            <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full transition-all duration-700 ease-out" style={{ width: `${Math.min((totalVacationDays / 30) * 100, 100)}%` }} />
                                            </div>

                                            <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase">
                                                    <span>Corredor de 14 dias:</span>
                                                    {has14DayRule ? <span className="text-emerald-500 font-black">OK</span> : <span className="text-amber-500 font-black italic">Aguardando</span>}
                                                </div>
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase">
                                                    <span>Período Mínimo (5 d):</span>
                                                    {hasInvalidSmallPeriod ? <span className="text-red-500 font-black">Irregular</span> : <span className="text-emerald-500 font-black">OK</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <HolidayManager />
                    </div>
                )}

            </div>

            <ConfirmationModal
                isOpen={!!actionModal}
                title={actionModal?.type === 'approve' ? 'Avançar Fluxo' : actionModal?.type === 'reject' ? 'Rejeitar Pedido' : 'Excluir Item'}
                message={actionModal?.type === 'approve' ? 'Confirma a passagem deste pedido para a próxima etapa do fluxo de aprovação?' : 'Esta ação não poderá ser desfeita. Deseja continuar?'}
                onConfirm={handleAction}
                onCancel={() => setActionModal(null)}
                confirmColor={actionModal?.type === 'reject' || actionModal?.type === 'delete' ? 'red' : 'blue'}
            />

            {/* Modal de Solicitação de Férias */}
            <AnimatePresence>
                {showRequestModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRequestModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-[var(--bg)] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl border border-[var(--border)] p-8 custom-scrollbar"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-[var(--text)]">Solicitar Férias / Ausência</h2>
                                    <p className="text-sm font-medium text-[var(--muted)]">Preencha os dados abaixo para enviar sua solicitação ao fluxo de aprovação.</p>
                                </div>
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    className="p-3 hover:bg-[var(--surface-2)] rounded-2xl text-[var(--muted)] transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <AbsenceManager
                                targetUserId={currentUser?.id}
                                targetUserName={currentUser?.name}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RHManagement;

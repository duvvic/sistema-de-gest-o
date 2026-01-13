// src/pages/admin/AdminFullReport.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    exportReportExcel,
    exportReportPowerBI,
    fetchClients,
    fetchCollaborators,
    fetchProjects,
    fetchReportPreview,
    ProjectTotal,
    ReportPreviewResponse,
    ReportRow,
    upsertProjectCost,
} from '@/services/reportApi';
import {
    FileSpreadsheet,
    BarChart3,
    Search,
    Filter,
    Calendar,
    Users,
    Briefcase,
    DollarSign,
    Clock,
    ChevronDown,
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info,
    RefreshCw,
    HelpCircle,
    Download,
    LayoutDashboard,
    User as UserIcon,
    Layers,
    X
} from 'lucide-react';
import { ToastContainer, ToastType } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helpers ---
function formatBRL(v: number | null | undefined) {
    const n = typeof v === 'number' ? v : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatHours(hours: number) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function daysAgoISO(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

// --- Interfaces para a Tabela Hierárquica ---
interface HierarchicalData {
    clients: {
        [id: number]: {
            id: number;
            name: string;
            totalHours: number;
            totalVal: number;
            projects: {
                [id: number]: {
                    id: number;
                    name: string;
                    totalHours: number;
                    totalVal: number;
                    budget: number | null;
                    hourRate: number | null;
                    collaborators: {
                        [id: number]: {
                            id: number;
                            name: string;
                            hours: number;
                            valRateado: number;
                            percentOfProject: number;
                        }
                    }
                }
            }
        }
    };
    totals: {
        hours: number;
        val: number;
        avgRate: number;
    }
}

// --- Componentes Menores ---
const Badge = ({ children, color = 'purple' }: { children: React.ReactNode, color?: 'purple' | 'green' | 'blue' }) => {
    const variants = {
        purple: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
        green: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
        blue: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${variants[color]}`}>
            {children}
        </span>
    );
};

// --- Tela Principal ---
const AdminFullReport: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // Estados de Filtros
    const [startDate, setStartDate] = useState(() => localStorage.getItem('report_startDate') || daysAgoISO(30));
    const [endDate, setEndDate] = useState(() => localStorage.getItem('report_endDate') || todayISO());
    const [clientIds, setClientIds] = useState<number[]>(() => JSON.parse(localStorage.getItem('report_clientIds') || '[]'));
    const [projectIds, setProjectIds] = useState<number[]>(() => JSON.parse(localStorage.getItem('report_projectIds') || '[]'));
    const [collaboratorIds, setCollaboratorIds] = useState<number[]>(() => JSON.parse(localStorage.getItem('report_collaboratorIds') || '[]'));

    // Opções
    const [clientOptions, setClientOptions] = useState<{ id: number; name: string }[]>([]);
    const [projectOptions, setProjectOptions] = useState<{ id: number; name: string; clientId: number }[]>([]);
    const [collaboratorOptions, setCollaboratorOptions] = useState<{ id: number; name: string }[]>([]);

    // Estados da UI
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'powerbi' | null>(null);
    const [reportData, setReportData] = useState<ReportPreviewResponse | null>(null);
    const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
    const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);

    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Persistência
    useEffect(() => {
        localStorage.setItem('report_startDate', startDate);
        localStorage.setItem('report_endDate', endDate);
        localStorage.setItem('report_clientIds', JSON.stringify(clientIds));
        localStorage.setItem('report_projectIds', JSON.stringify(projectIds));
        localStorage.setItem('report_collaboratorIds', JSON.stringify(collaboratorIds));
    }, [startDate, endDate, clientIds, projectIds, collaboratorIds]);

    // Carregar Opções
    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        const load = async () => {
            try {
                const [cls, cols, prjs] = await Promise.all([
                    fetchClients(),
                    fetchCollaborators(),
                    fetchProjects()
                ]);
                setClientOptions(cls);
                setCollaboratorOptions(cols);
                setProjectOptions(prjs);
            } catch (err) {
                console.error('Load Error:', err);
            }
        };
        load();
    }, [currentUser, navigate]);

    // Lógica de Agrupamento Hierárquico
    const groupedData = useMemo(() => {
        if (!reportData) return null;

        const h: HierarchicalData = {
            clients: {},
            totals: { hours: 0, val: 0, avgRate: 0 }
        };

        reportData.rows.forEach(r => {
            // Cliente
            if (!h.clients[r.id_cliente]) {
                h.clients[r.id_cliente] = {
                    id: r.id_cliente,
                    name: r.cliente,
                    totalHours: 0,
                    totalVal: 0,
                    projects: {}
                };
            }
            const cli = h.clients[r.id_cliente];

            // Projeto
            if (!cli.projects[r.id_projeto]) {
                const ptInfo = reportData.projectTotals.find(pt => pt.id_projeto === r.id_projeto);
                cli.projects[r.id_projeto] = {
                    id: r.id_projeto,
                    name: r.projeto,
                    totalHours: 0,
                    totalVal: 0,
                    budget: ptInfo?.valor_projeto ?? null,
                    hourRate: ptInfo?.valor_hora_projeto ?? null,
                    collaborators: {}
                };
            }
            const prj = cli.projects[r.id_projeto];

            // Colaborador
            if (!prj.collaborators[r.id_colaborador]) {
                prj.collaborators[r.id_colaborador] = {
                    id: r.id_colaborador,
                    name: r.colaborador,
                    hours: 0,
                    valRateado: 0,
                    percentOfProject: 0
                };
            }
            const col = prj.collaborators[r.id_colaborador];

            // Soma
            cli.totalHours += r.horas;
            cli.totalVal += (r.valor_rateado ?? 0);
            prj.totalHours += r.horas;
            prj.totalVal += (r.valor_rateado ?? 0);
            col.hours += r.horas;
            col.valRateado += (r.valor_rateado ?? 0);

            h.totals.hours += r.horas;
            h.totals.val += (r.valor_rateado ?? 0);
        });

        // Calcular Percentuais
        Object.values(h.clients).forEach(cli => {
            Object.values(cli.projects).forEach(prj => {
                Object.values(prj.collaborators).forEach(col => {
                    col.percentOfProject = prj.totalHours > 0 ? (col.hours / prj.totalHours) * 100 : 0;
                });
            });
        });

        h.totals.avgRate = h.totals.hours > 0 ? h.totals.val / h.totals.hours : 0;

        return h;
    }, [reportData]);

    const handleApplyFilters = async () => {
        setLoading(true);
        try {
            const resp = await fetchReportPreview({
                startDate,
                endDate,
                clientIds: clientIds.length ? clientIds : undefined,
                projectIds: projectIds.length ? projectIds : undefined,
                collaboratorIds: collaboratorIds.length ? collaboratorIds : undefined
            });
            setReportData(resp);
            addToast('Dados carregados com sucesso!', 'success');
        } catch (err) {
            addToast('Erro ao carregar relatório.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBudget = async (id: number, val: number | null) => {
        try {
            await upsertProjectCost(id, val);
            addToast('Budget atualizado. Recalculando...', 'info');
            handleApplyFilters(); // Recarrega para ver o valor rateado novo
        } catch (err) {
            addToast('Erro ao atualizar custo.', 'error');
        }
    };

    const handleExportExcel = async () => {
        setExporting('excel');
        try {
            const blob = await exportReportExcel({ startDate, endDate, clientIds, projectIds, collaboratorIds });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_analitico_${startDate}_${endDate}.xlsx`;
            a.click();
            addToast('Exportação concluída!', 'success');
        } catch (err) {
            addToast('Erro ao exportar Excel.', 'error');
        } finally {
            setExporting(null);
        }
    };

    const toggleClient = (id: number) => {
        const next = new Set(expandedClients);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedClients(next);
    };

    const toggleProject = (id: number) => {
        const next = new Set(expandedProjects);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedProjects(next);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0d091b] text-slate-100 font-sans p-6 lg:p-10 space-y-8 overflow-x-hidden">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        Relatório Completo <span className="text-purple-500">(Horas & Custos)</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Gestão avançada de rentabilidade e alocação financeira por projeto.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all font-bold text-sm border border-white/5">
                        <HelpCircle className="w-4 h-4" /> Ajuda Admin
                    </button>
                    <button
                        onClick={handleApplyFilters}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all font-black text-sm shadow-lg shadow-purple-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Recalcular
                    </button>
                </div>
            </header>

            {/* --- BLOCO 1: FILTROS --- */}
            <section className="bg-[#161129] border border-white/5 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>

                <div className="flex items-center gap-2 mb-6 text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                    <Filter className="w-4 h-4" /> Filtros de Relatório
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Período */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Período (Início - Fim)</label>
                        <div className="flex bg-[#0d091b] rounded-2xl border border-white/5 overflow-hidden focus-within:border-purple-500/50 transition-colors">
                            <input
                                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-transparent px-4 py-3 text-sm outline-none text-slate-200"
                            />
                            <div className="w-px bg-white/5 my-2"></div>
                            <input
                                type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-transparent px-4 py-3 text-sm outline-none text-slate-200"
                            />
                        </div>
                    </div>

                    {/* Clientes */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Clientes</label>
                        <select
                            className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm appearance-none outline-none focus:border-purple-500/50"
                            onChange={e => setClientIds(e.target.value === 'all' ? [] : [Number(e.target.value)])}
                        >
                            <option value="all">Todos os Clientes</option>
                            {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Projetos */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Projetos</label>
                        <select
                            className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm appearance-none outline-none focus:border-purple-500/50"
                            onChange={e => setProjectIds(e.target.value === 'all' ? [] : [Number(e.target.value)])}
                        >
                            <option value="all">Todos os Projetos</option>
                            {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {/* Colaboradores */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Colaboradores</label>
                        <select
                            className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm appearance-none outline-none focus:border-purple-500/50"
                            onChange={e => setCollaboratorIds(e.target.value === 'all' ? [] : [Number(e.target.value)])}
                        >
                            <option value="all">Todos os Colaboradores</option>
                            {collaboratorOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {reportData ? `Mostrando dados de ${reportData.rows.length} registros encontrados.` : 'Configure os filtros.'}
                    </span>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { setClientIds([]); setProjectIds([]); setCollaboratorIds([]); }}
                            className="text-xs font-black text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                        >
                            Limpar Filtros
                        </button>
                        <button
                            onClick={handleApplyFilters}
                            className="bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-600/10 active:scale-95"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </section>

            {/* --- BLOCO 2: CÁLCULOS E EXPORTAÇÃO --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuração de Valores */}
                <div className="lg:col-span-2 bg-[#161129] border border-white/5 rounded-[32px] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Layers className="w-5 h-5 text-purple-400" />
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Configuração de Valores dos Projetos</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-6">Insira os valores totais para cálculo de rentabilidade por hora.</p>

                    <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {reportData?.projectTotals.map(pt => (
                            <ProjectConfigRow key={pt.id_projeto} pt={pt} onSave={handleUpdateBudget} />
                        ))}
                        {!reportData && <div className="text-xs text-slate-700 italic">Gere o relatório para configurar custos.</div>}
                    </div>
                </div>

                {/* Exportar */}
                <div className="bg-[#161129] border border-white/5 rounded-[32px] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                        <Download className="w-5 h-5 text-purple-400" />
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">Exportar Dados</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-8 leading-relaxed">Gere planilhas detalhadas ou conecte seu dashboard diretamente ao Power BI.</p>

                    <div className="space-y-3">
                        <button
                            onClick={handleExportExcel}
                            disabled={!reportData || exporting === 'excel'}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                            Download Excel (.xlsx)
                        </button>
                        <button
                            onClick={() => addToast('PowerBI export em desenvolvimento.', 'info')}
                            className="w-full flex items-center justify-center gap-3 py-4 border border-purple-600/30 hover:bg-purple-600/5 text-purple-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Export Power BI
                        </button>
                    </div>
                </div>
            </div>

            {/* --- BLOCO 3: VISUALIZAÇÃO EM TEMPO REAL --- */}
            <section className="bg-[#161129] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/10 rounded-xl">
                            <LayoutDashboard className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Visualização em Tempo Real</h3>
                    </div>
                    <Badge color="green">DADOS ATUALIZADOS</Badge>
                </div>

                <div className="overflow-x-auto min-w-[1000px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                <th className="pl-10 py-6">Entidade (Cliente {'>'} Projeto {'>'} Colab.)</th>
                                <th className="px-6 py-6 text-center">Horas</th>
                                <th className="px-6 py-6 text-center">% Projeto</th>
                                <th className="px-6 py-6 text-center">Valor/Hora Eficaz</th>
                                <th className="pr-10 py-6 text-right">Valor Rateado (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {!groupedData && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-700 font-bold italic">Nenhum dado selecionado.</td>
                                </tr>
                            )}
                            {groupedData && Object.values(groupedData.clients).map(cli => (
                                <React.Fragment key={cli.id}>
                                    {/* Linha Cliente */}
                                    <tr className="hover:bg-white/[0.02] cursor-pointer" onClick={() => toggleClient(cli.id)}>
                                        <td className="pl-10 py-5">
                                            <div className="flex items-center gap-3">
                                                {expandedClients.has(cli.id) ? <ChevronDown className="w-4 h-4 text-purple-500" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                                                <Briefcase className="w-4 h-4 text-purple-400/50" />
                                                <span className="font-extrabold text-slate-200">{cli.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center font-black text-slate-400">{formatHours(cli.totalHours)}</td>
                                        <td className="px-6 py-5 text-center px-8">-</td>
                                        <td className="px-6 py-5 text-center">-</td>
                                        <td className="pr-10 py-5 text-right font-black text-white">{formatBRL(cli.totalVal)}</td>
                                    </tr>

                                    {/* Linhas Projeto */}
                                    <AnimatePresence>
                                        {expandedClients.has(cli.id) && Object.values(cli.projects).map(prj => (
                                            <React.Fragment key={prj.id}>
                                                <motion.tr
                                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                                                    className="bg-purple-600/5 hover:bg-purple-600/10 transition-colors cursor-pointer"
                                                    onClick={(e) => { e.stopPropagation(); toggleProject(prj.id); }}
                                                >
                                                    <td className="pl-16 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {expandedProjects.has(prj.id) ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-slate-700" />}
                                                            <Layers className="w-3.5 h-3.5 text-purple-500/50" />
                                                            <span className="text-xs font-black text-purple-300 uppercase tracking-tight">{prj.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{formatHours(prj.totalHours)}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[120px] mx-auto">
                                                            <div className="h-full bg-purple-500" style={{ width: '65%' }}></div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-black text-emerald-400">{formatBRL(prj.hourRate)}</span>
                                                    </td>
                                                    <td className="pr-10 py-4 text-right font-black text-purple-200">{formatBRL(prj.totalVal)}</td>
                                                </motion.tr>

                                                {/* Linhas Colaborador */}
                                                <AnimatePresence>
                                                    {expandedProjects.has(prj.id) && Object.values(prj.collaborators).map(col => (
                                                        <motion.tr
                                                            key={col.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                            className="hover:bg-white/[0.01]"
                                                        >
                                                            <td className="pl-24 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <UserIcon className="w-3 h-3 text-slate-600" />
                                                                    <span className="text-[11px] font-medium text-slate-400">{col.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-3 text-center text-[10px] font-bold text-slate-500">{formatHours(col.hours)}</td>
                                                            <td className="px-6 py-3 text-center text-[10px] font-black text-slate-600">{col.percentOfProject.toFixed(0)}%</td>
                                                            <td className="px-6 py-3 text-center text-[10px]">-</td>
                                                            <td className="pr-10 py-3 text-right text-[11px] font-bold text-slate-400">{formatBRL(col.valRateado)}</td>
                                                        </motion.tr>
                                                    ))}
                                                </AnimatePresence>
                                            </React.Fragment>
                                        ))}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                        {/* Totais Gerais */}
                        {groupedData && (
                            <tfoot className="bg-black/40">
                                <tr className="border-t border-white/10">
                                    <td className="pl-10 py-8">
                                        <span className="text-lg font-black text-white uppercase tracking-tighter">Totais Gerais</span>
                                    </td>
                                    <td className="px-6 py-8 text-center text-lg font-black text-slate-300">{formatHours(groupedData.totals.hours)}</td>
                                    <td className="px-6 py-8 text-center">-</td>
                                    <td className="px-6 py-8 text-center">
                                        <div className="inline-flex flex-col items-center">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Média Útil</span>
                                            <span className="text-sm font-black text-emerald-400">{formatBRL(groupedData.totals.avgRate)}/h</span>
                                        </div>
                                    </td>
                                    <td className="pr-10 py-8 text-right text-2xl font-black text-purple-500">
                                        {formatBRL(groupedData.totals.val)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="p-4 bg-black/20 flex justify-center items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <RefreshCw className="w-3 h-3" /> Sincronizando com timesheet em tempo real..
                </div>
            </section>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

// --- Componente de Linha de Configuração ---
const ProjectConfigRow = ({ pt, onSave }: { pt: ProjectTotal, onSave: (id: number, val: number | null) => void }) => {
    const [val, setVal] = useState(pt.valor_projeto?.toString() || '');
    const [loading, setLoading] = useState(false);

    const handleBlur = async () => {
        const n = val.trim() === '' ? null : Number(val);
        if (n === pt.valor_projeto) return;
        setLoading(true);
        await onSave(pt.id_projeto, n);
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-[#0d091b] rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex-1">
                <div className="text-xs font-black text-slate-200 truncate uppercase tracking-tight">{pt.projeto}</div>
                <div className="text-[10px] font-bold text-slate-600 uppercase">{pt.cliente}</div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600">R$</span>
                    <input
                        type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur}
                        placeholder="0,00"
                        className="w-32 bg-[#161129] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-black text-slate-100 focus:border-purple-500/50 outline-none transition-all"
                    />
                    {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-purple-500" />}
                </div>

                <div className="w-32 text-right">
                    <div className="text-[10px] font-black text-slate-600 uppercase">Est. / Hora</div>
                    <div className="text-sm font-black text-emerald-400">{formatBRL(pt.valor_hora_projeto)}</div>
                </div>
            </div>
        </div>
    );
};

export default AdminFullReport;

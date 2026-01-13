// src/pages/admin/AdminFullReport.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    exportReportExcel,
    exportReportPowerBI,
    fetchClients,
    fetchCollaborators,
    fetchProjects,
    fetchReportPreview,
    fetchTasks,
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
    ArrowRight,
    Loader2,
    Table as TableIcon,
    TrendingUp,
    X,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { ToastContainer, ToastType } from '@/components/Toast';

type Option = { id: number; label: string };
type TaskOption = { id: string; label: string };

function formatBRL(v: number | null | undefined) {
    const n = typeof v === 'number' ? v : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatHoursDecimalToHHMM(hours: number) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const mm = String(m).padStart(2, '0');
    return `${h}:${mm}`;
}

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function daysAgoISO(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function useDebounce<T>(value: T, delay = 400) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

/** MultiSelect simples com chips */
function MultiSelectChips(props: {
    label: string;
    options: Option[];
    selected: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;
}) {
    const { label, options, selected, onChange, placeholder } = props;

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-bold tracking-widest text-slate-300/80 uppercase">{label}</div>

            <select
                multiple
                value={selected.map(String)}
                onChange={(e) => {
                    const ids = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                    onChange(ids);
                }}
                className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-[#1b1530] border border-white/10 text-slate-100 outline-none scrollbar-thin scrollbar-thumb-purple-900"
            >
                {options.length === 0 && (
                    <option disabled value="">{placeholder || 'Sem opções'}</option>
                )}
                {options.map(o => (
                    <option key={o.id} value={o.id} className="py-1 px-2 checked:bg-purple-600/30">
                        {o.label}
                    </option>
                ))}
            </select>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {selected.map(id => {
                        const opt = options.find(o => o.id === id);
                        return (
                            <span key={id} className="text-[10px] px-2 py-1 rounded-full bg-purple-600/20 text-purple-200 border border-purple-500/20 flex items-center gap-1 group">
                                {opt?.label || id}
                                <X
                                    className="w-3 h-3 cursor-pointer hover:text-white"
                                    onClick={() => onChange(selected.filter(i => i !== id))}
                                />
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/** MultiSelect para Tarefas (IDs string) */
function TaskMultiSelect(props: {
    label: string;
    options: TaskOption[];
    selected: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
}) {
    const { label, options, selected, onChange, placeholder } = props;

    return (
        <div className="space-y-2">
            <div className="text-[11px] font-bold tracking-widest text-slate-300/80 uppercase">{label}</div>

            <select
                multiple
                value={selected}
                onChange={(e) => {
                    const ids = Array.from(e.target.selectedOptions).map(o => o.value);
                    onChange(ids);
                }}
                className="w-full min-h-[46px] px-3 py-2 rounded-xl bg-[#1b1530] border border-white/10 text-slate-100 outline-none scrollbar-thin scrollbar-thumb-purple-900"
            >
                {options.length === 0 && (
                    <option disabled value="">{placeholder || 'Sem opções'}</option>
                )}
                {options.map(o => (
                    <option key={o.id} value={o.id} className="py-1 px-2 checked:bg-purple-600/30">
                        {o.label}
                    </option>
                ))}
            </select>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    {selected.map(id => {
                        const opt = options.find(o => o.id === id);
                        return (
                            <span key={id} className="text-[10px] px-2 py-1 rounded-full bg-purple-600/20 text-purple-200 border border-purple-500/20 flex items-center gap-1">
                                {opt?.label || id}
                                <X
                                    className="w-3 h-3 cursor-pointer hover:text-white"
                                    onClick={() => onChange(selected.filter(i => i !== id))}
                                />
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ExcelLikePreview(props: { preview: ReportPreviewResponse | null }) {
    const { preview } = props;

    if (!preview) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[#141027] p-6 text-slate-300">
                Aplique filtros para gerar a prévia do relatório.
            </div>
        );
    }

    const rows = preview.rows || [];
    const totalHoras = preview.totals?.horas_total ?? 0;
    const totalValor = preview.totals?.valor_total_rateado ?? null;

    return (
        <div className="rounded-2xl border border-white/10 bg-[#141027] p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-lg font-extrabold text-white">Prévia (estilo Excel)</div>
                    <div className="text-xs text-slate-400">
                        Atualizado em: {new Date(preview.generatedAt).toLocaleString('pt-BR')}
                    </div>
                </div>

                <div className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">
                    DADOS ATUALIZADOS
                </div>
            </div>

            {/* "Planilha" */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                {/* Barra superior tipo Excel */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-200 bg-slate-50">
                    <span className="text-[11px] font-bold text-slate-700">Relatorio.xlsx</span>
                    <span className="text-[11px] text-slate-500">Sheet: Horas & Custos</span>
                </div>

                {/* Tabela com rolagem */}
                <div className="max-h-[420px] overflow-auto">
                    <table className="min-w-[1100px] w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-100">
                            <tr className="text-slate-700">
                                <th className="border border-slate-200 px-3 py-2 text-left w-[60px]">#</th>
                                <th className="border border-slate-200 px-3 py-2 text-left">Cliente</th>
                                <th className="border border-slate-200 px-3 py-2 text-left">Projeto</th>
                                <th className="border border-slate-200 px-3 py-2 text-left">Colaborador</th>
                                <th className="border border-slate-200 px-3 py-2 text-left">Tarefa</th>
                                <th className="border border-slate-200 px-3 py-2 text-right">Horas</th>
                                <th className="border border-slate-200 px-3 py-2 text-right">Valor Projeto (R$)</th>
                                <th className="border border-slate-200 px-3 py-2 text-right">Valor/Hora (R$)</th>
                                <th className="border border-slate-200 px-3 py-2 text-right">Valor Rateado (R$)</th>
                            </tr>
                        </thead>

                        <tbody className="text-slate-800">
                            {rows.length === 0 && (
                                <tr>
                                    <td className="border border-slate-200 px-3 py-3 text-slate-500" colSpan={9}>
                                        Nenhum dado encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            )}

                            {rows.map((r, idx) => (
                                <tr key={`${r.id_cliente}-${r.id_projeto}-${r.id_colaborador}-${r.tarefa ?? 'null'}-${idx}`}>
                                    <td className="border border-slate-200 px-3 py-2 text-slate-500">{idx + 1}</td>
                                    <td className="border border-slate-200 px-3 py-2">{r.cliente}</td>
                                    <td className="border border-slate-200 px-3 py-2">{r.projeto}</td>
                                    <td className="border border-slate-200 px-3 py-2">{r.colaborador}</td>
                                    <td className="border border-slate-200 px-3 py-2">{r.tarefa ?? '-'}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-right">{r.horas.toFixed(2)}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(r.valor_projeto)}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(r.valor_hora_projeto)}</td>
                                    <td className="border border-slate-200 px-3 py-2 text-right">{formatBRL(r.valor_rateado)}</td>
                                </tr>
                            ))}

                            {/* Linha de totais */}
                            <tr className="bg-slate-100 font-extrabold">
                                <td className="border border-slate-200 px-3 py-2 text-slate-700" colSpan={5}>
                                    TOTAIS
                                </td>
                                <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">
                                    {totalHoras.toFixed(2)}
                                </td>
                                <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">
                                    -
                                </td>
                                <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">
                                    -
                                </td>
                                <td className="border border-slate-200 px-3 py-2 text-right text-slate-700">
                                    {formatBRL(totalValor)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Rodapé tipo “aba” */}
                <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-200 bg-slate-50">
                    <span className="text-[11px] px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-700 font-bold">
                        Horas & Custos
                    </span>
                    <span className="text-[11px] text-slate-500">Preview = export</span>
                </div>
            </div>
        </div>
    );
}

const AdminFullReport: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // Estados dos Filtros (com persistência)
    const [startDate, setStartDate] = useState(() => localStorage.getItem('report_startDate') || daysAgoISO(30));
    const [endDate, setEndDate] = useState(() => localStorage.getItem('report_endDate') || todayISO());
    const [clientIds, setClientIds] = useState<number[]>(() => JSON.parse(localStorage.getItem('report_clientIds') || '[]'));
    const [projectIds, setProjectIds] = useState<number[]>(() => JSON.parse(localStorage.getItem('report_projectIds') || '[]'));
    const [collaboratorIds, setCollaboratorIds] = useState<number[]>(() => JSON.parse(localStorage.getItem('report_collaboratorIds') || '[]'));
    const [taskIds, setTaskIds] = useState<string[]>([]);

    useEffect(() => {
        document.title = 'Relatório Master | Inteligência Financeira';
    }, []);

    // Persistir filtros ao mudar
    useEffect(() => {
        localStorage.setItem('report_startDate', startDate);
        localStorage.setItem('report_endDate', endDate);
        localStorage.setItem('report_clientIds', JSON.stringify(clientIds));
        localStorage.setItem('report_projectIds', JSON.stringify(projectIds));
        localStorage.setItem('report_collaboratorIds', JSON.stringify(collaboratorIds));
    }, [startDate, endDate, clientIds, projectIds, collaboratorIds]);

    // Opções de seletores
    const [clientOptions, setClientOptions] = useState<Option[]>([]);
    const [projectOptions, setProjectOptions] = useState<Option[]>([]);
    const [collaboratorOptions, setCollaboratorOptions] = useState<Option[]>([]);
    const [taskOptions, setTaskOptions] = useState<TaskOption[]>([]);

    // Dados do Relatório
    const [reportData, setReportData] = useState<ReportPreviewResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'powerbi' | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'costs'>('preview');

    // Toasts state
    const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Carregamento Inicial
    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }

        const loadInitial = async () => {
            try {
                const [cls, cols] = await Promise.all([
                    fetchClients(),
                    fetchCollaborators()
                ]);
                setClientOptions(cls.map(c => ({ id: c.id, label: c.name })));
                setCollaboratorOptions(cols.map(c => ({ id: c.id, label: c.name })));
            } catch (err) {
                console.error('Erro ao carregar opções iniciais:', err);
            }
        };
        loadInitial();
    }, [currentUser, navigate]);

    // Carregar Projetos (Cascata)
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const prjs = await fetchProjects(clientIds.length > 0 ? clientIds : undefined);
                setProjectOptions(prjs.map(p => ({ id: p.id, label: p.name })));
                // Resetar ids de projetos que não pertencem mais aos clientes selecionados
                setProjectIds(prev => prev.filter(id => prjs.some(p => p.id === id)));
            } catch (err) {
                console.error('Erro ao buscar projetos:', err);
            }
        };
        loadProjects();
    }, [clientIds]);

    // Carregar Tarefas (Cascata)
    useEffect(() => {
        const loadTasksData = async () => {
            try {
                const tsks = await fetchTasks(projectIds.length > 0 ? projectIds : undefined);
                setTaskOptions(tsks.map(t => ({ id: t.id, label: t.name })));
                setTaskIds(prev => prev.filter(id => tsks.some(t => t.id === id)));
            } catch (err) {
                console.error('Erro ao buscar tarefas:', err);
            }
        };
        loadTasksData();
    }, [projectIds]);

    const handlePreview = async () => {
        setLoading(true);
        try {
            const resp = await fetchReportPreview({
                startDate,
                endDate,
                clientIds: clientIds.length > 0 ? clientIds : undefined,
                projectIds: projectIds.length > 0 ? projectIds : undefined,
                collaboratorIds: collaboratorIds.length > 0 ? collaboratorIds : undefined,
                taskIds: taskIds.length > 0 ? taskIds : undefined,
            });
            setReportData(resp);
            addToast('Relatório gerado com sucesso!', 'success');
        } catch (err: any) {
            console.error('Erro ao gerar prévia:', err);
            addToast('Ocorreu um erro ao processar os dados do relatório.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type: 'excel' | 'powerbi') => {
        setExporting(type);
        try {
            const filters = {
                startDate,
                endDate,
                clientIds: clientIds.length > 0 ? clientIds : undefined,
                projectIds: projectIds.length > 0 ? projectIds : undefined,
                collaboratorIds: collaboratorIds.length > 0 ? collaboratorIds : undefined,
                taskIds: taskIds.length > 0 ? taskIds : undefined,
            };

            const blob = type === 'excel'
                ? await exportReportExcel(filters)
                : await exportReportPowerBI(filters);

            downloadBlob(blob, `relatorio-${type}-${todayISO()}.${type === 'excel' ? 'xlsx' : 'json'}`);
        } catch (err) {
            console.error(`Erro ao exportar ${type}:`, err);
            addToast(`Não foi possível gerar a exportação para ${type}.`, 'error');
        } finally {
            setExporting(null);
        }
    };

    const handleUpdateCost = async (id: number, val: number | null) => {
        try {
            await upsertProjectCost(id, val);
            // Atualizar localmente se já tiver dados carregados
            if (reportData) {
                // Opção: regerar preview ou atualizar o item no array projectTotals
                const newTotals = reportData.projectTotals.map(pt =>
                    pt.id_projeto === id ? { ...pt, valor_projeto: val } : pt
                );
                setReportData({ ...reportData, projectTotals: newTotals });
            }
            addToast('Custos do projeto atualizados com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao atualizar custo:', err);
            addToast('Falha técnica ao tentar salvar o budget do projeto.', 'error');
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0f0a1e] text-slate-100 overflow-hidden font-sans">
            {/* Header */}
            <header className="px-8 py-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#161129]/50 backdrop-blur-xl shrink-0">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                        Inteligência Financeira & Gestão
                    </h1>
                    <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest opacity-60">Consolidação estratégica de horas e rateios</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={!reportData || exporting !== null}
                        className="px-5 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-600/20 rounded-xl transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                        {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                        Exportar Excel
                    </button>
                    <button
                        onClick={() => handleExport('powerbi')}
                        disabled={!reportData || exporting !== null}
                        className="px-5 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/20 rounded-xl transition-all flex items-center gap-2 text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                        {exporting === 'powerbi' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                        Vincular PowerBI
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar Filtros */}
                <aside className="w-80 border-r border-white/5 bg-[#120d24] p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar shrink-0">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 pb-2 border-b border-white/5">
                        <Filter className="w-3.5 h-3.5" /> Controle de Filtros
                    </div>

                    <div className="space-y-5">
                        {/* Datas */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold tracking-widest text-slate-300/80 uppercase">Início</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 group-focus-within:text-purple-300" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full bg-[#1b1530] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-600/50 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold tracking-widest text-slate-300/80 uppercase">Fim</label>
                                <div className="relative group">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 group-focus-within:text-purple-300" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full bg-[#1b1530] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-purple-600/50 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Selects */}
                        <MultiSelectChips
                            label="Clientes"
                            options={clientOptions}
                            selected={clientIds}
                            onChange={setClientIds}
                            placeholder="Todos os clientes"
                        />

                        <MultiSelectChips
                            label="Projetos"
                            options={projectOptions}
                            selected={projectIds}
                            onChange={setProjectIds}
                            placeholder="Todos os projetos"
                        />

                        <MultiSelectChips
                            label="Equipe"
                            options={collaboratorOptions}
                            selected={collaboratorIds}
                            onChange={setCollaboratorIds}
                            placeholder="Todos os membros"
                        />

                        <TaskMultiSelect
                            label="Tarefas Específicas"
                            options={taskOptions}
                            selected={taskIds}
                            onChange={setTaskIds}
                            placeholder="Todas as tarefas"
                        />
                    </div>

                    <button
                        onClick={handlePreview}
                        disabled={loading}
                        className="mt-4 w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        {loading ? 'GERANDO...' : 'CONSULTAR DADOS'}
                    </button>

                    {reportData && (
                        <button
                            onClick={() => {
                                setClientIds([]);
                                setProjectIds([]);
                                setCollaboratorIds([]);
                                setTaskIds([]);
                                setReportData(null);
                            }}
                            className="w-full py-2 text-[10px] font-black uppercase text-slate-500 hover:text-red-400 transition-colors"
                        >
                            Limpar todos os filtros
                        </button>
                    )}
                </aside>

                {/* Conteúdo Principal */}
                <main className="flex-1 flex flex-col overflow-hidden relative p-8">
                    {/* Tabs Navegação */}
                    <div className="flex gap-2 p-1 bg-[#161129] border border-white/5 rounded-2xl w-fit mb-8 shrink-0">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'preview'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <TableIcon className="w-4 h-4" />
                            Relatório Master
                        </button>
                        <button
                            onClick={() => setActiveTab('costs')}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'costs'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <DollarSign className="w-4 h-4" />
                            Gestão de Custo/h
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
                        {!reportData && !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-[#161129]/30 rounded-[40px] border border-dashed border-white/5">
                                <div className="p-8 bg-purple-600/10 rounded-full mb-8">
                                    <BarChart3 className="w-20 h-20 text-purple-600/30" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-200">Pronto para Análise</h2>
                                <p className="text-slate-500 max-w-sm mt-2 text-sm">Utilize os filtros laterais para consolidar as informações de tempo e valores rateados.</p>
                                <button
                                    onClick={handlePreview}
                                    className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    Carregar Dados Recentes
                                </button>
                            </div>
                        )}

                        {loading && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                <div className="relative">
                                    <Loader2 className="w-16 h-16 text-purple-600 animate-spin" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-purple-400/50" />
                                    </div>
                                </div>
                                <h2 className="text-xl font-black text-slate-200 mt-6 uppercase tracking-widest italic">Processando Inteligência...</h2>
                            </div>
                        )}

                        {reportData && !loading && activeTab === 'preview' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <ExcelLikePreview preview={reportData} />
                            </div>
                        )}

                        {reportData && !loading && activeTab === 'costs' && (
                            <div className="bg-[#161129]/50 border border-white/5 rounded-[32px] overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-xl">
                                <div className="p-8 border-b border-white/5">
                                    <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">Variáveis de Custo de Projeto</h3>
                                    <p className="text-xs text-slate-500 font-medium">Insira o valor bruto do contrato para calcular o rateio por hora trabalhada</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-black/20 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                                <th className="pl-8 pr-4 py-6">Nome do Projeto</th>
                                                <th className="px-4 py-6 text-center">Carga Total (H)</th>
                                                <th className="px-4 py-6">Valor Contrato (R$)</th>
                                                <th className="px-4 py-6 text-center font-black">Custo/Hora Atual</th>
                                                <th className="pl-4 pr-8 py-6 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {reportData.projectTotals.map((pt) => (
                                                <ProjectCostRow
                                                    key={pt.id_projeto}
                                                    pt={pt}
                                                    onUpdate={handleUpdateCost}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <ToastContainer toasts={toasts} removeToast={removeToast} />
                </main>
            </div >
        </div >
    );
};

interface ProjectCostRowProps {
    pt: ProjectTotal;
    onUpdate: (id: number, val: number | null) => Promise<void>;
}

const ProjectCostRow: React.FC<ProjectCostRowProps> = ({ pt, onUpdate }) => {
    const [inputValue, setInputValue] = useState(pt.valor_projeto?.toString() || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const num = inputValue.trim() === '' ? null : Number(inputValue);
            await onUpdate(pt.id_projeto, num);
        } catch (err) {
            // Error already handled by parent toast
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr className="hover:bg-white/[0.02] transition-colors group">
            <td className="pl-8 pr-4 py-6">
                <span className="block text-sm font-bold text-slate-200 group-hover:text-purple-400 transition-colors uppercase tracking-tight">{pt.projeto}</span>
                <span className="block text-[10px] font-bold text-slate-600 mt-0.5">{pt.cliente}</span>
            </td>
            <td className="px-4 py-6 text-center">
                <div className="inline-flex flex-col items-center">
                    <span className="text-sm font-black text-slate-300">{pt.horas_projeto_total.toFixed(1)}</span>
                    <span className="text-[9px] font-black text-slate-600 uppercase">Horas</span>
                </div>
            </td>
            <td className="px-4 py-6">
                <div className="relative group/input max-w-[180px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500">R$</span>
                    <input
                        type="number"
                        step="0.01"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder="0.00"
                        onBlur={handleSave}
                        onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                        disabled={saving}
                        className="w-full pl-9 pr-3 py-2 bg-[#1b1530] border border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-purple-600/50 text-sm font-black text-slate-100 transition-all placeholder:text-slate-700"
                    />
                </div>
            </td>
            <td className="px-4 py-6 text-center">
                {pt.valor_hora_projeto ? (
                    <div className="inline-flex flex-col items-center px-4 py-1.5 bg-emerald-600/10 border border-emerald-600/20 rounded-full">
                        <span className="text-xs font-black text-emerald-400">{formatBRL(pt.valor_hora_projeto)}</span>
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Por Hora</span>
                    </div>
                ) : (
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Pendente</span>
                )}
            </td>
            <td className="pl-4 pr-8 py-6 text-right">
                {saving ? (
                    <Loader2 className="w-4 h-4 text-purple-600 animate-spin ml-auto" />
                ) : pt.valor_projeto ? (
                    <div className="inline-flex items-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Definido
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-1.5 text-slate-600 font-black text-[9px] uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> Vazio
                    </div>
                )}
            </td>
        </tr>
    );
};

export default AdminFullReport;

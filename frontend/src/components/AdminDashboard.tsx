import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useDataController } from '@/controllers/useDataController';
import { Client, Project, Task } from "@/types";
import { Plus, Building2, ArrowDownAZ, Briefcase, LayoutGrid, List, Edit2, CheckSquare, ChevronDown, Filter, Clock, AlertCircle, ArrowUp, Trash2, DollarSign, TrendingUp, BarChart, Users, PieChart, ArrowRight, Layers, FileSpreadsheet, X } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from "framer-motion";

type SortOption = 'recent' | 'alphabetical' | 'creation';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients, projects, tasks, error, loading, users, deleteProject } = useDataController();
  const { currentUser, isAdmin } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>(() => (localStorage.getItem('admin_clients_sort_by') as SortOption) || 'alphabetical');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'late' | 'ongoing' | 'done'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('admin_clients_view_mode') as 'grid' | 'list') || 'grid';
  });

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('admin_clients_view_mode', mode);
  };

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    localStorage.setItem('admin_clients_sort_by', option);
    setShowSortMenu(false);
  };

  // Data handling moved to useDataController

  // Painel de debug

  // Proteção contra undefined
  const safeClients = clients || [];
  const safeProjects = projects || [];
  const safeTasks = tasks || [];

  // Realtime handling should be done in useDataController or hooks/useAppData to maintain normalization.
  // Removing local broken realtime logic.

  const activeClients = useMemo(() =>
    safeClients.filter(c => c.active !== false && c.tipo_cliente !== 'parceiro'),
    [safeClients]
  );

  // Tarefa mais recente de um cliente
  const getMostRecentTaskDate = (clientId: string): Date | null => {
    const clientTasks = safeTasks.filter(t => t.clientId === clientId);
    if (clientTasks.length === 0) return null;

    const dates = clientTasks
      .map(t => t.actualStart)
      .filter(Boolean)
      .map(d => new Date(d!));

    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  // Filtrar e Ordenar clientes
  const filteredSortedClients = useMemo(() => {
    let result = [...activeClients];

    // Aplicar Filtro de Status de Tarefa
    if (taskStatusFilter !== 'all') {
      result = result.filter(client => {
        const clientTasks = safeTasks.filter(t => t.clientId === client.id);
        if (taskStatusFilter === 'late') {
          return clientTasks.some(t => {
            if (t.status === 'Done' || t.status === 'Review') return false;
            if (!t.estimatedDelivery) return false;
            return (t.daysOverdue ?? 0) > 0;
          });
        }
        if (taskStatusFilter === 'ongoing') {
          return clientTasks.some(t => t.status === 'In Progress');
        }
        if (taskStatusFilter === 'done') {
          const clientProjects = safeProjects.filter(p => p.clientId === client.id);
          return clientProjects.some(p => p.status === 'Concluído');
        }
        return true;
      });
    }

    // Aplicar Ordenação
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'creation':
          return a.id.localeCompare(b.id);
        case 'recent':
        default:
          const dateA = getMostRecentTaskDate(a.id);
          const dateB = getMostRecentTaskDate(b.id);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
      }
    });
  }, [activeClients, sortBy, taskStatusFilter, safeTasks, safeProjects]);

  // Filtros Executivos (Excel-like)
  const [executiveFilters, setExecutiveFilters] = useState<{
    partner: string[];
    client: string[];
    project: string[];
  }>({ partner: [], client: [], project: [] });

  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

  const filteredExecutiveProjects = useMemo(() => {
    return safeProjects.filter(p => {
      const partnerName = safeClients.find(c => c.id === p.partnerId)?.name || 'N/A';
      const clientName = safeClients.find(c => c.id === p.clientId)?.name || '-';

      if (executiveFilters.partner.length > 0 && !executiveFilters.partner.includes(partnerName)) return false;
      if (executiveFilters.client.length > 0 && !executiveFilters.client.includes(clientName)) return false;
      if (executiveFilters.project.length > 0 && !executiveFilters.project.includes(p.name)) return false;

      return true;
    });
  }, [safeProjects, safeClients, executiveFilters]);

  const uniqueValues = useMemo(() => {
    return {
      partner: Array.from(new Set(safeProjects.map(p => safeClients.find(c => c.id === p.partnerId)?.name || 'N/A'))).sort(),
      client: Array.from(new Set(safeProjects.map(p => safeClients.find(c => c.id === p.clientId)?.name || '-'))).sort(),
      project: Array.from(new Set(safeProjects.map(p => p.name))).sort(),
    };
  }, [safeProjects, safeClients]);

  const toggleExecutiveFilter = (column: 'partner' | 'client' | 'project', value: string) => {
    setExecutiveFilters(prev => {
      const current = prev[column];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [column]: next };
    });
  };

  // Cálculos Executivos do Portfólio
  const { timesheetEntries: portfolioTimesheets } = useDataController();

  const executiveMetrics = useMemo(() => {
    // Usar PROJETOS FILTRADOS para os cálculos e cards
    const projectsToUse = filteredExecutiveProjects;
    if (!projectsToUse.length) return null;

    // 1. Financeiro Global
    let totalBudgeted = 0;
    let totalCommitted = 0;
    let totalForecastedFinish = 0;

    // 2. Progresso Global (Ponderado por Horas Estimadas)
    let totalPortfolioEstimatedHours = 0;
    let totalPortfolioWeightedProgress = 0;

    projectsToUse.forEach(project => {
      totalBudgeted += project.valor_total_rs || 0;

      const projectTasks = safeTasks.filter(t => t.projectId === project.id);
      const pTimesheets = portfolioTimesheets.filter(e => e.projectId === project.id);

      // Custo do Projeto
      const projectCost = pTimesheets.reduce((acc, entry) => {
        const u = users.find(user => user.id === entry.userId);
        return acc + (entry.totalHours * (u?.hourlyCost || 0));
      }, 0);
      totalCommitted += projectCost;

      // Progresso Real do Projeto (Média Simples das Tarefas - Regra de Negócio)
      const projectProgress = projectTasks.length > 0
        ? projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / projectTasks.length
        : 0;

      totalPortfolioWeightedProgress += projectProgress;

      // Previsão para terminar (Simplificado)
      const remainingHours = projectTasks.reduce((acc, t) => acc + ((t.estimatedHours || 0) * (1 - (t.progress || 0) / 100)), 0);
      totalForecastedFinish += (remainingHours * 150); // Fallback rate
    });

    const globalProgress = projectsToUse.length > 0
      ? totalPortfolioWeightedProgress / projectsToUse.length
      : 0;

    return {
      totalBudgeted,
      totalCommitted,
      totalEstimatedROI: totalBudgeted - (totalCommitted + totalForecastedFinish),
      globalProgress,
      activeProjectsCount: projectsToUse.filter(p => p.status !== 'Concluído').length,
      delayedTasksCount: safeTasks.filter(t =>
        projectsToUse.some(p => p.id === t.projectId) &&
        (t.daysOverdue ?? 0) > 0 &&
        t.status !== 'Done'
      ).length
    };
  }, [safeProjects, safeTasks, portfolioTimesheets, users, filteredExecutiveProjects]);

  // --- CONTROLE DE MÊS DA CAPACIDADE ---
  const [capacityMonth, setCapacityMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7); // YYYY-MM
  });

  const resourceMetrics = useMemo(() => {
    if (!users || !portfolioTimesheets) return [];

    return users.filter(u => u.active !== false).map(u => {
      // Cálculo: Alocado = Soma das horas apontadas no mês SELECIONADO
      const userMonthEntries = portfolioTimesheets.filter(entry =>
        entry.userId === u.id &&
        entry.date.startsWith(capacityMonth)
      );

      const assignedHours = userMonthEntries.reduce((acc, entry) => acc + Number(entry.totalHours || 0), 0);
      const capacity = u.monthlyAvailableHours || 160;

      return {
        id: u.id,
        name: u.name,
        torre: u.torre,
        capacity: capacity,
        assigned: Math.round(assignedHours),
        load: (assignedHours / capacity) * 100
      };
    }).sort((a, b) => b.load - a.load);
  }, [users, portfolioTimesheets, capacityMonth]);

  const changeMonth = (delta: number) => {
    const [year, month] = capacityMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + delta, 1);
    const newMonthStr = newDate.toISOString().slice(0, 7);
    setCapacityMonth(newMonthStr);
  };


  const activeTab = (searchParams.get('tab') as 'operacional' | 'executivo' | 'capacidade') || 'operacional';

  // Efeito para fechar o sidebar quando entra no modo executivo
  useEffect(() => {
    if (activeTab === 'executivo') {
      window.dispatchEvent(new CustomEvent('closeSidebar'));
    }
  }, [activeTab]);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Scroll automático para a direita no modo executivo
  useEffect(() => {
    if (activeTab === 'executivo' && tableContainerRef.current) {
      const container = tableContainerRef.current;
      // Pequeno delay para garantir que o DOM renderizou as colunas
      setTimeout(() => {
        container.scrollLeft = container.scrollWidth;
      }, 100);
    }
  }, [activeTab]);


  return (
    <div className="h-full flex flex-col p-0 overflow-y-auto no-scrollbar" style={{ backgroundColor: 'var(--bg)' }}>
      {/* NAVEGAÇÃO DE SUB-MENUS (VERSÃO COMPACTA & FUNCIONAL) */}
      <div className="px-6 py-2 bg-[var(--bg)] sticky top-0 z-50 border-b border-[var(--border)]">
        <div className="flex bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)] w-fit">
          <button
            onClick={() => setActiveTab('operacional')}
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'operacional'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
          >
            Operacional
          </button>

          <button
            onClick={() => setActiveTab('executivo')}
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'executivo'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
          >
            Executivo
          </button>

          <button
            onClick={() => setActiveTab('capacidade')}
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'capacidade'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
              }`}
          >
            Capacidade
          </button>
        </div>
      </div>

      {activeTab === 'executivo' && executiveMetrics && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
          {/* EXECUTIVE KPIs AND FILTERS CONTROL */}
          <div className="bg-[var(--surface-2)] border-b border-[var(--border)] p-4">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 flex-1">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Vendido Total</p>
                  <p className="text-xl font-black text-[var(--text)] font-mono">{executiveMetrics.totalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Custo Real (Acum.)</p>
                  <p className="text-xl font-black text-amber-500 font-mono">{executiveMetrics.totalCommitted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Resultado Est.</p>
                  <p className={`text-xl font-black font-mono ${executiveMetrics.totalEstimatedROI < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {executiveMetrics.totalEstimatedROI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Progresso Médio</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-black text-blue-500 font-mono">{Math.round(executiveMetrics.globalProgress)}%</p>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden lg:block">
                      <div className="h-full bg-blue-500" style={{ width: `${executiveMetrics.globalProgress}%` }} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1.5">Ativos / Atrasados</p>
                  <p className="text-xl font-black text-[var(--text)]">
                    {executiveMetrics.activeProjectsCount} <span className="text-xs text-slate-400 font-bold ml-1">Ativos</span>
                    {executiveMetrics.delayedTasksCount > 0 && (
                      <span className="text-red-500 ml-2">/ {executiveMetrics.delayedTasksCount} <span className="text-xs font-bold">Atrasos</span></span>
                    )}
                  </p>
                </div>
              </div>

              {/* CLEAR FILTERS */}
              {(executiveFilters.partner.length > 0 || executiveFilters.client.length > 0 || executiveFilters.project.length > 0) && (
                <button
                  onClick={() => setExecutiveFilters({ partner: [], client: [], project: [] })}
                  className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-purple-600/20"
                >
                  <X size={14} /> Limpar Filtros
                </button>
              )}
            </div>
          </div>

          <div className="p-0 border-t border-[var(--border)] transition-all overflow-hidden flex flex-col flex-1" style={{ backgroundColor: 'var(--surface)' }}>
            <div
              ref={tableContainerRef}
              className="flex-1 overflow-auto custom-scrollbar relative font-sans text-xs"
            >
              <table className="w-full text-left border-collapse min-w-[2000px] table-fixed">
                <thead className="sticky top-0 z-40 bg-[var(--surface-2)]">
                  <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {/* CHECKBOX GMAIL STYLE */}
                    <th className="p-3 sticky left-0 z-50 w-10 bg-[var(--surface-2)] shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center">
                      <input type="checkbox" className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
                    </th>

                    {/* FIXED COLUMNS - REDUCED WIDTHS & CORRECT OFFSETS */}
                    <th className="p-3 sticky left-10 z-50 shadow-[2px_0_10px_rgba(0,0,0,0.1)] w-[110px] bg-[var(--surface-2)] border-r border-white/5">
                      <div className="flex items-center justify-between group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setActiveFilterColumn(activeFilterColumn === 'partner' ? null : 'partner'); }}>
                        <span>Parceiro</span>
                        <Filter className={`w-3 h-3 ${executiveFilters.partner.length > 0 ? 'text-[var(--primary)] opacity-100' : 'text-slate-500 opacity-20 group-hover:opacity-100 transition-opacity'}`} />

                        {activeFilterColumn === 'partner' && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto cursor-default" onClick={e => e.stopPropagation()}>
                            {uniqueValues.partner.map(val => (
                              <div key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => toggleExecutiveFilter('partner', val)}>
                                <div className={`w-3 h-3 border rounded flex items-center justify-center ${executiveFilters.partner.includes(val) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-slate-500'}`}>
                                  {executiveFilters.partner.includes(val) && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                                </div>
                                <span className="text-xs font-medium truncate text-[var(--text)]">{val}</span>
                              </div>
                            ))}
                            {uniqueValues.partner.length === 0 && <span className="text-xs p-2 opacity-50 block">Sem dados</span>}
                          </div>
                        )}
                      </div>
                    </th>

                    <th className="p-3 sticky left-[150px] z-50 shadow-[2px_0_10px_rgba(0,0,0,0.1)] w-[140px] bg-[var(--surface-2)] border-r border-white/5">
                      <div className="flex items-center justify-between group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setActiveFilterColumn(activeFilterColumn === 'client' ? null : 'client'); }}>
                        <span>Cliente</span>
                        <Filter className={`w-3 h-3 ${executiveFilters.client.length > 0 ? 'text-[var(--primary)] opacity-100' : 'text-slate-500 opacity-20 group-hover:opacity-100 transition-opacity'}`} />

                        {activeFilterColumn === 'client' && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto cursor-default" onClick={e => e.stopPropagation()}>
                            {uniqueValues.client.map(val => (
                              <div key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => toggleExecutiveFilter('client', val)}>
                                <div className={`w-3 h-3 border rounded flex items-center justify-center ${executiveFilters.client.includes(val) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-slate-500'}`}>
                                  {executiveFilters.client.includes(val) && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                                </div>
                                <span className="text-xs font-medium truncate text-[var(--text)]">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>

                    <th className="p-3 sticky left-[290px] z-50 shadow-[4px_0_15px_rgba(0,0,0,0.15)] w-[180px] bg-[var(--surface-2)]">
                      <div className="flex items-center justify-between group cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setActiveFilterColumn(activeFilterColumn === 'project' ? null : 'project'); }}>
                        <span>Projeto</span>
                        <Filter className={`w-3 h-3 ${executiveFilters.project.length > 0 ? 'text-[var(--primary)] opacity-100' : 'text-slate-500 opacity-20 group-hover:opacity-100 transition-opacity'}`} />

                        {activeFilterColumn === 'project' && (
                          <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto cursor-default" onClick={e => e.stopPropagation()}>
                            {uniqueValues.project.map(val => (
                              <div key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer" onClick={() => toggleExecutiveFilter('project', val)}>
                                <div className={`w-3 h-3 border rounded flex items-center justify-center ${executiveFilters.project.includes(val) ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-slate-500'}`}>
                                  {executiveFilters.project.includes(val) && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
                                </div>
                                <span className="text-xs font-medium truncate text-[var(--text)]">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>

                    {/* SCROLLABLE COLUMNS */}
                    {/* SEÇÃO PREVISTO */}
                    <th className="p-3 w-[130px] border-r border-white/10 bg-blue-500/5 text-blue-400">Status P.</th>
                    <th className="p-3 w-[100px] bg-blue-500/5 text-blue-400">Início P.</th>
                    <th className="p-3 w-[100px] bg-blue-500/5 text-blue-400 text-center">Fim P.</th>
                    <th className="p-3 w-[110px] border-r border-white/10 bg-blue-500/5 text-blue-400">Progresso P.</th>

                    {/* SEÇÃO REAL */}
                    <th className="p-3 w-[110px] bg-emerald-500/5 text-emerald-400">Status R.</th>
                    <th className="p-3 w-[100px] bg-emerald-500/5 text-emerald-400">Início R.</th>
                    <th className="p-3 w-[100px] bg-emerald-500/5 text-emerald-400">Fim R.</th>
                    <th className="p-3 w-[110px] border-r border-white/10 bg-emerald-500/5 text-emerald-400">Progresso R.</th>

                    {/* SEÇÃO ANÁLISE */}
                    {/* SEÇÃO TEMPO (NOVAS COLUNAS) */}
                    <th className="p-3 w-[80px] bg-amber-500/5 text-amber-400 font-bold border-l border-white/5">Horas P.</th>
                    <th className="p-3 w-[80px] bg-amber-500/5 text-amber-400 font-bold border-r border-white/5">Horas R.</th>

                    {/* SEÇÃO ANÁLISE (FINANCEIRO) */}
                    <th className="p-3 w-[120px] bg-amber-500/5 text-amber-400">Vendido</th>
                    <th className="p-3 w-[120px] bg-amber-500/5 text-amber-400">Custo Real</th>
                    {/* <th className="p-3 w-[140px] bg-amber-500/5 text-amber-400">Custo Proj.</th> */}
                    <th className="p-3 w-[120px] bg-amber-500/5 text-amber-400 font-black">Resultado</th>
                    <th className="p-3 w-[70px] border-l bg-amber-500/5 text-amber-400" style={{ borderColor: 'var(--border)' }}>%</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {filteredExecutiveProjects.map((p, idx) => {
                    const client = safeClients.find(c => c.id === p.clientId);
                    const partner = safeClients.find(c => c.id === p.partnerId);

                    const projectTasks = safeTasks.filter(t => t.projectId === p.id);
                    const pTimesheets = portfolioTimesheets.filter(e => e.projectId === p.id);

                    // Custo Real (Hoje)
                    const costToday = pTimesheets.reduce((acc, e) => {
                      const u = users.find(user => user.id === e.userId);
                      return acc + (e.totalHours * (u?.hourlyCost || 0));
                    }, 0);

                    // Avanço Real (Média do progresso das tarefas)
                    const activeTasks = projectTasks.filter(t => t.status !== 'Done' || t.progress === 100);
                    // REGRA DE NEGÓCIO: O cliente pediu explicitamente que seja o que os colaboradores alteram
                    // Portanto, vamos fazer uma média simples do campo 'progress' de todas as tarefas do projeto
                    // Independente de estimativa de horas, para refletir puramente o input manual.
                    const sumProgress = projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0);
                    const progress = projectTasks.length > 0 ? sumProgress / projectTasks.length : 0;

                    // Custo para Terminar
                    const costToFinish = projectTasks.reduce((acc, t) => {
                      const remainingHours = (t.estimatedHours || 0) * (1 - (t.progress || 0) / 100);
                      const dev = users.find(u => u.id === t.developerId);
                      const rate = dev?.hourlyCost || 150;
                      return acc + (remainingHours * rate);
                    }, 0);

                    const hoursSold = p.horas_vendidas || p.budget || 0;
                    const hoursReal = pTimesheets.reduce((acc, e) => acc + (Number(e.totalHours) || 0), 0);

                    const sold = p.valor_total_rs || 0;
                    // Resultado = Vendido - Custo Real (Saldo)
                    const result = sold - costToday;
                    // Margem agora é baseada no saldo atual em relação ao vendido
                    const margin = sold > 0 ? (result / sold * 100) : 0;

                    // Cálculo de Progresso Planejado (Ideal baseado no tempo)
                    const now = new Date();
                    const startP = p.startDate ? new Date(p.startDate) : null;
                    const endP = p.estimatedDelivery ? new Date(p.estimatedDelivery) : null;
                    let plannedProgress = 0;
                    if (startP && endP && startP < endP) {
                      if (now > endP) plannedProgress = 100;
                      else if (now > startP) {
                        const total = endP.getTime() - startP.getTime();
                        const elapsed = now.getTime() - startP.getTime();
                        plannedProgress = (elapsed / total) * 100;
                      }
                    }

                    // Lógica de Fases (Status P.) baseada na imagem de pesos
                    const getPlannedStatus = (prog: number, complexity?: string) => {
                      const c = (complexity || 'Média') as 'Alta' | 'Média' | 'Baixa';
                      if (prog >= 100) return 'Concluído';
                      if (prog <= 0) return 'A Iniciar';

                      const thresholds = {
                        'Alta': [10, 20, 50],
                        'Média': [10, 20, 55],
                        'Baixa': [10, 20, 60]
                      };

                      const [t1, t2, t3] = thresholds[c];
                      if (prog <= t1) return 'Entendimento';
                      if (prog <= t2) return 'Análise';
                      if (prog <= t3) return 'Arquitetura';
                      return 'Desenvolvimento';
                    };

                    const statusP = getPlannedStatus(plannedProgress, (p as any).complexidade);

                    const formatDate = (dateStr?: string) => {
                      if (!dateStr || dateStr === "") return <span className="opacity-10">--/--/--</span>;
                      try {
                        return new Date(dateStr).toLocaleDateString('pt-BR');
                      } catch {
                        return <span className="text-red-400">!!</span>;
                      }
                    };

                    const isEven = idx % 2 === 0;
                    const rowBg = isEven ? 'var(--surface)' : 'var(--surface-2)';

                    return (
                      <tr key={p.id} className={`group hover:bg-[var(--surface-hover)] transition-all cursor-default relative border-b border-[var(--border)] ${isEven ? 'bg-[var(--surface)]' : 'bg-[var(--surface-2)] shadow-inner'}`}>
                        {/* CHECKBOX GMAIL STYLE */}
                        <td className="p-3 sticky left-0 z-30 shadow-[1px_0_3px_rgba(0,0,0,0.05)] text-center group-hover:bg-[var(--surface-hover)] transition-colors border-r border-white/5" style={{ backgroundColor: rowBg }}>
                          <input type="checkbox" className="rounded border-slate-300 text-slate-800 focus:ring-slate-800 opacity-20 group-hover:opacity-100 transition-opacity" />
                        </td>

                        {/* FIXED */}
                        <td className="p-3 sticky left-10 z-10 font-bold text-[9px] group-hover:bg-[var(--surface-hover)] shadow-[1px_0_5px_rgba(0,0,0,0.05)] uppercase tracking-wider truncate border-r border-white/5" style={{ backgroundColor: rowBg, color: 'var(--muted)' }}>
                          {partner?.name || <span className="opacity-25 px-1 bg-white/5 rounded">N/A</span>}
                        </td>
                        <td className="p-3 sticky left-[150px] z-10 font-black text-[10px] group-hover:bg-[var(--surface-hover)] shadow-[1px_0_5px_rgba(0,0,0,0.05)] truncate border-r border-white/5" style={{ backgroundColor: rowBg, color: 'var(--text)' }}>
                          {client?.name || "-"}
                        </td>
                        <td className="p-3 sticky left-[290px] z-10 font-black text-xs group-hover:bg-[var(--surface-hover)] shadow-[2px_0_8px_rgba(0,0,0,0.05)] truncate border-r border-white/5" style={{ backgroundColor: rowBg, color: 'var(--text)' }}>
                          {p.name}
                        </td>

                        <td className="p-3 border-r border-white/5 bg-blue-500/[0.02]">
                          <span className="text-[10px] text-blue-400 whitespace-nowrap">
                            {statusP}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] font-mono bg-blue-500/[0.02]" style={{ color: 'var(--text-2)' }}>{formatDate(p.startDate)}</td>
                        <td className="p-3 text-[10px] font-mono font-bold bg-blue-500/[0.02]" style={{ color: 'var(--text)' }}>{formatDate(p.estimatedDelivery)}</td>
                        <td className="p-3 border-r border-white/5 bg-blue-500/[0.02]">
                          <div className="flex items-center gap-1.5 opacity-60">
                            <div className="w-12 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden border border-[var(--border)]">
                              <div className="h-full bg-blue-400" style={{ width: `${plannedProgress}%` }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: 'var(--text-2)' }}>{Math.round(plannedProgress)}%</span>
                          </div>
                        </td>

                        {/* SEÇÃO REAL */}
                        <td className="p-3 bg-emerald-500/[0.02]">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 w-fit ${p.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            <div className={`w-1 h-1 rounded-full ${p.status === 'Concluído' ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                            {p.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="p-3 text-[10px] font-mono bg-emerald-500/[0.02]" style={{ color: 'var(--text-2)' }}>{formatDate(p.startDateReal)}</td>
                        <td className="p-3 text-[10px] font-mono bg-emerald-500/[0.02]" style={{ color: 'var(--text-2)' }}>{formatDate(p.endDateReal)}</td>
                        <td className="p-3 border-r border-white/5 bg-emerald-500/[0.02]">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1 bg-emerald-500/10 rounded-full overflow-hidden border border-emerald-500/20">
                              <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] font-black" style={{ color: 'var(--text)' }}>{Math.round(progress)}%</span>
                          </div>
                        </td>

                        {/* SEÇÃO ANÁLISE (FINANCEIRO) */}
                        {/* SEÇÃO TEMPO (VACANCY FOR NEW COLUMNS) */}
                        <td className="p-3 border-l border-white/5 text-[11px] font-bold font-mono bg-amber-500/[0.02]" style={{ color: 'var(--text-2)' }}>{Math.round(hoursSold)}h</td>
                        <td className={`p-3 border-r border-white/5 text-[11px] font-bold font-mono bg-amber-500/[0.02] ${hoursReal > hoursSold ? 'text-red-400' : 'text-emerald-400'}`}>
                          {Math.round(hoursReal)}h
                        </td>

                        {/* SEÇÃO ANÁLISE (FINANCEIRO) */}
                        <td className="p-3 border-r border-white/5 text-[11px] font-bold font-mono bg-amber-500/[0.02]" style={{ color: 'var(--text)' }}>{sold.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-3 border-r border-white/5 text-[11px] font-bold font-mono bg-amber-500/[0.02]" style={{ color: 'var(--text-2)' }}>{costToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        {/* <td className="p-3 border-r border-white/5 text-[11px] font-bold font-mono italic opacity-40 bg-amber-500/[0.02]">
                          {costToFinish.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td> */}
                        <td className={`p-3 text-[11px] font-black font-mono border-l bg-amber-500/5 ${result < 0 ? 'text-red-500' : 'text-emerald-500'}`} style={{ borderColor: 'var(--border)' }}>
                          {result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className={`p-3 text-[11px] font-black font-mono bg-amber-500/5 ${margin < 15 ? 'text-red-500' : margin < 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {Math.round(margin)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'capacidade' && resourceMetrics && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="p-8 rounded-[32px] border shadow-xl transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                  <Users className="w-4 h-4 text-[var(--primary)]" /> Mapa de Ocupação
                </h3>

                <div className="h-4 w-px bg-[var(--border)]" />

                {/* Minimalist Month Navigation */}
                <div className="flex items-center gap-2">
                  <button onClick={() => changeMonth(-1)} className="p-1 hover:text-[var(--primary)] transition-colors">
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                  <span className="text-sm font-bold font-mono uppercase" style={{ color: 'var(--text)' }}>
                    {new Date(capacityMonth + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => changeMonth(1)} className="p-1 hover:text-[var(--primary)] transition-colors">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>

              <div className="flex gap-4 opacity-70 scale-90 origin-right">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>&lt;80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>80-100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>&gt;100%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {resourceMetrics.map(res => (
                <div key={res.id} className="px-5 py-4 rounded-xl border transition-all hover:shadow-lg group flex flex-col justify-between h-[96px]" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-2">
                      <h4 className="font-bold text-sm truncate leading-tight mb-0.5" style={{ color: 'var(--text)' }}>{res.name}</h4>
                      <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-tighter opacity-70 block">{res.torre || 'N/A'}</span>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-md border shrink-0 ${res.load > 100 ? 'bg-red-500/5 text-red-500 border-red-500/10' : res.load > 80 ? 'bg-amber-500/5 text-amber-500 border-amber-500/10' : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10'}`}>
                      {Math.round(res.load)}%
                    </span>
                  </div>

                  <div className="space-y-2 mt-auto">
                    <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--surface)] border border-white/5">
                      <div className={`h-full transition-all duration-1000 ${res.load > 100 ? 'bg-red-500' : res.load > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(res.load, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider items-center" style={{ color: 'var(--muted)' }}>
                      <span>ALOCADO: <span className="text-[var(--text-2)]">{res.assigned}H</span></span>
                      <span>BASE: <span className="text-[var(--text-2)]">{res.capacity}H</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}



      {activeTab === 'operacional' && (
        <>


          {/* NEW COMPACT HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-slate-800/10 border border-slate-200">
                <Briefcase className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Portfólio de Operações</h1>
                <p className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted)' }}>
                  {activeClients.length} Clientes Ativos • {safeProjects.length} Projetos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* BOTÃO ORDENAR (DROPDOWN) */}
              <div className="relative">
                <button
                  onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                  className="px-4 py-2.5 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <ArrowDownAZ className="w-4 h-4 text-slate-400" />
                  <span>Ordenar: {sortBy === 'recent' ? 'Recentes' : sortBy === 'alphabetical' ? 'Alfabética' : 'Criação'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                </button>

                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                      <button onClick={() => handleSortChange('recent')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${sortBy === 'recent' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Mais Recentes
                      </button>
                      <button onClick={() => handleSortChange('alphabetical')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${sortBy === 'alphabetical' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Alfabética (A-Z)
                      </button>
                      <button onClick={() => handleSortChange('creation')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${sortBy === 'creation' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Data de Criação
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* BOTÃO FILTRAR (DROPDOWN) */}
              <div className="relative">
                <button
                  onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                  className="px-4 py-2.5 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  style={{
                    backgroundColor: taskStatusFilter !== 'all' ? 'var(--surface-2)' : 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: taskStatusFilter !== 'all' ? 'var(--text)' : 'var(--text)'
                  }}
                >
                  <Filter className="w-4 h-4" />
                  <span>Status: {taskStatusFilter === 'all' ? 'Todos' : taskStatusFilter === 'late' ? 'Em Atraso' : taskStatusFilter === 'ongoing' ? 'Em Andamento' : 'Concluídos'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                </button>

                {showFilterMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                      <button onClick={() => { setTaskStatusFilter('all'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Todos os Clientes
                      </button>
                      <button onClick={() => { setTaskStatusFilter('late'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'late' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-white/5'}`}>
                        <AlertCircle className="w-4 h-4" /> Em Atraso
                      </button>
                      <button onClick={() => { setTaskStatusFilter('ongoing'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'ongoing' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-white/5'}`}>
                        <Clock className="w-4 h-4" /> Em Andamento
                      </button>
                      <button onClick={() => { setTaskStatusFilter('done'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-white/5'}`}>
                        <CheckSquare className="w-4 h-4" /> Proj. Concluídos
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* VIEW TOGGLE */}
              <div className="flex p-1 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => toggleViewMode('grid')}
                  className="p-2 px-3 rounded-lg transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: viewMode === 'grid' ? 'var(--text)' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--bg)' : 'var(--muted)'
                  }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleViewMode('list')}
                  className="p-2 px-3 rounded-lg transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: viewMode === 'list' ? 'var(--text)' : 'transparent',
                    color: viewMode === 'list' ? 'var(--bg)' : 'var(--muted)'
                  }}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => navigate('/admin/clients/new')}
                className="ml-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all font-bold text-xs"
              >
                <Plus size={16} />
                Novo Cliente
              </button>
            </div>
          </div>

          {/* LISTA DE CLIENTES */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
                <p className="animate-pulse" style={{ color: 'var(--muted)' }}>Carregando clientes...</p>
              </div>
            </div>
          ) : filteredSortedClients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center" style={{ color: 'var(--muted)' }}>
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  Nenhum cliente ativo
                </p>
                <p className="text-sm">
                  Clique em "Novo Cliente" para começar
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 overflow-y-auto custom-scrollbar"
            >
              {filteredSortedClients.map((client) => (
                <div
                  key={client.id}
                  className="group border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col h-[220px]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                >
                  <div className="w-full flex-1 bg-white p-3 flex items-center justify-center transition-all overflow-hidden">
                    <img
                      src={client.logoUrl}
                      alt={client.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/200x200?text=Logo")}
                    />
                  </div>

                  <div className="px-4 py-3 flex flex-col justify-center text-center border-t" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h2 className="text-[12px] font-black uppercase tracking-tight line-clamp-1 mb-0.5" style={{ color: 'var(--text)' }}>
                      {client.name}
                    </h2>
                    <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                      {safeProjects.filter((p) => p.clientId === client.id).length} {safeProjects.filter((p) => p.clientId === client.id).length === 1 ? 'PROJETO' : 'PROJETOS'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW IMPROVED (USER REQUEST) */
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-10"
            >
              {filteredSortedClients.map((client) => {
                const clientProjects = safeProjects.filter(p => p.clientId === client.id);
                const clientTasks = safeTasks.filter(t => t.clientId === client.id);

                return (
                  <div key={client.id} className="space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border group transition-all"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div className="flex items-center gap-5 cursor-pointer" onClick={() => navigate(`/admin/clients/${client.id}`)}>
                        <div className="w-16 h-16 rounded-xl border bg-white p-2 flex items-center justify-center shadow-lg" style={{ borderColor: 'var(--border)' }}>
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="w-full h-full object-contain"
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=Logo")}
                          />
                        </div>
                        <div>
                          <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{client.name}</h2>
                          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                            <span>{clientProjects.length} {clientProjects.length === 1 ? 'projeto' : 'projetos'}</span>
                            <span className="text-slate-600">•</span>
                            <span>{clientTasks.length} {clientTasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${client.id}`); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs border"
                          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${client.id}/projects/new`); }}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all font-bold text-xs shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> Novo Projeto
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar-thin pl-2">
                      {clientProjects.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-4">Nenhum projeto cadastrado para este cliente.</div>
                      ) : (
                        clientProjects.map(project => {
                          const projectTasks = safeTasks.filter(t => t.projectId === project.id);
                          const doneTasks = projectTasks.filter(t => t.status === 'Done').length;
                          const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

                          return (
                            <motion.div
                              whileHover={{ y: -4 }}
                              key={project.id}
                              onClick={() => navigate(`/admin/projects/${project.id}`)}
                              className="min-w-[280px] max-w-[280px] border rounded-2xl p-5 cursor-pointer transition-all group/card shadow-lg relative"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                            >
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(project.id);
                                  }}
                                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all z-10 opacity-0 group-hover/card:opacity-100"
                                  title="Excluir Projeto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <h4 className="font-bold mb-3 line-clamp-1 transition-colors uppercase text-[11px] tracking-wider" style={{ color: 'var(--text)' }}>{project.name}</h4>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                                  <span>Progresso</span>
                                  <span className="text-slate-600">{progress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                                  <div
                                    className="h-full bg-slate-600 transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{doneTasks}/{projectTasks.length}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${project.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {project.status || 'Ativo'}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* FLOAT SCROLL TO TOP */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-10 right-10 p-4 bg-slate-800 text-white rounded-full shadow-2xl hover:bg-slate-700 transition-all z-50 border border-white/10 group"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!projectToDelete}
        title="Excluir Projeto"
        message="Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (projectToDelete) {
            try {
              await deleteProject(projectToDelete);
              setProjectToDelete(null);
            } catch (err) {
              console.error('Erro ao excluir projeto:', err);
              alert('Erro ao excluir projeto.');
            }
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useEffect, useMemo } from 'react';
import { auditService, AuditLog } from '../services/auditService';
import { useDataController } from '../controllers/useDataController';
import { ShieldAlert, Search, Eye, Filter, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AuditLogsPage: React.FC = () => {
    const { users } = useDataController();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await auditService.fetchAuditLogs({
                action: actionFilter || undefined,
                entity: entityFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                limit: 500
            });
            setLogs(data);
        } catch (error) {
            console.error('Erro ao buscar audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [actionFilter, entityFilter, dateFrom, dateTo]);

    const getUserName = (userId: string | null) => {
        if (!userId) return 'Sistema';
        const user = users.find(u => String(u.id) === String(userId) || u.email === userId);
        return user ? user.name : `ID: ${userId}`;
    };

    const getActionColor = (action: string) => {
        const act = action.toUpperCase();
        if (act === 'CREATE') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (act === 'UPDATE') return 'bg-blue-100 text-blue-800 border-blue-200';
        if (act === 'DELETE') return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-slate-100 text-slate-800 border-slate-200';
    };

    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const lowerTerm = searchTerm.toLowerCase();
        return logs.filter(log =>
            log.action.toLowerCase().includes(lowerTerm) ||
            log.entity.toLowerCase().includes(lowerTerm) ||
            getUserName(log.user_id).toLowerCase().includes(lowerTerm) ||
            log.entity_id.toLowerCase().includes(lowerTerm)
        );
    }, [logs, searchTerm, users]);

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="px-8 py-8 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-3 mb-6">
                    <ShieldAlert className="w-8 h-8 text-purple-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            Histórico de Auditoria
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Rastreamento de todas as alterações feitas no sistema.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por usuário, ação, entidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />
                    </div>

                    <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-purple-500"
                    >
                        <option value="">Todas Ações</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                    </select>

                    <select
                        value={entityFilter}
                        onChange={(e) => setEntityFilter(e.target.value)}
                        className="py-2 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-purple-500"
                    >
                        <option value="">Todas Entidades</option>
                        <option value="dim_clientes">Clientes</option>
                        <option value="dim_projetos">Projetos</option>
                        <option value="fato_tarefas">Tarefas</option>
                        <option value="horas_trabalhadas">Apontamentos</option>
                    </select>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus-within:border-purple-500">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            className="text-sm text-slate-600 focus:outline-none"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <span className="text-slate-400">até</span>
                        <input
                            type="date"
                            className="text-sm text-slate-600 focus:outline-none"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto p-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse space-y-6">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="px-6 py-4">Data/Hora</th>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Ação</th>
                                <th className="px-6 py-4">Entidade</th>
                                <th className="px-6 py-4">ID Registro</th>
                                <th className="px-6 py-4">IP</th>
                                <th className="px-6 py-4 w-20 text-center">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Carregando registros...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum registro encontrado para os filtros atuais.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                                            {getUserName(log.user_id)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {log.entity}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                            {log.entity_id}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {log.ip_address || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                title="Ver Detalhes"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalhes */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                        Detalhes da Operação
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {new Date(selectedLog.created_at).toLocaleString('pt-BR')} — {selectedLog.action} em {selectedLog.entity} (ID: {selectedLog.entity_id})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-6 bg-slate-50">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3 px-1">Dados Anteriores (Old Data)</h4>
                                        <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-auto min-h-[300px] border border-slate-800 shadow-inner">
                                            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                                                {selectedLog.old_data
                                                    ? JSON.stringify(selectedLog.old_data, null, 2)
                                                    : <span className="text-slate-500 italic">Nenhum dado anterior (NULL)</span>
                                                }
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-3 px-1">Dados Novos (New Data)</h4>
                                        <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-auto min-h-[300px] border border-slate-800 shadow-inner">
                                            <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                                                {selectedLog.new_data
                                                    ? JSON.stringify(selectedLog.new_data, null, 2)
                                                    : <span className="text-slate-500 italic">Nenhum dado novo (NULL)</span>
                                                }
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                                >
                                    Fechar Detalhes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

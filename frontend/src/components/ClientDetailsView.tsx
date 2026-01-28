// components/ClientDetailsView.tsx - Unificado: Resumo + Detalhes/Edição + Projetos + Tarefas
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft, Plus, Briefcase, CheckSquare, Clock, Edit,
  LayoutGrid, ListTodo, Filter, Trash2, Save, Upload,
  User as UserIcon, Building2, Globe, Phone, FileText
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { motion } from 'framer-motion';

type ViewTab = 'details' | 'projects' | 'tasks';

const ClientDetailsView: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const {
    clients, projects, tasks, users, getClientById, projectMembers,
    updateClient, deleteClient, deleteProject, deleteTask
  } = useDataController();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<ViewTab>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'task' | 'client' } | null>(null);

  // Form State
  const client = clientId ? getClientById(clientId) : null;
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    cnpj: '',
    telefone: '',
    tipo_cliente: 'cliente_final' as 'parceiro' | 'cliente_final',
    partner_id: '',
    pais: ''
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        logoUrl: client.logoUrl || '',
        cnpj: client.cnpj || '',
        telefone: client.telefone || '',
        tipo_cliente: client.tipo_cliente || 'cliente_final',
        partner_id: client.partner_id || '',
        pais: client.pais || ''
      });
    }
  }, [client]);

  const clientProjects = useMemo(() =>
    projects.filter(p => p.clientId === clientId),
    [projects, clientId]
  );

  const clientTasks = useMemo(() =>
    tasks.filter(t => t.clientId === clientId),
    [tasks, clientId]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    setLoading(true);
    try {
      await updateClient(clientId, {
        name: formData.name,
        logoUrl: formData.logoUrl,
        tipo_cliente: formData.tipo_cliente,
        partner_id: formData.partner_id || undefined,
        cnpj: formData.cnpj,
        telefone: formData.telefone,
        pais: formData.pais
      } as any);

      alert('Cliente atualizado com sucesso!');
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      await deleteClient(clientId);
      navigate('/admin/clients');
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir cliente. Verifique se existem projetos vinculados.');
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text)]">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h2 className="text-2xl font-bold mb-2">Cliente não encontrado</h2>
          <button onClick={() => navigate('/admin/clients')} className="text-purple-500 hover:underline">
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bgApp)' }}>
      {/* HEADER - Estilo TeamMemberDetail */}
      <div className="px-8 py-6 border-b flex items-center justify-between gap-4 bg-gradient-to-r from-[#4c1d95] to-purple-600 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/clients')} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 rounded-xl bg-white p-2 flex items-center justify-center border-2 border-white shadow-lg overflow-hidden">
            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=Logo")} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm border bg-white/20 text-white border-white/30">
                {client.tipo_cliente === 'parceiro' ? 'Parceiro' : 'Cliente Final'}
              </span>
              {client.pais && <><span className="text-purple-200 opacity-50">•</span><p className="text-sm text-purple-100 font-medium">{client.pais}</p></>}
            </div>
          </div>
        </div>

        {isAdmin && activeTab === 'details' && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${isEditing ? 'bg-white text-purple-600 hover:bg-purple-50' : 'bg-purple-800/40 text-white hover:bg-purple-800/60 border border-white/20'}`}
          >
            {isEditing ? 'Cancelar Edição' : <> <Edit className="w-4 h-4" /> Editar Cliente </>}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* 1. CARDS DE RESUMO (TABS) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div onClick={() => setActiveTab('details')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'details' ? 'ring-2 ring-purple-600 bg-purple-50 border-purple-200 shadow-md' : 'bg-white border-slate-200 hover:border-purple-300 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className={`w-4 h-4 ${activeTab === 'details' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Informações</span>
              </div>
              <span className={`text-lg font-bold ${activeTab === 'details' ? 'text-purple-700' : 'text-slate-700'}`}>Dados do Cliente</span>
            </div>

            <div onClick={() => setActiveTab('projects')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'projects' ? 'ring-2 ring-blue-600 bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className={`w-4 h-4 ${activeTab === 'projects' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projetos</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${activeTab === 'projects' ? 'text-blue-700' : 'text-slate-800'}`}>{clientProjects.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Ativos</span>
              </div>
            </div>

            <div onClick={() => setActiveTab('tasks')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'tasks' ? 'ring-2 ring-emerald-600 bg-emerald-50 border-emerald-200 shadow-md' : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entregas</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${activeTab === 'tasks' ? 'text-emerald-700' : 'text-slate-800'}`}>{clientTasks.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Total de Tarefas</span>
              </div>
            </div>
          </div>

          {/* 2. CONTEÚDO DAS TABS */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'details' && (
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-10">
                <div className="flex items-center gap-3 mb-10 border-b border-slate-100 pb-6">
                  <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                    <UserIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Perfil Corporativo</h3>
                    <p className="text-sm text-slate-400">Gerenciamento de dados e configurações contratuais</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-10">
                  <fieldset disabled={!isEditing} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Nome da Empresa</label>
                        <div className="relative group">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-xl"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">CNPJ / Identificação</label>
                        <div className="relative group">
                          <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                          <input
                            type="text"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">País de Atuação</label>
                        <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                          <input
                            type="text"
                            value={formData.pais}
                            onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-xl"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Telefone Comercial</label>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500 transition-colors" size={18} />
                          <input
                            type="text"
                            value={formData.telefone}
                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-xl"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">URL da Logomarca</label>
                        <div className="flex gap-4">
                          <input
                            type="text"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            className="flex-1 px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none"
                          />
                          {isEditing && (
                            <button type="button" className="px-6 py-4 border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-slate-500">
                              <Upload size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 rounded-[24px] bg-slate-50 border border-slate-100 mt-12">
                      <h4 className="text-xs font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-3">
                        <FileText size={16} className="text-purple-500" /> Configuração de Filtros & Categorias
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Classificação</label>
                          <select
                            value={formData.tipo_cliente}
                            onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value as any })}
                            className="w-full px-4 py-3 bg-white border-2 border-slate-100 focus:border-purple-500 rounded-xl font-bold text-slate-700 outline-none disabled:bg-transparent disabled:border-none disabled:px-0 disabled:appearance-none"
                          >
                            <option value="cliente_final">Cliente Final</option>
                            <option value="parceiro">Parceiro Nic-Labs</option>
                          </select>
                        </div>
                        {formData.tipo_cliente === 'cliente_final' && (
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Parceiro Vinculado</label>
                            <select
                              value={formData.partner_id}
                              onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                              className="w-full px-4 py-3 bg-white border-2 border-slate-100 focus:border-purple-500 rounded-xl font-bold text-slate-700 outline-none disabled:bg-transparent disabled:border-none disabled:px-0 disabled:appearance-none"
                            >
                              <option value="">Direto (Sem intermédio)</option>
                              {clients.filter(c => c.tipo_cliente === 'parceiro' && c.id !== clientId).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NOVO: Equipe Geral do Cliente */}
                    <div className="mt-10 border-t border-slate-100 pt-10">
                      <h4 className="text-sm font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><UserIcon size={14} /></div>
                        Equipe Envolvida
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {Array.from(new Set([
                          ...clientProjects.flatMap(p => projectMembers.filter(pm => pm.projectId === p.id).map(pm => pm.userId)),
                          ...clientTasks.map(t => t.developerId).filter(id => id)
                        ])).map(uId => {
                          const user = users.find(u => u.id === uId);
                          if (!user) return null;
                          return (
                            <div key={user.id} className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-purple-300 transition-all">
                              {user.avatarUrl ? (
                                <img src={user.avatarUrl} className="w-8 h-8 rounded-xl object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-[10px] uppercase text-slate-500 border border-slate-200">{user.name.substring(0, 2)}</div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700">{user.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user.cargo || 'Membro'}</span>
                              </div>
                            </div>
                          );
                        })}
                        {clientProjects.length === 0 && clientTasks.length === 0 && (
                          <span className="text-sm italic text-slate-400">Nenhum colaborador alocado ainda.</span>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ id: clientId, type: 'client' })}
                          className="px-6 py-3 text-red-500 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                          Excluir Cliente
                        </button>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-xl shadow-purple-200 transition-all flex items-center gap-2"
                          >
                            <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Salvar Perfil'}
                          </button>
                        </div>
                      </div>
                    )}
                  </fieldset>
                </form>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Projetos em Andamento ({clientProjects.length})</h3>
                  <button
                    onClick={() => navigate(`/admin/clients/${clientId}/projects/new`)}
                    className="px-5 py-2.5 bg-purple-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} /> Novo Projeto
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clientProjects.map(project => {
                    const projectTasks = tasks.filter(t => t.projectId === project.id);
                    const doneTasks = projectTasks.filter(t => t.status === 'Done').length;
                    const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

                    return (
                      <motion.div
                        whileHover={{ y: -5 }}
                        key={project.id}
                        onClick={() => navigate(`/admin/projects/${project.id}`)}
                        className="bg-white p-7 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all cursor-pointer group relative"
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setItemToDelete({ id: project.id, type: 'project' }); }}
                          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                        >
                          <Trash2 size={16} />
                        </button>
                        <h4 className="font-black text-slate-800 text-lg mb-6 pr-8 group-hover:text-purple-600 transition-colors uppercase tracking-tight line-clamp-1">{project.name}</h4>

                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                              <span>Evolução Física</span>
                              <span className="text-purple-600">{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500" style={{ width: `${progress}%` }} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                              <CheckSquare size={14} className="text-purple-400" />
                              <span className="text-xs font-bold text-slate-500">{doneTasks} / {projectTasks.length}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border ${project.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                              {project.status || 'Ativo'}
                            </span>
                          </div>

                          <div className="flex -space-x-3 mt-4">
                            {projectMembers
                              .filter(pm => pm.projectId === project.id)
                              .map(pm => {
                                const member = users.find(u => u.id === pm.userId);
                                if (!member) return null;
                                return (
                                  <div key={member.id} className="w-9 h-9 rounded-2xl border-4 border-white shadow-sm overflow-hidden" title={member.name}>
                                    {member.avatarUrl ? (
                                      <img src={member.avatarUrl} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-500">{member.name.substring(0, 2)}</div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {clientProjects.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Sem projetos cadastrados</p>
                      <button onClick={() => navigate(`/admin/clients/${clientId}/projects/new`)} className="mt-4 text-purple-600 font-black text-xs uppercase hover:underline">Criar Primeiro Projeto</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Monitoramento de Tarefas ({clientTasks.length})</h3>
                  <button
                    onClick={() => navigate(`/tasks/new?client=${clientId}`)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Plus size={18} /> Nova Tarefa
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                      className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
                    >
                      <div className="flex-1 pr-4">
                        <h5 className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-1">{task.title}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${task.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : task.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                            {task.status}
                          </span>
                          <span className="text-[10px] text-slate-400">• {task.projectName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end mr-2">
                          <span className="text-sm font-black text-slate-700">{task.progress}%</span>
                          {task.estimatedDelivery && <span className="text-[9px] text-slate-400 font-bold mt-0.5">{new Date(task.estimatedDelivery).toLocaleDateString()}</span>}
                        </div>
                        {task.developerId && (
                          <div className="w-10 h-10 rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden" title={task.developer}>
                            {users.find(u => u.id === task.developerId)?.avatarUrl ? (
                              <img src={users.find(u => u.id === task.developerId)?.avatarUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] uppercase">
                                {(task.developer || '??').substring(0, 2)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {clientTasks.length === 0 && (
                    <div className="col-span-full py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 font-bold text-sm uppercase">Nenhuma tarefa encontrada</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        title={`Excluir ${itemToDelete?.type === 'client' ? 'Cliente' : itemToDelete?.type === 'project' ? 'Projeto' : 'Tarefa'}`}
        message={`Tem certeza que deseja excluir? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            if (itemToDelete.type === 'client') {
              await handleDeleteClient();
            } else if (itemToDelete.type === 'project') {
              await deleteProject(itemToDelete.id);
            } else {
              await deleteTask(itemToDelete.id);
            }
            setItemToDelete(null);
          } catch (err) {
            console.error(err);
            alert('Erro ao excluir item.');
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

export default ClientDetailsView;

// components/ProjectForm.tsx - Adaptado para Router e Project Members
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save } from 'lucide-react';

const ProjectForm: React.FC = () => {
  const { projectId, clientId: routeClientId } = useParams<{ projectId?: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

  // Incluindo funções de membros do projeto
  const {
    clients,
    projects,
    users,
    projectMembers, // Para dependência
    createProject,
    updateProject,
    getProjectMembers,
    addProjectMember,
    removeProjectMember
  } = useDataController();

  const isEdit = !!projectId;
  const project = projectId ? projects.find(p => p.id === projectId) : null;

  // Cliente pode vir da rota ou query param
  const initialClientId = routeClientId || searchParams.get('clientId') || project?.clientId || '';

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(initialClientId);
  const [partnerId, setPartnerId] = useState('');
  const [status, setStatus] = useState('Planejamento');
  const [description, setDescription] = useState('');
  const [managerClient, setManagerClient] = useState('');
  const [responsibleNicLabsId, setResponsibleNicLabsId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [startDateReal, setStartDateReal] = useState('');
  const [endDateReal, setEndDateReal] = useState('');
  const [risks, setRisks] = useState('');
  const [successFactor, setSuccessFactor] = useState('');
  const [criticalDate, setCriticalDate] = useState('');
  const [docLink, setDocLink] = useState('');
  const [gapsIssues, setGapsIssues] = useState('');
  const [importantConsiderations, setImportantConsiderations] = useState('');
  const [weeklyStatusReport, setWeeklyStatusReport] = useState('');

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (project) {
      setName(project.name);
      setClientId(project.clientId);
      setPartnerId(project.partnerId || '');
      setStatus(project.status || 'Planejamento');
      setDescription(project.description || '');
      setManagerClient(project.managerClient || '');
      setResponsibleNicLabsId(project.responsibleNicLabsId || '');
      setStartDate(project.startDate || '');
      setEstimatedDelivery(project.estimatedDelivery || '');
      setStartDateReal(project.startDateReal || '');
      setEndDateReal(project.endDateReal || '');
      setRisks(project.risks || '');
      setSuccessFactor(project.successFactor || '');
      setCriticalDate(project.criticalDate || '');
      setDocLink(project.docLink || '');
      setGapsIssues(project.gapsIssues || '');
      setImportantConsiderations(project.importantConsiderations || '');
      setWeeklyStatusReport(project.weeklyStatusReport || '');
    }
  }, [project]);

  // Carregar membros separadamente para garantir sincronia
  useEffect(() => {
    if (isEdit && projectId) {
      const currentMembers = getProjectMembers(projectId);
      setSelectedUsers(currentMembers);
    }
  }, [isEdit, projectId, projectMembers]); // Re-executa se os membros globais mudarem (ex: ao terminar de carregar)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !clientId) {
      alert('Nome e cliente são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      let targetProjectId = projectId;

      // 1. Salvar/Criar Projeto
      const projectData = {
        name,
        clientId,
        partnerId: partnerId || undefined,
        status,
        description,
        managerClient,
        responsibleNicLabsId: responsibleNicLabsId || undefined,
        startDate: startDate || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        startDateReal: startDateReal || undefined,
        endDateReal: endDateReal || undefined,
        risks,
        successFactor,
        criticalDate: criticalDate || undefined,
        docLink,
        gaps_issues: gapsIssues,
        important_considerations: importantConsiderations,
        weekly_status_report: weeklyStatusReport,
        active: true
      };

      if (isEdit && projectId) {
        await updateProject(projectId, projectData);
      } else {
        targetProjectId = await createProject(projectData);
      }

      // 2. Atualizar Membros (apenas se tiver ID de projeto válido)
      if (targetProjectId) {
        // Membros que já estavam no banco
        const initialMembers = isEdit ? getProjectMembers(targetProjectId) : [];
        const currentMembersSet = new Set(initialMembers);
        const newMembersSet = new Set(selectedUsers);

        // Adicionar novos
        const toAdd = selectedUsers.filter(uid => !currentMembersSet.has(uid));
        for (const userId of toAdd) {
          await addProjectMember(targetProjectId, userId);
        }

        // Remover excluídos (apenas em edição)
        if (isEdit) {
          const toRemove = initialMembers.filter(uid => !newMembersSet.has(uid));
          for (const userId of toRemove) {
            await removeProjectMember(targetProjectId, userId);
          }
        }
      }

      alert(isEdit ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!');

      // Navegar de volta
      if (isEdit) {
        navigate(`/admin/projects/${targetProjectId}`);
      } else {
        navigate(`/admin/clients/${clientId}`);
      }

    } catch (error: any) {
      console.error('Erro ao salvar projeto:', error);
      alert(`Erro ao salvar projeto: ${error.message || 'Erro desconhecido'}. Tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl space-y-6">
          <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <div className="w-2 h-6 bg-[var(--primary)] rounded-full" />
              Informações Básicas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Ex: Desenvolvimento do Website"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Cliente Final *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  required
                >
                  <option value="">Selecione o cliente final</option>
                  {clients.filter(c => c.active !== false && c.tipo !== 'parceiro').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Parceiro (Opcional)
                </label>
                <select
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">Nenhum parceiro</option>
                  {clients.filter(c => c.active !== false && c.tipo === 'parceiro').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Escopo Resumido
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all h-24 resize-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Descreva brevemente o objetivo do projeto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Status do Projeto
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="Planejamento">Planejamento</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Em Pausa">Em Pausa</option>
                  <option value="Concluído">Concluído</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Link da Documentação
                </label>
                <input
                  type="url"
                  value={docLink}
                  onChange={(e) => setDocLink(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="https://docs.exemplo.com/..."
                />
              </div>
            </div>
          </div>

          {/* Stakeholders Section */}
          <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <div className="w-2 h-6 bg-[var(--primary)] rounded-full" />
              Responsabilidades
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Gerente (Lado Cliente)
                </label>
                <input
                  type="text"
                  value={managerClient}
                  onChange={(e) => setManagerClient(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Nome do gerente no cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Responsável (Nic-Labs)
                </label>
                <select
                  value={responsibleNicLabsId}
                  onChange={(e) => setResponsibleNicLabsId(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">Selecione o responsável interno</option>
                  {users.filter(u => u.active !== false).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.cargo || u.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <div className="w-2 h-6 bg-[var(--primary)] rounded-full" />
              Linha do Tempo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Início Previsto</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Fim Previsto</label>
                <input
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Início Real</label>
                <input
                  type="date"
                  value={startDateReal}
                  onChange={(e) => setStartDateReal(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Fim Real</label>
                <input
                  type="date"
                  value={endDateReal}
                  onChange={(e) => setEndDateReal(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>
          </div>

          {/* Risks & Success Section */}
          <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <div className="w-2 h-6 bg-[var(--primary)] rounded-full" />
              Riscos e Sucesso
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Riscos do Projeto
                </label>
                <textarea
                  value={risks}
                  onChange={(e) => setRisks(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all h-20 resize-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Ex: Atraso em aprovações de API..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Fator de Sucesso
                </label>
                <input
                  type="text"
                  value={successFactor}
                  onChange={(e) => setSuccessFactor(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="O que define o sucesso..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Data Crítica
                </label>
                <input
                  type="date"
                  value={criticalDate}
                  onChange={(e) => setCriticalDate(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>
          </div>

          {/* Status Report Semanal Section */}
          <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
              <div className="w-2 h-6 bg-[var(--primary)] rounded-full" />
              Status Report Semanal
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Gaps / Issues / Impedimentos
                </label>
                <textarea
                  value={gapsIssues}
                  onChange={(e) => setGapsIssues(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all h-24 resize-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Liste problemas técnicos ou burocráticos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Considerações Importantes
                </label>
                <textarea
                  value={importantConsiderations}
                  onChange={(e) => setImportantConsiderations(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all h-24 resize-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Informações relevantes para a diretoria..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                  Mensagem para o Status Report
                </label>
                <textarea
                  value={weeklyStatusReport}
                  onChange={(e) => setWeeklyStatusReport(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none shadow-sm transition-all h-32 resize-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Escreva o texto final que será enviado ao cliente/stakeholders..."
                />
                <p className="text-[10px] mt-1 text-[var(--muted)] italic">
                  * Este texto será a base para a exportação do relatório semanal.
                </p>
              </div>
            </div>
          </div>

          {/* Membros do Projeto */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Membros do Projeto
            </label>
            <div className="border rounded-xl p-4 max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar shadow-inner"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              {users.filter(u => u.active !== false).map(user => (
                <label key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-hover)] p-2 rounded-lg transition-colors group">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(prev => [...prev, user.id]);
                      } else {
                        setSelectedUsers(prev => prev.filter(id => id !== user.id));
                      }
                    }}
                    className="w-5 h-5 rounded border-[var(--border)] focus:ring-[var(--ring)]"
                    style={{ color: 'var(--primary)', backgroundColor: 'var(--surface)' }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
                      style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium transition-colors" style={{ color: 'var(--text)' }}>{user.name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{user.role}</p>
                    </div>
                  </div>
                </label>
              ))}
              {(() => {
                const activeCargos = ['desenvolvedor', 'infraestrutura de ti'];
                if (users.some(u => u.active !== false && !activeCargos.includes(u.cargo?.toLowerCase() || ''))) {
                  return (
                    <div className="col-span-full p-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] opacity-50 border-t border-[var(--border)] mt-2">
                      * Usuários de outros cargos não participam de projetos.
                    </div>
                  );
                }
                return null;
              })()}

            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              Selecione os colaboradores que trabalharão neste projeto.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border rounded-xl font-bold transition-colors shadow-sm"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-md transition-all transform active:scale-95"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;

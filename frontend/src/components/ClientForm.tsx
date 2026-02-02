// components/ClientForm.tsx - Adaptado para Router
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { ArrowLeft, Save, Upload, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const ClientForm: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getClientById, createClient, updateClient, deleteClient, clients, users } = useDataController();

  const isEdit = !!clientId;
  const client = clientId ? getClientById(clientId) : null;

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipo_cliente, setTipoCliente] = useState<'parceiro' | 'cliente_final'>('cliente_final');
  const [partner_id, setPartnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [email_contato, setEmailContato] = useState('');
  const [responsavel_interno_id, setResponsavelInternoId] = useState('');
  const [responsavel_externo, setResponsavelExterno] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryTipo = urlParams.get('tipo') as 'parceiro' | 'cliente_final';
    const queryPartnerId = urlParams.get('partnerId');

    if (queryTipo) setTipoCliente(queryTipo);
    if (queryPartnerId) setPartnerId(queryPartnerId);
  }, []);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setLogoUrl(client.logoUrl || '');
      setCnpj(client.cnpj || '');
      setTelefone(client.telefone || '');
      setTipoCliente(client.tipo_cliente || 'cliente_final');
      setPartnerId(client.partner_id || '');
      setEmailContato(client.email_contato || '');
      setResponsavelInternoId(client.responsavel_interno_id || '');
      setResponsavelExterno(client.responsavel_externo || '');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Nome do cliente é obrigatório');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name,
        logoUrl,
        cnpj,
        telefone,
        tipo_cliente,
        partner_id: tipo_cliente === 'cliente_final' ? partner_id : undefined,
        email_contato,
        responsavel_interno_id,
        responsavel_externo
      };

      if (isEdit && clientId) {
        await updateClient(clientId, payload);
        alert('Cliente atualizado com sucesso!');
      } else {
        // Coleta dados extras do formulário nativo
        const form = e.currentTarget as HTMLFormElement;
        const choice = (form.elements.namedItem('contractChoice') as HTMLSelectElement)?.value;
        const months = (form.elements.namedItem('contractMonths') as HTMLInputElement)?.value;

        await createClient({
          ...payload,
          active: true,
          // @ts-ignore
          contractChoice: choice,
          contractMonths: months
        });
        alert('Cliente criado com sucesso!');
      }

      navigate('/admin/clients');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      await deleteClient(clientId);
      alert('Cliente excluído com sucesso!');
      navigate('/admin/clients');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Verifique se existem projetos vinculados.');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--surfaceHover)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--textMuted)]" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--textTitle)]">
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        <div className="max-w-3xl space-y-8">
          {/* Sessão 1: Identificação */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                Nome do Cliente *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-[var(--text)] transition-all font-medium"
                placeholder="Ex: Empresa XYZ"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] transition-all font-medium"
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                  Telefone
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] transition-all font-medium"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                Tipo de Cliente
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setTipoCliente('cliente_final')}
                  className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black text-sm transition-all flex items-center justify-center gap-3 ${tipo_cliente === 'cliente_final'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-slate-300'
                    }`}
                >
                  Cliente Final
                </button>
                <button
                  type="button"
                  onClick={() => setTipoCliente('parceiro')}
                  className={`flex-1 py-4 px-6 rounded-2xl border-2 font-black text-sm transition-all flex items-center justify-center gap-3 ${tipo_cliente === 'parceiro'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-sm'
                    : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-slate-300'
                    }`}
                >
                  Parceiro Nic-Labs
                </button>
              </div>
            </div>
          </div>

          {tipo_cliente === 'cliente_final' && (
            <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Vincular a um Parceiro (Opcional)
              </label>
              <select
                value={partner_id}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-slate-700 font-medium"
              >
                <option value="">Nenhum Parceiro (Direto)</option>
                {(clients || []).filter(c => c.tipo_cliente === 'parceiro' && c.id !== clientId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {tipo_cliente === 'parceiro' && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-sm text-[var(--textTitle)]">Informações de Parceiro</h3>
                <div className="h-px w-full bg-[var(--border)]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                    Email de Contato
                  </label>
                  <input
                    type="email"
                    value={email_contato}
                    onChange={(e) => setEmailContato(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] transition-all font-medium"
                    placeholder="contato@parceiro.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                    Responsável (Parceiro)
                  </label>
                  <input
                    type="text"
                    value={responsavel_externo}
                    onChange={(e) => setResponsavelExterno(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] transition-all font-medium"
                    placeholder="Nome do contato no parceiro"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
                  Responsável Interno (Nossa Empresa)
                </label>
                <select
                  value={responsavel_interno_id}
                  onChange={(e) => setResponsavelInternoId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] transition-all font-medium"
                >
                  <option value="">Selecione um responsável</option>
                  {(users || []).filter(u => u.active !== false).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Logo URL */}
          <div className="space-y-4">
            <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-2">
              URL do Logo
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] transition-all font-medium"
                placeholder="https://exemplo.com/logo.png"
              />
              <button
                type="button"
                className="px-6 py-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl hover:bg-[var(--surface-hover)] flex items-center gap-2 text-[var(--text)] font-black text-xs uppercase tracking-widest shadow-sm transition-all"
              >
                <Upload className="w-4 h-4 text-purple-500" />
                Upload
              </button>
            </div>
            {logoUrl && (
              <div className="mt-4 p-6 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-2)] flex flex-col items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-4">Preview da Identidade</p>
                <div className="w-32 h-32 bg-white rounded-2xl p-4 shadow-xl border border-[var(--border)] flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://placehold.co/200x200?text=Logo';
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sessão: Contrato de Serviço */}
          <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] space-y-6">
            <div className="flex flex-col gap-1 mb-2">
              <h3 className="font-black text-sm text-[var(--textTitle)] uppercase tracking-wider">Contrato de Serviço</h3>
              <div className="h-0.5 w-12 bg-purple-500 rounded-full" />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">Possui tempo de contrato determinado?</label>
                <select
                  name="contractChoice"
                  className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] font-medium transition-all"
                  defaultValue="nao"
                  id="contractChoiceSelect"
                  onChange={(e) => {
                    const monthsInput = document.getElementById('monthsInput');
                    if (monthsInput) {
                      if (e.target.value === 'sim') {
                        monthsInput.classList.remove('hidden');
                      } else {
                        monthsInput.classList.add('hidden');
                      }
                    }
                  }}
                >
                  <option value="nao">Não (Indeterminado)</option>
                  <option value="sim">Sim (Determinado)</option>
                </select>
              </div>

              <div id="monthsInput" className="hidden animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-black uppercase tracking-widest text-[var(--muted)] mb-3">Duração da Parceria (Meses)</label>
                <input
                  type="number"
                  name="contractMonths"
                  min="1"
                  defaultValue="12"
                  className="w-full px-4 py-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-purple-500 text-[var(--text)] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-[var(--border)]">
            <div className="flex w-full md:w-auto gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 md:flex-none px-8 py-4 border border-[var(--border)] text-[var(--text)] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[var(--surfaceHover)] transition-all"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 md:flex-none px-10 py-4 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEdit ? 'Salvar Alterações' : 'Confirmar Cadastro'}
              </button>
            </div>

            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full md:w-auto px-6 py-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
                Arquivar Parceiro
              </button>
            )}
          </div>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${name}"? Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        confirmText={loading ? 'Excluindo...' : 'Excluir'}
        confirmColor="red"
      />
    </div>
  );
};

export default ClientForm;

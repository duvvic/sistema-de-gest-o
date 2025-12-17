import React, { useState, useCallback } from 'react';
import { Client } from '../types';
import { ArrowLeft, Save, Building2, Link as LinkIcon, Upload } from 'lucide-react';
import { useUnsavedChangesPrompt } from '../hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';

interface ClientFormProps {
  onSave: (client: Client) => void;
  onBack: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ onSave, onBack }) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    logoUrl: '',
  });
  const [hasContract, setHasContract] = useState<'sim' | 'nao' | ''>('');
  const [contractMonths, setContractMonths] = useState<number | ''>('');

  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Nome da empresa é obrigatório");
      return;
    }

    if (!hasContract) {
      alert('Selecione se há prazo de contrato: Sim ou Não.');
      return;
    }

    if (hasContract === 'sim') {
      const months = Number(contractMonths);
      if (!months || months <= 0) {
        alert('Informe a quantidade de meses do contrato.');
        return;
      }
    }

    // DEBUG: Log dos dados do formulário
    const clientData: any = {
      id: crypto.randomUUID(),
      name: formData.name!,
      logoUrl: formData.logoUrl || 'https://placehold.co/150x150?text=Logo',
      // extras para o serviço persistir datas
      contractChoice: hasContract || 'nao',
      contractMonths: hasContract === 'sim' ? Number(contractMonths) : undefined,
    };


    onSave(clientData);
    if (isDirty) discardChanges();
  };

  const handleBack = useCallback(() => {
    const canGoBack = requestBack();
    if (canGoBack) onBack();
  }, [requestBack, onBack]);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cadastrar Nova Empresa</h1>
            <p className="text-sm text-slate-500">Adicione um novo cliente ao portfólio</p>
          </div>
        </div>
        <button onClick={handleSubmit} className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-medium">
          <Save className="w-4 h-4" />
          Salvar Empresa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => { markDirty(); setFormData({...formData, name: e.target.value}); }}
                  placeholder="Ex: TechCorp Global"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">URL do Logo (Imagem)</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => { markDirty(); setFormData({...formData, logoUrl: e.target.value}); }}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 ml-1">Cole um link direto para a imagem do logo.</p>
            </div>

            {/* Prazo de Contrato */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prazo de Contrato</label>
              <div className="relative">
                <select
                  value={hasContract}
                  onChange={(e) => { markDirty(); setHasContract(e.target.value as 'sim' | 'nao' | ''); }}
                  className="w-full appearance-none pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                >
                  <option value="" disabled>Selecione uma opção</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-3.5 text-slate-400">▾</span>
              </div>
              {hasContract === 'sim' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Quantidade de meses</label>
                  <input
                    type="number"
                    min={1}
                    value={contractMonths}
                    onChange={(e) => { markDirty(); setContractMonths(e.target.value === '' ? '' : Number(e.target.value)); }}
                    placeholder="Ex: 12"
                    className="w-40 pl-3 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                  />
                  
                </div>
              )}
              {hasContract === 'nao' && null}
            </div>

            {/* Preview */}
            {formData.logoUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-600 mb-2">Pré-visualização:</p>
                <div className="w-32 h-32 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-2 shadow-sm">
                   <img 
                     src={formData.logoUrl} 
                     alt="Logo Preview" 
                     className="w-full h-full object-contain"
                    onError={(e) => (e.currentTarget.src = 'https://placehold.co/150x150?text=Error')}
                     
                   />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      {showPrompt && (
        <ConfirmationModal
          isOpen={true}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Deseja continuar editando ou descartar?"
          confirmText="Continuar editando"
          cancelText="Descartar alterações"
          onConfirm={continueEditing}
          onCancel={() => {
            discardChanges();
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default ClientForm;

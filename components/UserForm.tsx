import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Mail, Briefcase, Shield } from 'lucide-react';

interface UserFormProps {
  initialUser?: User;
  users?: User[];
  onSave: (user: Partial<User>) => void;
  onBack: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ initialUser, users = [], onSave, onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cargo: '',
    role: 'developer' as 'admin' | 'developer',
    active: true
  });

  useEffect(() => {
    if (initialUser) {
      setFormData({
        name: initialUser.name,
        email: initialUser.email,
        cargo: initialUser.cargo || '',
        role: initialUser.role,
        active: initialUser.active
      });
    }
  }, [initialUser]);

  // Extrair cargos únicos da lista de usuários
  const existingCargos = useMemo(() => {

    const cargos = users
      .map(u => {

        return u.cargo;
      })
      .filter((cargo): cargo is string => !!cargo && cargo.trim() !== '');
    const uniqueCargos = Array.from(new Set(cargos)).sort();

    return uniqueCargos;
  }, [users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      alert('Por favor, preencha nome e email.');
      return;
    }

    onSave(initialUser ? { ...formData, id: initialUser.id } : formData);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="px-8 py-6 bg-gradient-to-r from-[#4c1d95] to-purple-600 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <UserIcon className="w-7 h-7 text-purple-200" />
              {initialUser ? 'Editar Desenvolvedor' : 'Novo Desenvolvedor'}
            </h2>
            <p className="text-purple-200 text-sm mt-1">{initialUser ? 'Editar informações do colaborador' : 'Cadastrar novo colaborador na equipe'}</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          className="px-6 py-3 bg-white text-[#4c1d95] rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 hover:scale-105"
        >
          <Save className="w-5 h-5" />
          Salvar
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
            
            {/* Nome */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-purple-600" />
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="João da Silva"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="joao@empresa.com"
                required
              />
            </div>

            {/* Cargo */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                Cargo
              </label>
              <input
                type="text"
                list="cargo-options"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="Desenvolvedor Full Stack"
              />
              <datalist id="cargo-options">
                {existingCargos.map(cargo => (
                  <option key={cargo} value={cargo} />
                ))}
              </datalist>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default UserForm;

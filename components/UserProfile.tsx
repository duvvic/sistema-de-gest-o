import React, { useState } from 'react';
import { User } from '../types';
import { Save, User as UserIcon, Mail, Briefcase, Upload, Trash2, Camera } from 'lucide-react';
import BackButton from './BackButton';

interface UserProfileProps {
  user: User;
  onBack: () => void;
  onSave: (userId: string, avatarUrl: string | null) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onBack, onSave }) => {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onSave(user.id, avatarUrl || null);
    setIsEditing(false);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    onSave(user.id, null);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-[#4c1d95] to-purple-600 flex items-center gap-4">
        <BackButton onClick={onBack} variant="white" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
          <p className="text-purple-100 mt-1">Gerencie suas informações pessoais</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Avatar Section */}
          <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#4c1d95]" />
              Foto de Perfil
            </h2>
            
            <div className="flex flex-col items-center gap-6">
              {/* Avatar Display */}
              <div className="relative">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={user.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-[#4c1d95] shadow-lg"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#4c1d95] to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white">
                    {user.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                {avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Avatar URL Input */}
              <div className="w-full">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  URL da Foto
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setIsEditing(true);
                    }}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="flex-1 p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] focus:border-[#4c1d95] outline-none"
                  />
                  {isEditing && (
                    <button
                      onClick={handleSave}
                      className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-medium shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Cole o link de uma imagem da internet ou faça upload em um serviço como Imgur
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-md space-y-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#4c1d95]" />
              Informações Pessoais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  ID do Colaborador
                </label>
                <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-600 font-mono">
                  #{user.id}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nome Completo
                </label>
                <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 font-medium">
                  {user.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#4c1d95]" />
                  E-mail
                </label>
                <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#4c1d95]" />
                  Cargo
                </label>
                <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800">
                  {user.cargo || 'Não informado'}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Função no Sistema
                </label>
                <div className={`p-3 border-2 rounded-xl font-medium ${
                  user.role === 'admin' 
                    ? 'bg-purple-50 border-purple-200 text-purple-700' 
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  {user.role === 'admin' ? '👑 Administrador' : '💼 Desenvolvedor'}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfile;

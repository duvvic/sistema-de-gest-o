// components/AllProjectsView.tsx - Adaptado para Router
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Plus, Briefcase, CheckSquare } from 'lucide-react';

const AllProjectsView: React.FC = () => {
  const navigate = useNavigate();
  const { projects, clients, tasks, users, projectMembers, error, loading } = useDataController();

  return (
    <div className="h-full flex flex-col p-8">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
            <Briefcase className="w-6 h-6" style={{ color: 'var(--brand)' }} />
            Todos os Projetos
          </h1>
          <p className="mt-1" style={{ color: 'var(--textMuted)' }}>{projects.length} projetos cadastrados</p>
        </div>

        <button
          onClick={() => navigate('/admin/projects/new')}
          className="px-4 py-2 text-white rounded-lg flex items-center gap-2 transition-colors shadow"
          style={{ backgroundColor: 'var(--brand)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brandHover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand)'}
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Lista de Projetos */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--brand)' }}></div>
              <p className="animate-pulse" style={{ color: 'var(--textMuted)' }}>Carregando projetos...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--textMuted)' }}>
            <div className="text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Nenhum projeto cadastrado</p>
              <button
                onClick={() => navigate('/admin/projects/new')}
                className="hover:underline"
                style={{ color: 'var(--brand)' }}
              >
                Criar primeiro projeto
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const client = clients.find(c => c.id === project.clientId);
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const doneTasks = projectTasks.filter(t => t.status === 'Done').length;

              return (
                <button
                  key={project.id}
                  onClick={() => navigate(`/admin/projects/${project.id}`)}
                  className="border-2 rounded-xl p-6 hover:shadow-lg transition-all text-left group"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {/* Cliente Logo */}
                  {client && (
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-8 h-8 rounded p-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bgApp)' }}>
                        <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--textMuted)' }}>{client.name}</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--brand)]" style={{ color: 'var(--textTitle)' }}>
                    {project.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
                      <CheckSquare className="w-4 h-4 text-green-500" />
                      <span>{doneTasks}/{projectTasks.length} tarefas concluídas</span>
                    </div>

                    {project.status && (
                      <div className="text-xs" style={{ color: 'var(--textMuted)' }}>
                        Status: <span className="font-medium" style={{ color: 'var(--text)' }}>{project.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Equipe do Projeto */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex -space-x-2">
                      {projectMembers
                        .filter(pm => pm.projectId === project.id)
                        .map(pm => {
                          const member = users.find(u => u.id === pm.userId);
                          if (!member) return null;
                          return (
                            <div
                              key={member.id}
                              className="w-7 h-7 rounded-full border-2 flex items-center justify-center overflow-hidden"
                              style={{
                                backgroundColor: 'var(--bgApp)',
                                borderColor: 'var(--surface)'
                              }}
                              title={member.name}
                            >
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold" style={{ color: 'var(--textMuted)' }}>
                                  {member.name.substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {projectMembers.filter(pm => pm.projectId === project.id).length === 0 && (
                      <span className="text-[10px] italic" style={{ color: 'var(--textMuted)' }}>Sem equipe</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllProjectsView;

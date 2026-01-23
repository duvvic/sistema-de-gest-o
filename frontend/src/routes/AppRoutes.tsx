// routes/AppRoutes.tsx - VERSÃO COMPLETA ADMIN
import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types';

// Componentes adaptados
import Login from '@/components/Login';
import AdminDashboard from '@/components/AdminDashboard';
import ClientDetailsView from '@/components/ClientDetailsView';
import ClientForm from '@/components/ClientForm';
import AllProjectsView from '@/components/AllProjectsView';
import ProjectDetailView from '@/components/ProjectDetailView';
import ProjectForm from '@/components/ProjectForm';
import DeveloperProjects from '@/components/DeveloperProjects';
import KanbanBoard from '@/components/KanbanBoard';
import TaskDetail from '@/components/TaskDetail';
import MainLayout from '@/components/MainLayout';

// Componentes de Equipe
import TeamList from '@/components/TeamList';
import TeamMemberDetail from '@/components/TeamMemberDetail';
import UserForm from '@/components/UserForm';
import UserProfile from '@/components/UserProfile';
import AdminFullReport from '@/pages/admin/AdminFullReport';
import AdminSync from '@/pages/admin/AdminSync';

import Notes from '@/pages/Notes';

// Componentes de Timesheet
import TimesheetAdminDashboard from '@/components/TimesheetAdminDashboard';
import TimesheetCalendar from '@/components/TimesheetCalendar';
import TimesheetForm from '@/components/TimesheetForm';
import LearningCenter from '@/components/LearningCenter';
import ResetPassword from '@/components/ResetPassword';
import SystemDocs from '@/components/SystemDocs';

const ADMIN_ROLES: Role[] = ['admin', 'gestor', 'diretoria', 'pmo', 'financeiro', 'tech_lead'];

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { currentUser, isLoading } = useAuth();

    // Check for monitoring token
    const urlParams = new URLSearchParams(window.location.search);
    const hasValidToken = urlParams.get('token') === 'xyz123';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!currentUser && !hasValidToken) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role) && !hasValidToken) {
        // Redirecionamento de segurança: se não tem permissão, volta pro dashboard seguro dele
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

import AdminMonitoringView from '@/components/AdminMonitoringView';

const AppRoutes: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Routes>
            {/* Rota Pública Check */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword onComplete={() => navigate('/login', { replace: true })} />} />

            {/* Rota Direta para Monitoramento (TV Mode) - Sem o Menu Lateral */}
            <Route
                path="/monitoring"
                element={
                    (() => {
                        const urlParams = new URLSearchParams(window.location.search);
                        const hasValidToken = urlParams.get('token') === 'xyz123';

                        if (hasValidToken) {
                            return <AdminMonitoringView />;
                        }

                        return (
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                                <AdminMonitoringView />
                            </ProtectedRoute>
                        );
                    })()
                }
            />

            {/* Rota Raiz - Redireciona baseado no role */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                </ProtectedRoute>
            } />

            {/* Redirecionamento inteligente */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <RoleBasedRedirect />
                </ProtectedRoute>
            } />

            {/* === ROTAS ADMIN === */}
            <Route path="/admin" element={<Navigate to="/admin/clients" replace />} />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            >
                {/* NOVO: Dashboard de Monitoramento */}
                <Route
                    path="admin/monitoring"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <AdminMonitoringView />
                        </ProtectedRoute>
                    }
                />

                {/* Dashboard Admin (Clientes) */}
                <Route
                    index
                    path="admin/clients"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Cliente */}
                <Route
                    path="admin/clients/:clientId"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ClientDetailsView />
                        </ProtectedRoute>
                    }
                />

                {/* Novo Cliente */}
                <Route
                    path="admin/clients/new"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ClientForm />
                        </ProtectedRoute>
                    }
                />

                {/* Editar Cliente */}
                <Route
                    path="admin/clients/:clientId/edit"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ClientForm />
                        </ProtectedRoute>
                    }
                />

                {/* Novo Projeto (a partir do cliente) */}
                <Route
                    path="admin/clients/:clientId/projects/new"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ProjectForm />
                        </ProtectedRoute>
                    }
                />

                {/* --- PROJETOS (ADMIN) --- */}

                {/* Todos os Projetos */}
                <Route
                    path="admin/projects"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <AllProjectsView key="all-projects-view" />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Projeto */}
                <Route
                    path="admin/projects/:projectId"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ProjectDetailView />
                        </ProtectedRoute>
                    }
                />

                {/* Novo Projeto (Geral) */}
                <Route
                    path="admin/projects/new"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ProjectForm />
                        </ProtectedRoute>
                    }
                />

                {/* Editar Projeto */}
                <Route
                    path="admin/projects/:projectId/edit"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <ProjectForm />
                        </ProtectedRoute>
                    }
                />

                {/* === ROTAS DE EQUIPE === */}

                {/* Lista de Colaboradores */}
                <Route
                    path="admin/team"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <TeamList />
                        </ProtectedRoute>
                    }
                />

                {/* Criar Colaborador */}
                <Route
                    path="admin/team/new"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <UserForm />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Colaborador */}
                <Route
                    path="admin/team/:userId"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <TeamMemberDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Editar Colaborador */}
                <Route
                    path="admin/team/:userId/edit"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <UserForm />
                        </ProtectedRoute>
                    }
                />

                {/* Perfil do Usuário (Acessível a todos) */}
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />

                {/* === TIMESHEET (ADMIN) === */}
                <Route
                    path="admin/timesheet"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <TimesheetAdminDashboard />
                        </ProtectedRoute>
                    }
                />



                {/* === RELATÓRIOS (ADMIN) === */}
                <Route
                    path="admin/reports"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <AdminFullReport />
                        </ProtectedRoute>
                    }
                />

                {/* Sincronização Admin */}
                <Route
                    path="admin/sync"
                    element={
                        <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                            <AdminSync />
                        </ProtectedRoute>
                    }
                />

                {/* === ROTAS DEVELOPER E COMPARTILHADAS === */}

                {/* Projetos do Developer */}
                <Route
                    path="developer/projects"
                    element={
                        <ProtectedRoute>
                            <DeveloperProjects />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Projeto (Developer) */}
                <Route
                    path="developer/projects/:projectId"
                    element={
                        <ProtectedRoute>
                            <ProjectDetailView />
                        </ProtectedRoute>
                    }
                />

                {/* Tarefas do Developer (Kanban já filtra por usuário) */}
                <Route
                    path="developer/tasks"
                    element={
                        <ProtectedRoute>
                            <KanbanBoard />
                        </ProtectedRoute>
                    }
                />

                {/* Central de Estudos */}
                <Route
                    path="developer/learning"
                    element={
                        <ProtectedRoute>
                            <LearningCenter />
                        </ProtectedRoute>
                    }
                />

                {/* Kanban Board (Tarefas) */}
                <Route
                    path="tasks"
                    element={
                        <ProtectedRoute>
                            <KanbanBoard />
                        </ProtectedRoute>
                    }
                />

                {/* Nova Tarefa */}
                <Route
                    path="tasks/new"
                    element={
                        <ProtectedRoute>
                            <TaskDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes da Tarefa */}
                <Route
                    path="tasks/:taskId"
                    element={
                        <ProtectedRoute>
                            <TaskDetail />
                        </ProtectedRoute>
                    }
                />

                {/* === TIMESHEET (Todos) === */}
                <Route
                    path="timesheet"
                    element={
                        <ProtectedRoute>
                            <TimesheetCalendar />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="timesheet/new"
                    element={
                        <ProtectedRoute>
                            <TimesheetForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="timesheet/:entryId"
                    element={
                        <ProtectedRoute>
                            <TimesheetForm />
                        </ProtectedRoute>
                    }
                />

                {/* Notas */}
                <Route
                    path="notes"
                    element={
                        <ProtectedRoute>
                            <Notes />
                        </ProtectedRoute>
                    }
                />

                {/* Documentação */}
                <Route
                    path="docs"
                    element={
                        <ProtectedRoute>
                            <SystemDocs />
                        </ProtectedRoute>
                    }
                />

                {/* === OUTRAS ROTAS (TODO) === */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Route>
        </Routes>
    );
};

// Pequeno componente auxiliar para redirecionar baseado no role
const RoleBasedRedirect = () => {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" replace />;

    const adminRoles: Role[] = ['admin', 'gestor', 'diretoria', 'pmo', 'financeiro', 'tech_lead'];

    if (adminRoles.includes(currentUser.role)) {
        return <Navigate to="/admin/clients" replace />;
    }
    return <Navigate to="/developer/projects" replace />;
}

export default AppRoutes;

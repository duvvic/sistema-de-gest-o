// contexts/AuthContext.tsx
// Context para gerenciar autenticação e usuário logado

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar usuário do sessionStorage ao iniciar
    useEffect(() => {
        const loadUser = async () => {
            console.log('[Auth] Iniciando loadUser...');
            try {
                // Primeiro tenta carregar da sessão do Supabase com timeout
                const sessionPromise = supabase.auth.getSession();
                let session = null;
                let sessionError = null;

                try {
                    const { data, error } = await Promise.race([
                        sessionPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                    ]) as any;
                    session = data?.session;
                    sessionError = error;
                } catch (e) {
                    console.warn('[Auth] Timeout na verificação de sessão, tentando fallback local...');
                }

                if (sessionError) {
                    console.error('[Auth] Erro ao buscar sessão:', sessionError);
                }

                if (session?.user) {
                    console.log('[Auth] Sessão encontrada para:', session.user.email);
                    // Buscar dados completos do usuário
                    const { data: userData, error } = await supabase
                        .from('dim_colaboradores')
                        .select('*')
                        .eq('E-mail', session.user.email)
                        .maybeSingle();

                    if (error) {
                        console.error('[Auth] Erro ao buscar dados do usuário:', error);
                    }

                    if (userData) {
                        console.log('[Auth] Dados do usuário carregados:', userData.NomeColaborador);
                        const user: User = {
                            id: String(userData.ID_Colaborador),
                            name: userData.NomeColaborador,
                            email: userData['E-mail'] || userData.email,
                            role: userData.papel === 'Administrador' ? 'admin' : 'developer',
                            avatarUrl: userData.avatar_url,
                            cargo: userData.cargo,
                            active: userData.ativo ?? true,
                        };
                        setCurrentUser(user);
                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                    } else {
                        console.warn('[Auth] Usuário não encontrado no banco de dados');
                        setCurrentUser(null);
                        sessionStorage.removeItem('currentUser');
                        alert('Usuário não encontrado no banco. Faça login novamente.');
                    }
                } else {
                    console.log('[Auth] Nenhuma sessão Supabase encontrada, tentando fallback...');
                    // Fallback para sessionStorage
                    const storedUser = sessionStorage.getItem('currentUser');
                    if (storedUser) {
                        console.log('[Auth] Usuário carregado do sessionStorage');
                        setCurrentUser(JSON.parse(storedUser));
                    } else {
                        console.log('[Auth] Nenhum usuário encontrado no sessionStorage');
                        setCurrentUser(null);
                    }
                }
            } catch (error) {
                console.error('[Auth] Erro FATAL ao carregar usuário:', error);
                setCurrentUser(null);
                alert('Erro ao carregar usuário. Faça login novamente.');
            } finally {
                console.log('[Auth] Finalizando loadUser, isLoading = false');
                setIsLoading(false);
            }
        };

        loadUser();
    }, []);

    // Listener para mudanças de autenticação
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                sessionStorage.removeItem('currentUser');
            } else if (event === 'SIGNED_IN' && session?.user) {
                const { data: userData } = await supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .eq('E-mail', session.user.email)
                    .maybeSingle();

                if (userData) {
                    const user: User = {
                        id: String(userData.ID_Colaborador),
                        name: userData.NomeColaborador,
                        email: userData['E-mail'] || userData.email,
                        role: userData.papel === 'Administrador' ? 'admin' : 'developer',
                        avatarUrl: userData.avatar_url,
                        cargo: userData.cargo,
                        active: userData.ativo ?? true,
                    };
                    setCurrentUser(user);
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
        supabase.auth.signOut();
    };

    const updateUser = (user: User) => {
        setCurrentUser(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    };

    return (
        <AuthContext.Provider value={{ currentUser, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

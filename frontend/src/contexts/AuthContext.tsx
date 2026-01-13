// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { supabase } from '@/services/supabaseClient';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    authReady: boolean;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para normalização consistente de e-mail
export const normalizeEmail = (email: string | undefined | null): string => {
    return (email || '').trim().toLowerCase();
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);

    const mapUserDataToUser = useCallback((userData: any): User => {
        const papel = String(userData.papel || '').trim().toLowerCase();
        // admin se papel (case-insensitive) contém “admin” => 'admin' senão 'developer'
        const role = papel.includes('admin') ? 'admin' : 'developer';

        return {
            id: String(userData.ID_Colaborador),
            name: userData.NomeColaborador,
            email: userData.email || userData['E-mail'],
            role: role,
            avatarUrl: userData.avatar_url,
            cargo: userData.Cargo || userData.cargo, // Prioriza Cargo (Maiúsculo) do banco
            active: userData.ativo ?? true,
        } as User;
    }, []);

    const loadUserFromSession = useCallback(async (session: any) => {
        if (!session?.user?.email) {
            console.log('[Auth] Sem e-mail na sessão, abortando carga de dados.');
            setCurrentUser(null);
            setAuthReady(true);
            setIsLoading(false);
            return;
        }

        const emailToFind = session.user.email.trim().toLowerCase();

        // Evita recarregar se já tivermos o usuário correto carregado
        if (currentUser?.email?.toLowerCase() === emailToFind) {
            console.log('[Auth] Usuário já carregado:', emailToFind);
            setAuthReady(true);
            setIsLoading(false);
            return;
        }

        console.log('[Auth] Carregando dados do banco para:', emailToFind);

        try {
            console.log('[Auth] Iniciando busca em dim_colaboradores (Timeout 12s)...');

            // Cria uma promessa que rejeita após 12 segundos (aumentado de 4s para estabilidade)
            const queryTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Banco de dados não respondeu a tempo (Timeout)')), 12000)
            );

            // Corre a query contra o timeout
            const userData = await Promise.race([
                supabase
                    .from('dim_colaboradores')
                    .select('*')
                    .or(`email.eq.${emailToFind}, "E-mail".eq.${emailToFind}`) // Tenta as duas colunas
                    .maybeSingle()
                    .then(res => {
                        if (res.error) throw res.error;
                        return res.data;
                    }),
                queryTimeout
            ]) as any;

            console.log('[Auth] Resposta recebida:', userData ? 'Usuário identificado' : 'Usuário não cadastrado no banco');

            if (userData) {
                setCurrentUser(mapUserDataToUser(userData));
            } else {
                // Fallback mínimo se não encontrar no banco
                console.warn('[Auth] Usuário não encontrado em dim_colaboradores, usando perfil básico.');
                setCurrentUser({
                    id: session.user.id,
                    name: session.user.email.split('@')[0],
                    email: session.user.email,
                    role: 'developer',
                    active: true,
                } as any);
            }
        } catch (err: any) {
            console.error('[Auth] Erro crítico no loadUser (usando fallback):', err.message || err);
            // Fallback imediato: se o banco falhar, não trancamos o usuário.
            setCurrentUser({
                id: session.user.id,
                name: session.user.email?.split('@')[0] || 'Usuário',
                email: session.user.email,
                role: 'developer',
                active: true,
            } as User);
        } finally {
            setAuthReady(true);
            setIsLoading(false);
        }
    }, [mapUserDataToUser, currentUser?.email]);

    useEffect(() => {
        console.log('[Auth] Inicializando AuthProvider...');
        let isMounted = true;

        // Unlock UI if initialization takes too long
        const safetyTimeout = setTimeout(() => {
            if (isMounted) {
                setAuthReady(current => {
                    if (!current) {
                        console.warn('[Auth] Safety timeout! Desbloqueando UI.');
                        setIsLoading(false);
                        return true;
                    }
                    return current;
                });
            }
        }, 15000);

        // Função única para inicializar
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    console.log('[Auth] Sessão inicial:', session ? 'Encontrada' : 'Nenhuma');
                    if (session) {
                        await loadUserFromSession(session);
                    } else {
                        setAuthReady(true);
                        setIsLoading(false);
                    }
                }
            } catch (err) {
                console.error('[Auth] Erro na inicialização:', err);
                if (isMounted) {
                    setAuthReady(true);
                    setIsLoading(false);
                }
            }
        };

        initAuth();

        // Listener para mudanças de estado de autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Evento detectado:', event);

            if (!isMounted) return;

            if (event === 'SIGNED_OUT') {
                setCurrentUser(null);
                setAuthReady(true);
                setIsLoading(false);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session) {
                    await loadUserFromSession(session);
                }
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(safetyTimeout);
            subscription.unsubscribe();
        };
    }, [loadUserFromSession]);

    const login = (user: User) => {
        setCurrentUser(user);
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut({ scope: 'global' });
        } catch (err) {
            console.error('[Auth] Erro ao deslogar do Supabase:', err);
        } finally {
            setCurrentUser(null);
            // Limpeza radical de cache local
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.includes('supabase')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (e) {
                localStorage.clear();
            }
        }
    };

    const updateUser = (user: User) => {
        setCurrentUser(user);
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            isLoading: !authReady || isLoading,
            authReady,
            login,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

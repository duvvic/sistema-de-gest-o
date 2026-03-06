// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
import { User } from '@/types';
import { apiRequest } from '@/services/apiClient';

interface AuthContextType {
    currentUser: User | null;
    isLoading: boolean;
    authReady: boolean;
    isAdmin: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_CACHE_KEY = 'nic_labs_user_profile';
const AUTH_TOKEN_KEY = 'nic_labs_auth_token';

export const normalizeEmail = (email: string | undefined | null): string => {
    return (email || '').trim().toLowerCase();
};

export function AuthProvider({ children }: PropsWithChildren) {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const cached = localStorage.getItem(USER_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);

    const init = useCallback(async () => {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        const cachedUser = localStorage.getItem(USER_CACHE_KEY);

        if (!token || !cachedUser) {
            setCurrentUser(null);
            setAuthReady(true);
            setIsLoading(false);
            return;
        }

        try {
            // Opcional: Validar token com o backend (/api/auth/me ou similar)
            // Por enquanto, confiamos no cache e o apiClient lidará com 401
            setCurrentUser(JSON.parse(cachedUser));
        } catch (e) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_CACHE_KEY);
            setCurrentUser(null);
        } finally {
            setAuthReady(true);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    const login = (user: User, token: string) => {
        setCurrentUser(user);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem(USER_CACHE_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = '/login';
    };

    const updateUser = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    };

    const isAdmin = !!currentUser && [
        'admin', 'gestor', 'diretoria', 'pmo', 'financeiro',
        'tech_lead', 'system_admin', 'executive', 'ceo'
    ].includes(currentUser.role);

    return (
        <AuthContext.Provider value={{
            currentUser,
            isLoading: !authReady || isLoading,
            authReady,
            isAdmin,
            login,
            logout,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

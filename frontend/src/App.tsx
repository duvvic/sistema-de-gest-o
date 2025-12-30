// App.tsx - Versão com React Router
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos de dados "frescos"
            gcTime: 1000 * 60 * 30,    // 30 minutos em cache
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

import { RealtimeInitializer } from './components/RealtimeInitializer';

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <RealtimeInitializer />
            <BrowserRouter>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;

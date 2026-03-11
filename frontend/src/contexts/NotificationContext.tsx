import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface NotificationContextType {
    showDeleteSuccess: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

    const showDeleteSuccess = useCallback((message: string) => {
        setDeleteSuccess(message);
        setTimeout(() => setDeleteSuccess(null), 1000); // 1 segundo
    }, []);

    const value = React.useMemo(() => ({ showDeleteSuccess }), [showDeleteSuccess]);

    return (
        <NotificationContext.Provider value={value}>
            {children}

            <AnimatePresence>
                {deleteSuccess && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, y: -200, scale: 0.8, transition: { duration: 0.3, ease: "circIn" } }}
                            className="bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-emerald-400/50 flex flex-col items-center gap-2 backdrop-blur-md"
                        >
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-1">
                                <Trash2 className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-lg font-black tracking-tight uppercase">{deleteSuccess}</span>
                            <div className="flex gap-1 mt-2">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
};

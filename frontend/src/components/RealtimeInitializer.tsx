import React from 'react';
import { useAppRealtime } from '@/hooks/useAppRealtime';

export const RealtimeInitializer: React.FC = () => {
    useAppRealtime();
    return null; // This component renders nothing
};

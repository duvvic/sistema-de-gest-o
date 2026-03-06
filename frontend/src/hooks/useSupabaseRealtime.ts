import { useEffect } from 'react';

/**
 * Hook para escutar mudanças em tempo real (DESATIVADO).
 * A comunicação agora é 100% via API backend.
 */
export function useSupabaseRealtime(_table: string, _onChange: (payload: any) => void) {
  useEffect(() => {
    // Realtime desativado para garantir segurança e performance.
    // O sistema utiliza poll/revalidate via backend.
    console.warn('[Realtime] Supabase Realtime está desativado no frontend.');
  }, []);
}

// services/supabaseClient.ts
// Configuração do cliente Supabase

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis do Supabase não configuradas. Verifique o arquivo .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

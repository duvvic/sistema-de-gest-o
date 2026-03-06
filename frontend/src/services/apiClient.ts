// frontend/src/services/api.ts (ou o nome do seu arquivo de api)

const AUTH_TOKEN_KEY = 'nic_labs_auth_token';
let cachedApiUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
    // Tenta pegar do .env do Vite
    const envUrl = import.meta.env.VITE_API_URL?.toString()?.trim();

    if (envUrl && envUrl !== 'undefined' && envUrl !== '') {
        let url = envUrl.replace(/\/$/, '');
        if (!url.endsWith('/api')) url += '/api';
        cachedApiUrl = url;
        return url;
    }

    if (cachedApiUrl) return cachedApiUrl;

    // EM PRODUÇÃO: Se não houver VITE_API_URL, o app falharia aqui.
    // Para o Caminho A (Supabase), não queremos o localhost:3000 como padrão.
    // Retornamos vazio ou a URL do Supabase como último recurso para evitar o erro de localhost
    const supabaseFallback = import.meta.env.VITE_SUPABASE_URL;
    return supabaseFallback ? `${supabaseFallback}/rest/v1` : '';
}

/**
 * Aplica transformações específicas para o PostgREST do Supabase.
 */
function applyPostgrestTransformations(path: string, options: RequestInit): { finalPath: string; fetchOptions: RequestInit } {
    let finalPath = path;
    const fetchOptions = { ...options };

    if (finalPath.startsWith('/support/')) {
        finalPath = finalPath.replace('/support/', '/support_');
    }
    if (finalPath.includes('/audit-logs')) {
        finalPath = finalPath.replace('/audit-logs', '/audit_logs');
    }

    const urlParts = finalPath.split('?')[0].split('/');
    const lastPart = urlParts.at(-1);
    if (urlParts.length > 2 && lastPart && !Number.isNaN(Number(lastPart))) {
        urlParts.pop();
        const resource = urlParts.join('/');
        finalPath = `${resource}?id=eq.${lastPart}${finalPath.includes('?') ? '&' + finalPath.split('?')[1] : ''}`;
    }

    if (fetchOptions.method === 'PUT') {
        fetchOptions.method = 'PATCH';
    }

    if (finalPath.includes('?')) {
        const [urlStr, paramsStr] = finalPath.split('?');
        const searchParams = new URLSearchParams(paramsStr);
        const postgrestReserves = new Set(['select', 'limit', 'offset', 'order', 'columns', 'or', 'and']);
        const suspiciousKeys: string[] = [];

        searchParams.forEach((val, key) => {
            if (!postgrestReserves.has(key) && !val.includes('.')) {
                suspiciousKeys.push(key);
            }
        });

        suspiciousKeys.forEach(k => searchParams.delete(k));
        const newQuery = searchParams.toString();
        finalPath = newQuery ? `${urlStr}?${newQuery}` : urlStr;
    }

    return { finalPath, fetchOptions };
}

/**
 * Helper centralizado para chamadas à API
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await getApiBaseUrl();
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!baseUrl) throw new Error("Configuração da API não encontrada.");

    const isPostgrest = baseUrl.includes('.supabase.co/rest/v1');
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    let finalPath = path;
    let fetchOptions = { ...options };

    if (isPostgrest) {
        ({ finalPath, fetchOptions } = applyPostgrestTransformations(path, options));
    }

    if (!finalPath.startsWith('/')) finalPath = '/' + finalPath;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'ngrok-skip-browser-warning': 'true',
        'Prefer': 'return=representation',
        ...(options.headers as any),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}${finalPath}`, { ...fetchOptions, headers });

    if (response.status === 401) localStorage.removeItem(AUTH_TOKEN_KEY);

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const text = await response.text();
            const errJson = JSON.parse(text);
            errorMsg = errJson.error || errorMsg;
        } catch (e) { }
        throw new Error(`Erro na API (${response.status}): ${errorMsg}`);
    }

    if (response.status === 204) return {} as T;
    const result = await response.json();

    if (result && typeof result === 'object' && 'success' in result) {
        if (!result.success) throw new Error(result.error || 'Erro desconhecido na API');
        return result.data as T;
    }

    return result as T;
}

/**
 * Helper para download de arquivos (Blob)
 */
export async function apiDownload(path: string, options: RequestInit = {}): Promise<Blob> {
    const baseUrl = await getApiBaseUrl();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    const headers: Record<string, string> = {
        'apikey': supabaseKey,
        'ngrok-skip-browser-warning': 'true',
        ...(options.headers as any),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Download Error ${response.status}: ${text || response.statusText}`);
    }

    return response.blob();
}

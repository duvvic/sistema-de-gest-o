const AUTH_TOKEN_KEY = 'nic_labs_auth_token';
let cachedApiUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
    const envUrl = (import.meta as any).env?.VITE_API_URL?.toString()?.trim();
    if (envUrl && envUrl !== 'undefined') {
        let url = envUrl.replace(/\/$/, '');
        if (!url.endsWith('/api')) url += '/api';
        cachedApiUrl = url;
        return url;
    }
    if (cachedApiUrl) return cachedApiUrl;
    return 'http://localhost:3000/api'; // Ajustado para porta padrão do backend 3000
}

/**
 * Helper centralizado para chamadas à API com autenticação via JWT local
 */
export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = await getApiBaseUrl();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
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

    if (response.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem(AUTH_TOKEN_KEY);
        // window.location.href = '/login'; // Opcional: Redirecionamento forçado
    }

    if (!response.ok) {
        const text = await response.text();
        let errorMsg = response.statusText;
        try {
            const errJson = JSON.parse(text);
            errorMsg = errJson.error || errorMsg;
        } catch (e) {
            // No JSON error format
        }
        throw new Error(`Erro na API (${response.status}): ${errorMsg}`);
    }

    if (response.status === 204) return {} as T;

    const result = await response.json();

    // Suporte ao wrapper { success: true, data: ... }
    if (result && typeof result === 'object' && 'success' in result) {
        if (!result.success) {
            throw new Error(result.error || 'Erro desconhecido na API');
        }
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

    const headers: Record<string, string> = {
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

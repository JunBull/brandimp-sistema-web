const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000/api';

export function getStoredUser(): any | null {
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('brandimp_user');
        if (raw) {
            try {
                return JSON.parse(raw);
            } catch (e) {
                return null;
            }
        }
    }
    return null;
}

export function setStoredUser(user: any | null) {
    if (typeof window !== 'undefined') {
        if (user) {
            localStorage.setItem('brandimp_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('brandimp_user');
        }
    }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = new Headers(options.headers || {});
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    // El token viaja en las cookies HttpOnly automáticamente con credentials: 'include'
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
        setStoredUser(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Sesión expirada o no autorizada');
    }

    if (!response.ok) {
        let errorMsg = `Error ${response.status}: ${response.statusText}`;
        try {
            const errData = await response.json();
            if (errData.detail) errorMsg = errData.detail;
            else if (errData.error) errorMsg = errData.error;
            else if (typeof errData === 'object') {
                const keys = Object.keys(errData);
                if (keys.length > 0) {
                    const firstVal = errData[keys[0]];
                    errorMsg = Array.isArray(firstVal) ? `${keys[0]}: ${firstVal[0]}` : `${keys[0]}: ${firstVal}`;
                }
            }
        } catch (e) {
            // fallback text
        }
        throw new Error(errorMsg);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

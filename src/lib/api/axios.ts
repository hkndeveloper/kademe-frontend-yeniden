import axios from 'axios';
import { useAuth } from '@/store/useAuth';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const isProduction = process.env.NODE_ENV === 'production';

function resolveApiBaseUrl() {
    if (rawApiUrl) return rawApiUrl;
    if (!isProduction) return 'http://localhost:8000/api';
    if (typeof window !== 'undefined') return `${window.location.origin}/api`;
    return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();
if (isProduction && !rawApiUrl && typeof window !== 'undefined') {
    // Production'da env unutuldugunda sessiz localhost fallback yerine gozlemlenebilir uyarı.
    console.warn('NEXT_PUBLIC_API_URL tanimli degil; API cagrilari mevcut origin /api uzerinden yapilacak.');
}

/** Dev'de `php artisan serve` tek istek alır; paralel çağrılar sıraya girer. DB yavaşsa 15s yetmeyebilir. */
const apiTimeoutMs = isProduction ? 15_000 : 60_000;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: apiTimeoutMs,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Sanctum CSRF cookie desteği için
});

// CSRF çerezi için yardımcı fonksiyon (API öneki olmadan)
export const getCsrfCookie = () => {
    const rootUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    return api.get(`${rootUrl}/sanctum/csrf-cookie`);
};

// İstek gitmeden hemen önce araya gir (Token Ekle)
api.interceptors.request.use(
    (config) => {
        const token = useAuth.getState().token;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Cevap döndüğünde araya gir (Hata Yönetimi)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;
            
            // Eğer Yetkisiz girişse
            if (status === 401) {
                // Token temizle ve logine at
                useAuth.getState().logout();
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
            }

            // KVKK veya Kara Liste engeline takıldıysa
            if (status === 403) {
                const data = error.response.data as { error?: string; must_change_password?: boolean } | undefined;
                const errType = data?.error;
                if (data?.must_change_password && typeof window !== 'undefined') {
                    useAuth.getState().logout();
                    window.location.href = '/auth/forgot-password?notice=setup';
                }
                if (errType === 'kvkk_required' && typeof window !== 'undefined') {
                    window.location.href = '/auth/kvkk-consent';
                }
                if (errType === 'blacklisted') {
                    alert('Hesabınız sistem kuralları gereği kısıtlanmıştır.');
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;

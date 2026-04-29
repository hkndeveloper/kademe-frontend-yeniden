import axios from 'axios';
import { useAuth } from '@/store/useAuth';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Sanctum CSRF cookie desteği için
});

// CSRF çerezi için yardımcı fonksiyon (API öneki olmadan)
export const getCsrfCookie = () => {
    const rootUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace('/api', '');
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
                const errType = error.response.data?.error;
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

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

/** Clé distincte de `noura-auth` : les deux espaces peuvent cohabiter dans le même navigateur. */
export const AUTH_STORAGE_KEY = 'edusen-platform-auth';

export const apiClient = axios.create({ baseURL: BASE_URL, timeout: 20_000 });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const token = JSON.parse(raw)?.state?.session?.accessToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // session illisible — la requête partira sans jeton
    }
  }
  // Aucun `x-tenant-id` : l'espace plateforme travaille hors tenant.
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Seul un 401 invalide la session. Un 5xx est une panne, pas une déconnexion.
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

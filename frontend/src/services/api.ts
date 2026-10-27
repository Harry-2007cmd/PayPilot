import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// Orders API
export const ordersApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; search?: string }) =>
    api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  create: (data: {
    source_type: string;
    external_order_id: string;
    currency: string;
    total_amount: string | number;
    status?: string;
    provenance: string;
    metadata_json?: Record<string, unknown>;
  }) => api.post('/orders', data),
  update: (id: string, data: Partial<{ status: string; total_amount: string; metadata_json: Record<string, unknown> }>) =>
    api.patch(`/orders/${id}`, data),
};

// PayPal API
export const paypalApi = {
  createOrder: (orderId: string) => api.post(`/paypal/orders/${orderId}/create`),
  captureOrder: (orderId: string) => api.post(`/paypal/orders/${orderId}/capture`),
};

// Payments API
export const paymentsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get('/payments', { params }),
  get: (id: string) => api.get(`/payments/${id}`),
  timeline: (id: string) => api.get(`/payments/${id}/timeline`),
};

// Webhooks API
export const webhooksApi = {
  status: () => api.get('/webhooks/status'),
};

// Investigations API
export const investigationsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string; issue_type?: string; priority?: string }) =>
    api.get('/investigations', { params }),
  get: (id: string) => api.get(`/investigations/${id}`),
  create: (data: {
    issue_type: string;
    title: string;
    order_id?: string;
    payment_attempt_id?: string;
    priority?: string;
  }) => api.post('/investigations', data),
  update: (id: string, data: Partial<{ status: string; priority: string; title: string; resolved_at: string }>) =>
    api.patch(`/investigations/${id}`, data),
  run: (id: string) => api.post(`/investigations/${id}/run`),
  aiInvestigate: (data: { question: string; investigation_id?: string; order_id?: string; payment_attempt_id?: string }) =>
    api.post('/investigations/ai/investigate', data),
};

// Actions API
export const actionsApi = {
  listProposed: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get('/proposed-actions', { params }),
  create: (data: {
    investigation_id: string;
    action_type: string;
    target_capture_id: string;
    currency: string;
    amount: string | number;
    reason: string;
    idempotency_key: string;
  }) => api.post(`/investigations/${data.investigation_id}/proposed-actions`, data),
  approve: (id: string, approved: boolean = true) =>
    api.post(`/proposed-actions/${id}/approve`, { approved }),
  reject: (id: string) => api.post(`/proposed-actions/${id}/reject`),
  listAudit: (params?: { page?: number; page_size?: number; action?: string; target_type?: string }) =>
    api.get('/audit-events', { params }),
};

// Imports API
export const importsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get('/imports', { params }),
  get: (id: string) => api.get(`/imports/${id}`),
  preview: (file: File, sourceLabel: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_label', sourceLabel);
    return api.post('/imports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  confirm: (importId: string) => api.post('/imports/confirm', { import_id: importId, confirm: true }),
};

export default api;
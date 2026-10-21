const API_BASE = '/api';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('quizforge_token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (email: string, password: string, displayName: string) =>
    apiRequest<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    }),
  getMe: () => apiRequest<{ user: any }>('/auth/me'),

  // Collections
  getCollections: () => apiRequest<{ collections: any[] }>('/collections'),
  getCollection: (id: string) => apiRequest<{ collection: any; documents: any[]; topics: any[] }>(`/collections/${id}`),
  createCollection: (name: string, description: string) =>
    apiRequest<{ collection: any }>('/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),
  updateCollection: (id: string, name: string, description: string) =>
    apiRequest<{ collection: any }>(`/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description })
    }),
  deleteCollection: (id: string) =>
    apiRequest<{ success: boolean }>(`/collections/${id}`, { method: 'DELETE' }),

  // Documents
  getDocuments: () => apiRequest<{ documents: any[] }>('/documents'),
  getDocument: (id: string) => apiRequest<{ document: any }>(`/documents/${id}`),
  uploadDocuments: (formData: FormData) =>
    apiRequest<{ documents: any[] }>('/documents/upload', {
      method: 'POST',
      body: formData
    }),
  processDocument: (id: string) =>
    apiRequest<{ success: boolean }>(`/documents/${id}/process`, { method: 'POST' }),
  deleteDocument: (id: string) =>
    apiRequest<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  // Questions
  getQuestions: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v));
      }
    }
    return apiRequest<{ questions: any[]; total: number }>(`/questions?${qs.toString()}`);
  },
  getQuestion: (id: string) => apiRequest<{ question: any }>(`/questions/${id}`),
  updateQuestion: (id: string, updates: any) =>
    apiRequest<{ question: any }>(`/questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),
  deleteQuestion: (id: string) =>
    apiRequest<{ success: boolean }>(`/questions/${id}`, { method: 'DELETE' }),
  bulkUpdateQuestions: (questionIds: string[], updates: any) =>
    apiRequest<{ success: boolean; count: number }>('/questions/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ questionIds, ...updates })
    }),
  bulkDeleteQuestions: (questionIds: string[]) =>
    apiRequest<{ success: boolean; count: number }>('/questions/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ questionIds })
    }),
  toggleBookmark: (id: string) =>
    apiRequest<{ isBookmarked: boolean }>(`/questions/${id}/bookmark`, { method: 'POST' }),
  saveNote: (id: string, noteText: string) =>
    apiRequest<{ success: boolean; note: string }>(`/questions/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ noteText })
    }),
  getDuplicates: (params: Record<string, any> = {}) => {
    const qs = new URLSearchParams(params as any);
    return apiRequest<{ duplicates: any[] }>(`/questions/duplicates?${qs.toString()}`);
  },

  // Quizzes
  generateQuiz: (config: any) =>
    apiRequest<{ sessionId: string; totalQuestions: number; requestedCount: any; fewerAvailable: boolean }>('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  getQuizSession: (id: string) =>
    apiRequest<{ session: any; questions: any[] }>(`/quizzes/${id}`),
  saveQuizResponse: (sessionId: string, questionId: string, response: any, isMarkedForReview: boolean = false) =>
    apiRequest<{ success: boolean }>(`/quizzes/${sessionId}/responses`, {
      method: 'POST',
      body: JSON.stringify({ questionId, response, isMarkedForReview })
    }),
  submitQuiz: (sessionId: string, timeTaken: number) =>
    apiRequest<{ success: boolean; report: any }>(`/quizzes/${sessionId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ timeTaken })
    }),
  retryQuiz: (sessionId: string, mode: 'all' | 'incorrect_only' | 'unanswered_only' = 'all') =>
    apiRequest<{ sessionId: string; totalQuestions: number }>(`/quizzes/${sessionId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ mode })
    }),
  getQuizHistory: () => apiRequest<{ history: any[] }>('/quizzes/history/all'),

  // Analytics
  getAnalytics: () =>
    apiRequest<{ overview: any; recentTrends: any[]; topicStats: any[]; recommendations: any }>('/analytics/overview'),

  // Settings
  getSettings: () => apiRequest<{ settings: any }>('/settings'),
  updateSettings: (settings: any) =>
    apiRequest<{ success: boolean }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }),
  testAIConnection: (provider: string, apiKey: string) =>
    apiRequest<{ success: boolean; message: string }>('/settings/test-ai', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey })
    })
};

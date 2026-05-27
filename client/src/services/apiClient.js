import { addToSyncQueue, getSyncQueue, removeFromSyncQueue } from './db';

const BASE = '/api';

function getToken() {
  return localStorage.getItem('saathi_token');
}

async function fetchWithRetry(url, options, retries = 3, backoff = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
    }
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetchWithRetry(`${BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      if (options.method && options.method !== 'GET') {
        await addToSyncQueue({ url: path, method: options.method, body: options.body, headers });
        console.log(`[Offline Sync] Queued ${options.method} request to ${path}`);
      }
      throw new Error('OFFLINE');
    }
    throw err;
  }
}

export async function flushSyncQueue() {
  if (!navigator.onLine) return;
  try {
    const queue = await getSyncQueue();
    for (const req of queue) {
      try {
        const res = await fetch(`${BASE}${req.url}`, {
          method: req.method,
          body: req.body,
          headers: req.headers
        });
        if (res.ok || res.status >= 400) {
          // If successful or it's a client/server error that isn't a network error, remove it from queue
          await removeFromSyncQueue(req.id);
          console.log(`[Offline Sync] Synced request ${req.id} to ${req.url}`);
        }
      } catch (e) {
        console.error('[Offline Sync] Failed to sync request, will retry later', e);
        break; 
      }
    }
  } catch (err) {
    console.error('[Offline Sync] Error accessing queue', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushSyncQueue);
  if (navigator.onLine) {
    setTimeout(flushSyncQueue, 2000);
  }
}

export const api = {
  // Auth
  createGuestSession: (payload) => request('/auth/guest', { method: 'POST', body: JSON.stringify(payload) }),
  signUp: (payload, guestToken) => request('/auth/signup', { 
    method: 'POST', 
    body: JSON.stringify(payload),
    headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : {}
  }),
  signIn: (payload) => request('/auth/signin', { method: 'POST', body: JSON.stringify(payload) }),
  updatePreferences: (payload) => request('/auth/preferences', { method: 'PUT', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  deleteAccount: () => request('/auth/delete', { method: 'DELETE' }),
  checkUsername: (username) => request(`/auth/check-username/${encodeURIComponent(username)}`),

  // Chat
  sendMessage: (payload) => request('/chat/message', { method: 'POST', body: JSON.stringify(payload) }),
  getChatHistory: (limit = 50) => request(`/chat/history?limit=${limit}`),
  syncMessages: (messages) => request('/chat/sync', { method: 'POST', body: JSON.stringify({ messages }) }),

  // Mood
  checkIn: (payload) => request('/mood/checkin', { method: 'POST', body: JSON.stringify(payload) }),
  getMoodTimeline: (days = 30) => request(`/mood/timeline?days=${days}`),
  getMoodInsights: () => request('/mood/insights'),
  syncMoods: (entries) => request('/mood/sync', { method: 'POST', body: JSON.stringify({ entries }) }),

  // Wellness
  getActivities: (lang = 'en') => request(`/wellness/activities?lang=${lang}`),
  saveSession: (payload) => request('/wellness/session', { method: 'POST', body: JSON.stringify(payload) }),
  saveJournal: (payload) => request('/wellness/journal', { method: 'POST', body: JSON.stringify(payload) }),
  analyzeJournal: (payload) => request('/wellness/journal/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  getJournals: () => request('/wellness/journal'),
  getStats: () => request('/wellness/stats'),
  getPlatformStats: () => request('/platform/stats'),

  // Health
  health: () => request('/health'),
};

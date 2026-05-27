import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/apiClient';
import { saveProfile, getProfile } from '../services/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('saathi_token');
      if (token) {
        try {
          const profile = await api.getMe();
          if (profile && profile.id) {
            setUser(profile);
            await saveProfile(profile);
          } else {
            // Invalid profile response — clear stale token
            localStorage.removeItem('saathi_token');
          }
        } catch (err) {
          // If 403/401, token is invalid — clear it
          if (err.message && (err.message.includes('403') || err.message.includes('401') || err.message.includes('Invalid') || err.message.includes('expired'))) {
            localStorage.removeItem('saathi_token');
          } else {
            // Genuinely offline — fallback to cached profile
            const cached = await getProfile();
            if (cached) setUser(cached);
            else localStorage.removeItem('saathi_token');
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const startGuestSession = async ({ nickname = 'Friend', language = 'en', voice_preference = false } = {}) => {
    const data = await api.createGuestSession({ nickname, language, voice_preference });
    localStorage.setItem('saathi_token', data.token);
    localStorage.setItem('saathi_lang', language);
    const profile = { id: data.userId, nickname, language, voice_preference, isGuest: true };
    await saveProfile(profile);
    setUser(profile);
    return profile;
  };

  const signUp = async ({ username, password, nickname }) => {
    // If upgrading an active guest session, forward their guest token
    const isUpgrading = user && user.isGuest;
    const guestToken = isUpgrading ? localStorage.getItem('saathi_token') : null;
    
    const data = await api.signUp({ username, password, nickname }, guestToken);
    localStorage.setItem('saathi_token', data.token);
    
    const profile = {
      id: data.user.id,
      username: data.user.username,
      nickname: data.user.nickname,
      language: data.user.language || 'en',
      voice_preference: data.user.voice_preference || 0,
      avatar: data.user.avatar || null,
      isGuest: false
    };
    await saveProfile(profile);
    setUser(profile);
    return profile;
  };

  const signIn = async ({ username, password }) => {
    const data = await api.signIn({ username, password });
    localStorage.setItem('saathi_token', data.token);
    
    const profile = {
      id: data.user.id,
      username: data.user.username,
      nickname: data.user.nickname,
      language: data.user.language || 'en',
      voice_preference: data.user.voice_preference || 0,
      avatar: data.user.avatar || null,
      isGuest: false
    };
    await saveProfile(profile);
    setUser(profile);
    return profile;
  };

  const updatePreferences = async (prefs) => {
    let updated = { ...user, ...prefs };
    try {
      const res = await api.updatePreferences(prefs);
      // Use the server's full user object when available (includes persisted avatar, etc.)
      if (res?.user) {
        updated = { ...updated, ...res.user };
      }
    } catch { /* offline, update locally only */ }
    setUser(updated);
    await saveProfile(updated);
    if (prefs.language) {
      localStorage.setItem('saathi_lang', prefs.language);
    }
  };

  const logout = async () => {
    localStorage.removeItem('saathi_token');
    localStorage.removeItem('saathi_lang');
    try {
      const { closeDb } = await import('../services/db');
      await closeDb();
      if (window.indexedDB) {
        await new Promise((resolve, reject) => {
          const req = window.indexedDB.deleteDatabase('saathi_db');
          req.onsuccess = resolve;
          req.onerror = reject;
          req.onblocked = () => { console.warn('DB delete blocked, proceeding...'); resolve(); };
        });
      }
    } catch (e) {
      console.error('Failed to clear local DB on logout', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, startGuestSession, updatePreferences, logout, signUp, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

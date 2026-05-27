import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { api } from '../services/apiClient';
import { saveMood, getMoods, getUnsyncedMoods } from '../services/db';

export function useMood() {
  const [entries, setEntries] = useState([]);
  const [insight, setInsight] = useState(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntries();
    loadInsight();
  }, []);

  // Sync when online
  useEffect(() => {
    const sync = async () => {
      const unsynced = await getUnsyncedMoods();
      if (unsynced.length) {
        try { await api.syncMoods(unsynced); } catch { /* offline */ }
      }
    };
    window.addEventListener('online', sync);
    return () => window.removeEventListener('online', sync);
  }, []);

  const loadEntries = async () => {
    const local = await getMoods(30);
    setEntries(local);
    calculateStreak(local);
    try {
      const remote = await api.getMoodTimeline(30);
      if (remote?.length) {
        setEntries(remote);
        calculateStreak(remote);
        for (const e of remote) await saveMood({ ...e, synced: true });
      }
    } catch { /* use local */ }
  };

  const loadInsight = async () => {
    try {
      const data = await api.getMoodInsights();
      if (data?.insight) setInsight(data.insight);
    } catch { /* offline */ }
  };

  const calculateStreak = (data) => {
    if (!data.length) return setStreak(0);
    const days = new Set(data.map(e => new Date(e.created_at).toDateString()));
    let s = 0, d = new Date();
    while (days.has(d.toDateString())) { s++; d.setDate(d.getDate() - 1); }
    setStreak(s);
  };

  const checkIn = useCallback(async ({ mood_score, note = '', tags = [] }) => {
    setLoading(true);
    const entry = { id: uuidv4(), mood_score, note, tags, created_at: new Date().toISOString() };
    await saveMood(entry);
    setEntries(prev => [...prev, entry]);
    calculateStreak([...entries, entry]);
    try { await api.checkIn(entry); } catch { /* offline, synced later */ }
    setLoading(false);
    return entry;
  }, [entries]);

  // Get last 7 days
  const getWeekData = () => {
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const dayEntries = entries.filter(e => new Date(e.created_at).toDateString() === ds);
      const avg = dayEntries.length ? Math.round(dayEntries.reduce((s, e) => s + e.mood_score, 0) / dayEntries.length) : null;
      week.push({ date: d, dayLabel: d.toLocaleDateString('en', { weekday: 'short' }), score: avg });
    }
    return week;
  };

  return { entries, insight, streak, loading, checkIn, getWeekData };
}

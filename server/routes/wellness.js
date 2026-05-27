import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { getDB } from '../models/database.js';
import { analyzeJournal } from '../services/aiService.js';

const router = express.Router();

const ACTIVITIES = [
  { id: 'breathing-478', type: 'breathing', title: { en: '4-7-8 Breathing', hi: '4-7-8 सांस व्यायाम' }, duration: 180, icon: '🌬️', category: 'calm', offline: true },
  { id: 'breathing-box', type: 'breathing', title: { en: 'Box Breathing', hi: 'बॉक्स ब्रीदिंग' }, duration: 240, icon: '⬜', category: 'calm', offline: true },
  { id: 'grounding-54321', type: 'grounding', title: { en: '5-4-3-2-1 Grounding', hi: '5-4-3-2-1 ग्राउंडिंग' }, duration: 300, icon: '🌿', category: 'calm', offline: true },
  { id: 'journal-daily', type: 'journal', title: { en: 'Daily Reflection', hi: 'दैनिक चिंतन' }, duration: 600, icon: '📓', category: 'reflect', offline: true },
  { id: 'journal-gratitude', type: 'journal', title: { en: 'Gratitude Log', hi: 'कृतज्ञता डायरी' }, duration: 300, icon: '🙏', category: 'reflect', offline: true },
  { id: 'study-pomodoro', type: 'study', title: { en: 'Study Timer', hi: 'अध्ययन टाइमर' }, duration: 1500, icon: '📚', category: 'focus', offline: true },
  { id: 'sleep-routine', type: 'sleep', title: { en: 'Sleep Wind-Down', hi: 'नींद की तैयारी' }, duration: 600, icon: '🌙', category: 'sleep', offline: true },
  { id: 'progressive-relax', type: 'relaxation', title: { en: 'Body Relaxation', hi: 'शरीर विश्राम' }, duration: 420, icon: '✨', category: 'calm', offline: true },
];

router.get('/activities', (req, res) => {
  const lang = req.query.lang || 'en';
  const activities = ACTIVITIES.map(a => ({
    ...a,
    title: a.title[lang] || a.title.en,
  }));
  res.json(activities);
});

router.post('/session', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { activity_type, duration_seconds = 0, completed = false } = req.body;
    const id = uuidv4();
    await db.prepare(`INSERT INTO wellness_sessions (id, user_id, activity_type, duration_seconds, completed) VALUES (?, ?, ?, ?, ?)`)
      .run(id, req.user.userId, activity_type, duration_seconds, completed ? 1 : 0);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[Wellness Session Error]', err.message);
    res.status(500).json({ error: 'Could not save session.' });
  }
});

router.post('/journal', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { content, prompt = '', mood_tag = '' } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Journal entry cannot be empty.' });
    const id = req.body.id || uuidv4();
    const exists = await db.prepare('SELECT id FROM journal_entries WHERE id=?').get(id);
    if (!exists) {
      await db.prepare(`INSERT INTO journal_entries (id, user_id, content, prompt, mood_tag) VALUES (?, ?, ?, ?, ?)`)
        .run(id, req.user.userId, content.trim(), prompt, mood_tag);
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error('[Wellness Journal Error]', err.message);
    res.status(500).json({ error: 'Could not save journal.' });
  }
});

router.post('/journal/analyze', authenticate, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Journal entry cannot be empty.' });
    
    const db = getDB();
    const user = await db.prepare('SELECT language FROM users WHERE id=?').get(req.user.userId);
    
    const analysis = await analyzeJournal(content, user?.language || 'en');
    res.json({ analysis });
  } catch (err) {
    console.error('[Wellness Journal Analyze Error]', err.message);
    res.status(500).json({ error: 'Could not analyze journal.' });
  }
});

router.get('/journal', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const entries = await db.prepare(`SELECT id, content, prompt, mood_tag, created_at FROM journal_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 20`)
      .all(req.user.userId);
    res.json(entries);
  } catch (err) {
    console.error('[Wellness Get Journal Error]', err.message);
    res.status(500).json({ error: 'Could not fetch journal.' });
  }
});

router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user.userId;
    const sessions = await db.prepare(`SELECT activity_type, COUNT(*) as count, SUM(duration_seconds) as total_time FROM wellness_sessions WHERE user_id=? GROUP BY activity_type`).all(userId);
    const streak = await db.prepare(`SELECT COUNT(DISTINCT date(created_at)) as days FROM mood_entries WHERE user_id=? AND created_at >= datetime('now', '-30 days')`).get(userId);
    res.json({ sessions, streakDays: streak?.days || 0 });
  } catch (err) {
    console.error('[Wellness Stats Error]', err.message);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

export default router;


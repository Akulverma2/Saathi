import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { getDB } from '../models/database.js';
import { generateMoodInsight } from '../services/aiService.js';

const router = express.Router();

router.post('/checkin', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { mood_score, note = '', tags = [] } = req.body;
    if (!mood_score || mood_score < 1 || mood_score > 5)
      return res.status(400).json({ error: 'Mood score must be between 1 and 5.' });

    const id = req.body.id || uuidv4();
    const existing = await db.prepare('SELECT id FROM mood_entries WHERE id=?').get(id);
    if (!existing) {
      await db.prepare(`INSERT INTO mood_entries (id, user_id, mood_score, note, tags) VALUES (?, ?, ?, ?, ?)`)
        .run(id, req.user.userId, mood_score, note, JSON.stringify(tags));
    }
    res.json({ success: true, id });
  } catch (err) {
    console.error('[Mood Checkin Error]', err.message);
    res.status(500).json({ error: 'Could not save mood.' });
  }
});

router.get('/timeline', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const days = parseInt(req.query.days) || 30;
    const entries = await db.prepare(`SELECT id, mood_score, note, tags, created_at FROM mood_entries WHERE user_id=? AND created_at >= datetime('now', '-${days} days') ORDER BY created_at ASC`)
      .all(req.user.userId);
    res.json(entries.map(e => ({ ...e, tags: JSON.parse(e.tags || '[]') })));
  } catch (err) {
    console.error('[Mood Timeline Error]', err.message);
    res.status(500).json({ error: 'Could not fetch timeline.' });
  }
});

router.get('/insights', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.prepare('SELECT language FROM users WHERE id=?').get(req.user.userId);
    const history = await db.prepare(`SELECT mood_score, tags, date(created_at) as date FROM mood_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 14`)
      .all(req.user.userId);
    if (!history.length) return res.json({ insight: null });
    const insight = await generateMoodInsight(history, user?.language || 'en');
    res.json({ insight });
  } catch (err) {
    console.error('[Mood Insights Error]', err.message);
    res.status(500).json({ error: 'Could not generate insight.' });
  }
});

router.post('/sync', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { entries = [] } = req.body;
    let synced = 0;
    for (const e of entries) {
      const exists = await db.prepare('SELECT id FROM mood_entries WHERE id=?').get(e.id);
      if (!exists) {
        await db.prepare(`INSERT INTO mood_entries (id, user_id, mood_score, note, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(e.id, req.user.userId, e.mood_score, e.note || '', JSON.stringify(e.tags || []), e.created_at || new Date().toISOString());
        synced++;
      }
    }
    res.json({ synced });
  } catch (err) {
    console.error('[Mood Sync Error]', err.message);
    res.status(500).json({ error: 'Sync failed.' });
  }
});

export default router;


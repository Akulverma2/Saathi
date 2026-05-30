import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { getDB } from '../models/database.js';
import { generateChatResponse, generateChatResponseStream, extractMemories } from '../services/aiService.js';
import { detectCrisisLevel } from '../services/crisisDetector.js';

const router = express.Router();

router.post('/message', authenticate, async (req, res) => {
  try {
    const { content, language = 'en' } = req.body;
    
    // Strict input validation
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid message format.' });
    }
    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Message is too long. Please keep it under 2000 characters.' });
    }

    const db = getDB();
    const userId = req.user.userId;
    const messageId = uuidv4();

    // Crisis detection on incoming message
    const crisis = detectCrisisLevel(content);

    // Save user message
    await db.prepare(`INSERT INTO messages (id, user_id, role, content, risk_level, language) VALUES (?, ?, 'user', ?, ?, ?)`)
      .run(messageId, userId, content.trim(), crisis.level, language);

    // Log crisis event if needed
    if (crisis.level >= 2) {
      await db.prepare(`INSERT INTO crisis_events (id, user_id, message_id, risk_level, keywords_matched) VALUES (?, ?, ?, ?, ?)`)
        .run(uuidv4(), userId, messageId, crisis.level, JSON.stringify(crisis.keywords));
    }

    // Get last 20 messages for context
    const history = (await db.prepare(`SELECT role, content FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 20`)
      .all(userId)).reverse();

    // Get user profile for context
    const user = await db.prepare('SELECT nickname, language FROM users WHERE id=?').get(userId);

    // Get recent mood for context
    const recentMood = await db.prepare(`SELECT mood_score FROM mood_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 1`)
      .get(userId);

    // Get existing memories
    const memories = await db.prepare('SELECT memory_text FROM user_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(userId);
    const memoryFacts = memories.map(m => m.memory_text);

    const aiResponse = await generateChatResponse({
      messages: history,
      language,
      userContext: {
        nickname: user?.nickname || 'Friend',
        recentMood: recentMood?.mood_score || null,
        memories: memoryFacts
      },
      customApiKey: req.headers['x-gemini-key'] || null
    });

    const aiMessageId = uuidv4();
    const responseRisk = aiResponse.isCrisis ? 3 : 0;
    await db.prepare(`INSERT INTO messages (id, user_id, role, content, risk_level, language) VALUES (?, ?, 'assistant', ?, ?, ?)`)
      .run(aiMessageId, userId, aiResponse.text, responseRisk, language);

    if (aiResponse.isCrisis) {
      await db.prepare(`INSERT INTO crisis_events (id, user_id, message_id, risk_level, keywords_matched) VALUES (?, ?, ?, 3, ?)`)
        .run(uuidv4(), userId, aiMessageId, JSON.stringify([{ keyword: 'AI_SAFETY_PASS', level: 3 }]));
    }

    // Asynchronously extract new memories every ~5 messages
    if (history.length % 5 === 0 && history.length > 0) {
      setTimeout(async () => {
        try {
          const newFacts = await extractMemories(history.slice(-5));
          for (const fact of newFacts) {
            await db.prepare('INSERT INTO user_memories (id, user_id, memory_text) VALUES (?, ?, ?)')
              .run(uuidv4(), userId, fact);
          }
        } catch (memErr) {
          console.error('[Async Memory Extraction Error]', memErr.message);
          try {
            await db.prepare('INSERT INTO system_errors (id, user_id, job_type, error_message, payload) VALUES (?, ?, ?, ?, ?)')
              .run(uuidv4(), userId, 'memory_extraction', memErr.message, JSON.stringify({ historyLength: history.length }));
          } catch (dbErr) {
            console.error('[System Error Logging Failed]', dbErr.message);
          }
        }
      }, 1000);
    }

    res.json({
      id: aiMessageId,
      content: aiResponse.text,
      role: 'assistant',
      crisisLevel: Math.max(crisis.level, responseRisk),
      requiresImmediate: crisis.requiresImmediate || aiResponse.isCrisis,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Chat Route Error]', err);
    res.status(500).json({ error: 'Could not process message. Please try again.' });
  }
});

router.post('/message/stream', authenticate, async (req, res) => {
  try {
    const { content, language = 'en' } = req.body;
    
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Invalid message format.' });
    }
    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Message is too long. Please keep it under 2000 characters.' });
    }

    const db = getDB();
    const userId = req.user.userId;
    const messageId = uuidv4();

    // Crisis detection on incoming message
    const crisis = detectCrisisLevel(content);

    // Save user message
    await db.prepare(`INSERT INTO messages (id, user_id, role, content, risk_level, language) VALUES (?, ?, 'user', ?, ?, ?)`)
      .run(messageId, userId, content.trim(), crisis.level, language);

    // Log crisis event if needed
    if (crisis.level >= 2) {
      await db.prepare(`INSERT INTO crisis_events (id, user_id, message_id, risk_level, keywords_matched) VALUES (?, ?, ?, ?, ?)`)
        .run(uuidv4(), userId, messageId, crisis.level, JSON.stringify(crisis.keywords));
    }

    // Level 3 crisis: Immediately intercept and return helpline info
    if (crisis.level === 3) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const responseText = "This is important and you deserve real help right now. Please reach out to iCall at 9152987821 or the KIRAN helpline at 1800-599-0019 (free, 24/7). Please talk to a trusted adult. You are not alone.";
      const aiMessageId = uuidv4();
      
      await db.prepare(`INSERT INTO messages (id, user_id, role, content, language) VALUES (?, ?, 'assistant', ?, ?)`)
        .run(aiMessageId, userId, responseText, language);

      res.write(`data: ${JSON.stringify({ token: responseText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, id: aiMessageId, content: responseText, crisisLevel: 3 })}\n\n`);
      res.end();
      return;
    }

    // Get last 20 messages for context
    const history = (await db.prepare(`SELECT role, content FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 20`)
      .all(userId)).reverse();

    // Get user profile for context
    const user = await db.prepare('SELECT nickname, language FROM users WHERE id=?').get(userId);

    // Get recent mood for context
    const recentMood = await db.prepare(`SELECT mood_score FROM mood_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 1`)
      .get(userId);

    // Get existing memories
    const memories = await db.prepare('SELECT memory_text FROM user_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(userId);
    const memoryFacts = memories.map(m => m.memory_text);

    // Call dynamic streaming generator
    const aiResponse = await generateChatResponseStream({
      messages: history,
      language,
      userContext: {
        nickname: user?.nickname || 'Friend',
        recentMood: recentMood?.mood_score || null,
        memories: memoryFacts
      },
      customApiKey: req.headers['x-gemini-key'] || null
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (aiResponse.error || !aiResponse.stream) {
      const fallbackText = aiResponse.text || "I'm here for you, but I had a little trouble generating a response. If you need urgent help, please call KIRAN at 1800-599-0019.";
      const aiMessageId = uuidv4();
      
      await db.prepare(`INSERT INTO messages (id, user_id, role, content, language) VALUES (?, ?, 'assistant', ?, ?)`)
        .run(aiMessageId, userId, fallbackText, language);
        
      res.write(`data: ${JSON.stringify({ token: fallbackText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, id: aiMessageId, content: fallbackText, crisisLevel: 0 })}\n\n`);
      res.end();
      return;
    }

    let fullText = '';
    for await (const chunk of aiResponse.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ token: chunkText })}\n\n`);
    }

    let responseRisk = 0;
    let cleanFullText = fullText;
    if (fullText.includes('[CRISIS_ALERT]')) {
      cleanFullText = fullText.replace('[CRISIS_ALERT]', '').trim();
      responseRisk = 3;
    }

    const aiMessageId = uuidv4();
    await db.prepare(`INSERT INTO messages (id, user_id, role, content, risk_level, language) VALUES (?, ?, 'assistant', ?, ?, ?)`)
      .run(aiMessageId, userId, cleanFullText, responseRisk, language);

    if (responseRisk === 3) {
      await db.prepare(`INSERT INTO crisis_events (id, user_id, message_id, risk_level, keywords_matched) VALUES (?, ?, ?, 3, ?)`)
        .run(uuidv4(), userId, aiMessageId, JSON.stringify([{ keyword: 'AI_SAFETY_PASS', level: 3 }]));
    }

    // Async memory extraction
    if (history.length % 5 === 0 && history.length > 0) {
      setTimeout(async () => {
        try {
          const newFacts = await extractMemories(history.slice(-5));
          for (const fact of newFacts) {
            await db.prepare('INSERT INTO user_memories (id, user_id, memory_text) VALUES (?, ?, ?)')
              .run(uuidv4(), userId, fact);
          }
        } catch (memErr) {
          console.error('[Async Memory Extraction Error]', memErr.message);
          try {
            await db.prepare('INSERT INTO system_errors (id, user_id, job_type, error_message, payload) VALUES (?, ?, ?, ?, ?)')
              .run(uuidv4(), userId, 'memory_extraction', memErr.message, JSON.stringify({ historyLength: history.length }));
          } catch (dbErr) {
            console.error('[System Error Logging Failed]', dbErr.message);
          }
        }
      }, 1000);
    }

    res.write(`data: ${JSON.stringify({ done: true, id: aiMessageId, content: cleanFullText, crisisLevel: Math.max(crisis.level, responseRisk) })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[Chat Stream Route Error]', err);
    res.write(`data: ${JSON.stringify({ error: 'Could not process stream. Please try again.' })}\n\n`);
    res.end();
  }
});


router.get('/history', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 50;
    const messages = await db.prepare(`SELECT id, role, content, mood_detected, risk_level, created_at FROM messages WHERE user_id=? ORDER BY created_at ASC LIMIT ?`)
      .all(req.user.userId, limit);
    res.json(messages);
  } catch (err) {
    console.error('[Chat History Route Error]', err.message);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

router.post('/sync', authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { messages = [] } = req.body;
    const userId = req.user.userId;
    const inserted = [];

    for (const msg of messages) {
      const exists = await db.prepare('SELECT id FROM messages WHERE id=?').get(msg.id);
      if (!exists) {
        await db.prepare(`INSERT INTO messages (id, user_id, role, content, language, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(msg.id, userId, msg.role, msg.content, msg.language || 'en', msg.created_at || new Date().toISOString());
        inserted.push(msg.id);
      }
    }
    res.json({ synced: inserted.length, ids: inserted });
  } catch (err) {
    console.error('[Chat Sync Route Error]', err.message);
    res.status(500).json({ error: 'Sync failed.' });
  }
});

export default router;


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDB, getDB } from './models/database.js';
import jwt from 'jsonwebtoken';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import moodRoutes from './routes/mood.js';
import wellnessRoutes from './routes/wellness.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting key generator (extract user ID from JWT if present, else fallback to IP)
const keyGenerator = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded?.userId) return decoded.userId;
    } catch (e) {}
  }
  return req.ip;
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
});
app.use('/api/', limiter);

// Chat has stricter limit
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please slow down.' },
  keyGenerator,
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/wellness', wellnessRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'Project Saathi' });
});

// Global Platform Statistics Route (Dynamic & Live driven by active database counts)
app.get('/api/platform/stats', authenticate, async (req, res) => {
  try {
    const db = getDB();
    
    // Calculate total users (Teens Supported)
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    // Calculate total messages (Wellness Chats)
    const messageCount = await db.prepare('SELECT COUNT(*) as count FROM messages').get();
    // Calculate total crisis triggers (Crisis Interventions)
    const crisisCount = await db.prepare('SELECT COUNT(*) as count FROM crisis_events').get();
    
    // Count successful/cached database writes (representing syncs or database transactions in PostgreSQL)
    const moodCount = await db.prepare('SELECT COUNT(*) as count FROM mood_entries').get();
    const sessionCount = await db.prepare('SELECT COUNT(*) as count FROM wellness_sessions').get();
    const journalCount = await db.prepare('SELECT COUNT(*) as count FROM journal_entries').get();
    
    const totalPersistentActions = (moodCount?.count || 0) + (sessionCount?.count || 0) + (journalCount?.count || 0);

    // Dynamic scale driven by active database counts only (no fake numbers)
    const teensSupported = userCount?.count || 0;
    const wellnessChats = messageCount?.count || 0;
    const crisisInterventions = crisisCount?.count || 0;
    const offlineSyncs = totalPersistentActions;

    res.json({
      teensSupported,
      wellnessChats,
      crisisInterventions,
      offlineSyncs
    });
  } catch (err) {
    console.error('[Platform Stats Error]', err.message);
    res.status(500).json({ error: 'Could not fetch platform statistics.' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong. Please try again.',
  });
});

// Initialize DB then start server
initDB();
app.listen(PORT, () => {
  console.log(`\n🌱 Project Saathi Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

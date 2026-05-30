import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../models/database.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'saathi-dev-secret-change-in-production';

// Signup rate limiter (strictly IP based to prevent registration spam)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // max 5 attempts per hour per IP
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// Signin rate limiter
const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per 15 minutes per IP
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// Sign Up / Register Account (Supports upgrading anonymous guest accounts)
router.post('/signup', signupLimiter, async (req, res) => {
  console.log('[Signup Debug] Incoming signup request:', { username: req.body.username, nickname: req.body.nickname });
  try {
    const { username, password, nickname } = req.body;
    if (!username) {
      console.log('[Signup Debug] Missing username');
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!password || password.length < 8) {
      console.log('[Signup Debug] Password too short');
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    let cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }

    if (cleanUsername.length < 4) {
      console.log('[Signup Debug] Cleaned username too short:', cleanUsername);
      return res.status(400).json({ error: 'Username must be at least 3 characters long (excluding @).' });
    }

    console.log('[Signup Debug] Accessing database...');
    const db = getDB();
    
    // Check if username is already taken
    console.log('[Signup Debug] Checking if username is taken:', cleanUsername);
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    console.log('[Signup Debug] Existing user check result:', existing);
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    // Hash the password securely
    console.log('[Signup Debug] Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log('[Signup Debug] Password hashed successfully');

    // Check if they are upgrading their active guest session
    const authHeader = req.headers['authorization'];
    const guestToken = authHeader && authHeader.split(' ')[1];
    let guestUserId = null;

    console.log('[Signup Debug] Guest token present:', !!guestToken);
    if (guestToken) {
      try {
        const decoded = jwt.verify(guestToken, JWT_SECRET);
        guestUserId = decoded.userId;
        console.log('[Signup Debug] Decoded guest user ID:', guestUserId);
      } catch (e) {
        console.log('[Signup Debug] Guest token verification failed:', e.message);
        // Token invalid/expired — ignore and treat as new signup
      }
    }

    if (guestUserId && guestUserId.startsWith('guest_')) {
      console.log('[Signup Debug] Attempting guest upgrade for:', guestUserId);
      const guestUser = await db.prepare('SELECT id, nickname FROM users WHERE id = ?').get(guestUserId);
      console.log('[Signup Debug] Found guest user row:', guestUser);
      if (guestUser) {
        // Upgrade guest user row with permanent credentials!
        console.log('[Signup Debug] Executing guest upgrade DB query...');
        await db.prepare('UPDATE users SET username = ?, password_hash = ?, nickname = ? WHERE id = ?')
          .run(cleanUsername, passwordHash, nickname || guestUser.nickname || 'Friend', guestUserId);
        console.log('[Signup Debug] Guest upgraded DB query success');
        
        const token = generateToken(guestUserId);
        return res.json({ 
          token, 
          user: {
            id: guestUserId, 
            nickname: nickname || guestUser.nickname || 'Friend', 
            username: cleanUsername,
            isGuest: false 
          }
        });
      }
    }

    // If no active guest session to upgrade, create a new registered account
    const userId = 'user_' + uuidv4();
    console.log('[Signup Debug] Creating brand new user with ID:', userId);
    await db.prepare('INSERT INTO users (id, username, password_hash, nickname, language, voice_preference) VALUES (?, ?, ?, ?, ?, ?)')
      .run(userId, cleanUsername, passwordHash, nickname || 'Friend', 'en', 0);
    console.log('[Signup Debug] Brand new user DB insert success');

    const token = generateToken(userId);
    res.json({ 
      token, 
      user: {
        id: userId, 
        nickname: nickname || 'Friend', 
        username: cleanUsername,
        isGuest: false 
      }
    });
  } catch (err) {
    console.error('[Signup Debug] Auth Sign Up Error:', err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// Check username availability (real-time validation)
router.get('/check-username/:username', async (req, res) => {
  try {
    let cleanUsername = req.params.username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    const db = getDB();
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    res.json({ available: !existing });
  } catch (err) {
    console.error('[Auth Check Username Error]', err.message);
    res.status(500).json({ error: 'Could not check username.' });
  }
});

// Sign In / Login Account
router.post('/signin', signinLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    let cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }

    const db = getDB();
    
    // Retrieve user credentials
    const user = await db.prepare('SELECT id, username, password_hash, nickname, language, voice_preference FROM users WHERE username = ?')
      .get(cleanUsername);
    
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Verify hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname || 'Friend',
        language: user.language || 'en',
        voice_preference: user.voice_preference || 0,
        isGuest: false
      }
    });
  } catch (err) {
    console.error('[Auth Sign In Error]', err.message);
    res.status(500).json({ error: 'Could not sign in.' });
  }
});

// Create anonymous guest session
router.post('/guest', async (req, res) => {
  try {
    const db = getDB();
    const userId = 'guest_' + uuidv4();
    const { nickname = 'Friend', language = 'en', voice_preference = 0 } = req.body;

    await db.prepare(`INSERT INTO users (id, nickname, language, voice_preference) VALUES (?, ?, ?, ?)`)
      .run(userId, nickname, language, voice_preference ? 1 : 0);

    const token = generateToken(userId);
    res.json({ token, userId, nickname, language, isGuest: true });
  } catch (err) {
    console.error('[Auth Guest Error]', err.message);
    res.status(500).json({ error: 'Could not create session.' });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(403).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    const db = getDB();
    const { nickname, language, voice_preference, theme, avatar } = req.body;

    await db.prepare(`UPDATE users SET nickname=COALESCE(?,nickname), language=COALESCE(?,language), voice_preference=COALESCE(?,voice_preference), theme=COALESCE(?,theme), avatar=COALESCE(?,avatar) WHERE id=?`)
      .run(nickname, language, voice_preference !== undefined ? (voice_preference ? 1 : 0) : null, theme, avatar, decoded.userId);

    const user = await db.prepare('SELECT * FROM users WHERE id=?').get(decoded.userId);
    res.json({ success: true, user });
  } catch (err) {
    console.error('[Auth Preferences Error]', err.message);
    res.status(500).json({ error: 'Could not update preferences.' });
  }
});

// Get user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(403).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    const db = getDB();
    const user = await db.prepare('SELECT id, username, nickname, language, voice_preference, theme, avatar, created_at FROM users WHERE id=?').get(decoded.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('[Auth Me Error]', err.message);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// Delete Account Permanently
router.delete('/delete', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(403).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    const db = getDB();
    await db.deleteUserAndData(decoded.userId);

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('[Auth Delete Account Error]', err.message);
    res.status(500).json({ error: 'Could not delete account.' });
  }
});

export default router;


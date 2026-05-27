-- Project Saathi Supabase Schema (Updated)
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS user_memories CASCADE;
DROP TABLE IF EXISTS crisis_events CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS wellness_sessions CASCADE;
DROP TABLE IF EXISTS mood_entries CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    nickname TEXT DEFAULT 'Friend',
    language TEXT DEFAULT 'en',
    voice_preference INTEGER DEFAULT 0,
    theme TEXT DEFAULT 'calmMode',
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    risk_level INTEGER DEFAULT 0,
    language TEXT DEFAULT 'en',
    mood_detected TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Mood entries table
CREATE TABLE mood_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
    note TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Wellness Sessions table
CREATE TABLE wellness_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    completed INTEGER DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Journal Entries table
CREATE TABLE journal_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    mood_tag TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Crisis Events table
CREATE TABLE crisis_events (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
    risk_level INTEGER NOT NULL,
    keywords_matched TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. User memories table
CREATE TABLE user_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    memory_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. System Errors table (for background jobs monitoring)
CREATE TABLE system_errors (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    job_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

-- Allow all operations (backend manages auth via custom JWTs)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mood_entries" ON mood_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on wellness_sessions" ON wellness_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on journal_entries" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crisis_events" ON crisis_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_memories" ON user_memories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on system_errors" ON system_errors FOR ALL USING (true) WITH CHECK (true);

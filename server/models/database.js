import { supabase } from './supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

// Mock statement for local development when Supabase is not configured
class MockStatement {
  constructor(sql, tables) {
    this.sql = sql;
    this.tables = tables;
    
    // Guess the table name from the SQL
    const match = sql.match(/INTO\s+(\w+)|FROM\s+(\w+)|UPDATE\s+(\w+)/i);
    this.tableName = match ? (match[1] || match[2] || match[3]) : null;
  }

  async run(...params) {
    if (!this.tableName || !this.tables[this.tableName]) return { changes: 1, lastInsertRowid: Date.now() };
    const table = this.tables[this.tableName];
    
    if (this.sql.toUpperCase().includes('INSERT')) {
      const obj = { created_at: new Date().toISOString() };

      if (params.length === 1 && typeof params[0] === 'object') {
        Object.assign(obj, params[0]);
      } else {
        // Extract column names: INSERT INTO table (col1, col2, ...) VALUES (...)
        const colMatch = this.sql.match(/\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (colMatch) {
          const cols = colMatch[1].split(',').map(c => c.trim());
          const valueParts = colMatch[2].split(',').map(v => v.trim());
          
          let paramIdx = 0;
          cols.forEach((col, i) => {
            const valuePart = valueParts[i];
            if (valuePart === '?') {
              if (paramIdx < params.length) {
                obj[col] = params[paramIdx];
                paramIdx++;
              }
            } else {
              obj[col] = valuePart.replace(/^['"]|['"]$/g, '');
            }
          });
        } else {
          params.forEach((p, i) => { obj[`col_${i}`] = p; });
        }
      }
      table.push(obj);
    } else if (this.sql.toUpperCase().includes('UPDATE')) {
      if (params.length === 1 && typeof params[0] === 'object') {
        const id = params[0].id;
        const record = table.find(r => r.id === id);
        if (record) Object.assign(record, params[0]);
      } else {
        const id = params[params.length - 1];
        const record = table.find(r => r.id === id);
        if (record) {
          const setMatch = this.sql.match(/SET\s+(.+?)\s+WHERE/i);
          if (setMatch) {
            const assignments = setMatch[1].split(',').map(c => c.trim());
            let paramIdx = 0;
            assignments.forEach(assignment => {
              const col = assignment.split('=')[0].trim();
              const val = assignment.split('=')[1]?.trim();
              if (val && val.includes('COALESCE')) {
                if (paramIdx < params.length - 1) {
                  if (params[paramIdx] !== null && params[paramIdx] !== undefined) {
                    record[col] = params[paramIdx];
                  }
                  paramIdx++;
                }
              } else if (val === '?') {
                if (paramIdx < params.length - 1) {
                  record[col] = params[paramIdx];
                }
                paramIdx++;
              }
            });
          }
        }
      }
    } else if (this.sql.toUpperCase().includes('DELETE')) {
      const id = params.length === 1 && typeof params[0] === 'object' ? params[0].id : params[0];
      const idx = table.findIndex(r => r.id === id);
      if (idx > -1) table.splice(idx, 1);
    }
    return { changes: 1, lastInsertRowid: Date.now() };
  }

  async get(...params) {
    if (!this.tableName || !this.tables[this.tableName]) return null;
    const table = this.tables[this.tableName];
    
    // Support COUNT queries in emulator
    if (this.sql.toUpperCase().includes('COUNT(')) {
      let filteredTable = [...table];
      // In case we filter by user_id
      const userId = params[0];
      if (userId && this.sql.toUpperCase().includes('USER_ID')) {
        filteredTable = filteredTable.filter(r => r.user_id === userId);
      }
      return { count: filteredTable.length };
    }

    // Support username queries in emulator
    if (this.sql.toUpperCase().includes('WHERE USERNAME =')) {
      const username = params[0];
      return table.find(r => r.username === username) || null;
    }
    
    let id;
    if (params.length === 1 && typeof params[0] === 'object') id = params[0].id;
    else if (params.length > 0) id = params[0];

    if (id) return table.find(r => r.id === id) || null;
    return table[0] || null;
  }

  async all(...params) {
    if (!this.tableName || !this.tables[this.tableName]) return [];
    const table = this.tables[this.tableName];
    
    let userId;
    if (params.length === 1 && typeof params[0] === 'object') userId = params[0].user_id;
    else if (params.length > 0) userId = params[0];

    let results = [...table];
    if (userId) {
      results = results.filter(r => r.user_id === userId);
    }

    // Dynamic sorting to mirror SQLite behavior
    const sqlUpper = this.sql.toUpperCase();
    if (sqlUpper.includes('ORDER BY CREATED_AT DESC')) {
      results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sqlUpper.includes('ORDER BY CREATED_AT ASC')) {
      results.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    }

    // Dynamic limiting to mirror SQLite behavior
    const limitMatch = sqlUpper.match(/LIMIT\s+(\d+|\?)/);
    if (limitMatch) {
      // Guess limit from SQL or params
      let limit = 50;
      if (limitMatch[1] === '?') {
        // Limit is passed as parameter (e.g. limit is the last param in .all(userId, limit))
        limit = parseInt(params[params.length - 1]) || 50;
      } else {
        limit = parseInt(limitMatch[1]) || 50;
      }
      results = results.slice(0, limit);
    }

    return results;
  }
}

// Supabase statement mapping raw SQL to Supabase client queries
class SupabaseStatement {
  constructor(sql) {
    this.sql = sql;
  }

  async run(...params) {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const sql = this.sql.trim().replace(/\s+/g, ' ');

    try {
      // 1. INSERT INTO users (id, nickname, language, voice_preference) VALUES (?, ?, ?, ?)
      if (sql.includes('INSERT INTO users') && sql.includes('voice_preference')) {
        const [id, nickname, language, voice_preference] = params;
        const { error } = await supabase
          .from('users')
          .insert([{ id, nickname, language, voice_preference: voice_preference ? 1 : 0 }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 2. UPDATE users SET nickname=COALESCE(?,nickname), language=COALESCE(?,language), voice_preference=COALESCE(?,voice_preference), theme=COALESCE(?,theme), avatar=COALESCE(?,avatar) WHERE id=?
      if (sql.includes('UPDATE users SET') && sql.includes('COALESCE')) {
        const [nickname, language, voice_preference, theme, avatar, id] = params;
        const updates = {};
        if (nickname !== null && nickname !== undefined) updates.nickname = nickname;
        if (language !== null && language !== undefined) updates.language = language;
        if (voice_preference !== null && voice_preference !== undefined) updates.voice_preference = voice_preference ? 1 : 0;
        if (theme !== null && theme !== undefined) updates.theme = theme;
        if (avatar !== null && avatar !== undefined) updates.avatar = avatar;

        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
        return { changes: 1 };
      }

      // 2a. INSERT INTO users (id, username, password_hash, nickname, language, voice_preference) VALUES (?, ?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO users') && sql.includes('password_hash')) {
        const [id, username, password_hash, nickname, language, voice_preference] = params;
        const { error } = await supabase
          .from('users')
          .insert([{ 
            id, 
            username, 
            password_hash, 
            nickname: nickname || 'Friend', 
            language: language || 'en', 
            voice_preference: voice_preference ? 1 : 0 
          }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 2b. UPDATE users SET username = ?, password_hash = ?, nickname = ? WHERE id = ?
      if (sql.includes('UPDATE users SET username') && sql.includes('password_hash')) {
        const [username, password_hash, nickname, id] = params;
        const { error } = await supabase
          .from('users')
          .update({ username, password_hash, nickname })
          .eq('id', id);
        if (error) throw error;
        return { changes: 1 };
      }

      // 3. INSERT INTO messages (id, user_id, role, content, risk_level, language) VALUES (?, ?, 'user', ?, ?, ?)
      if (sql.includes('INSERT INTO messages') && sql.includes("'user'")) {
        const [id, user_id, content, risk_level, language] = params;
        const { error } = await supabase
          .from('messages')
          .insert([{ id, user_id, role: 'user', content, risk_level: parseInt(risk_level) || 0, language: language || 'en' }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 4. INSERT INTO messages (id, user_id, role, content, language) VALUES (?, ?, 'assistant', ?, ?)
      if (sql.includes('INSERT INTO messages') && sql.includes("'assistant'")) {
        const [id, user_id, content, language] = params;
        const { error } = await supabase
          .from('messages')
          .insert([{ id, user_id, role: 'assistant', content, language: language || 'en' }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 5. INSERT INTO messages (id, user_id, role, content, language, created_at) VALUES (?, ?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO messages') && sql.includes('created_at')) {
        const [id, user_id, role, content, language, created_at] = params;
        const { error } = await supabase
          .from('messages')
          .insert([{ id, user_id, role, content, language: language || 'en', created_at }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 6. INSERT INTO crisis_events (id, user_id, message_id, risk_level, keywords_matched) VALUES (?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO crisis_events')) {
        const [id, user_id, message_id, risk_level, keywords_matched] = params;
        const { error } = await supabase
          .from('crisis_events')
          .insert([{ id, user_id, message_id, risk_level: parseInt(risk_level) || 0, keywords_matched }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 7. INSERT INTO mood_entries (id, user_id, mood_score, note, tags) VALUES (?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO mood_entries') && !sql.includes('created_at')) {
        const [id, user_id, mood_score, note, tags] = params;
        const { error } = await supabase
          .from('mood_entries')
          .insert([{ id, user_id, mood_score: parseInt(mood_score), note: note || '', tags }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 8. INSERT INTO mood_entries (id, user_id, mood_score, note, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO mood_entries') && sql.includes('created_at')) {
        const [id, user_id, mood_score, note, tags, created_at] = params;
        const { error } = await supabase
          .from('mood_entries')
          .insert([{ id, user_id, mood_score: parseInt(mood_score), note: note || '', tags, created_at }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 9. INSERT INTO wellness_sessions (id, user_id, activity_type, duration_seconds, completed) VALUES (?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO wellness_sessions')) {
        const [id, user_id, activity_type, duration_seconds, completed] = params;
        const { error } = await supabase
          .from('wellness_sessions')
          .insert([{ id, user_id, activity_type, duration_seconds: parseInt(duration_seconds) || 0, completed: completed ? 1 : 0 }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 10. INSERT INTO journal_entries (id, user_id, content, prompt, mood_tag) VALUES (?, ?, ?, ?, ?)
      if (sql.includes('INSERT INTO journal_entries')) {
        const [id, user_id, content, prompt, mood_tag] = params;
        const { error } = await supabase
          .from('journal_entries')
          .insert([{ id, user_id, content, prompt: prompt || '', mood_tag: mood_tag || '' }]);
        if (error) throw error;
        return { changes: 1 };
      }

      // 11. INSERT INTO user_memories (id, user_id, memory_text) VALUES (?, ?, ?)
      if (sql.includes('INSERT INTO user_memories')) {
        const [id, user_id, memory_text] = params;
        const { error } = await supabase
          .from('user_memories')
          .insert([{ id, user_id, memory_text }]);
        if (error) throw error;
        return { changes: 1 };
      }

      throw new Error(`Unsupported SQL write command for Supabase: ${sql}`);
    } catch (err) {
      console.error(`[Supabase WRITE Error] for query "${sql}":`, err.message);
      throw err;
    }
  }

  async get(...params) {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const sql = this.sql.trim().replace(/\s+/g, ' ');

    try {
      // 1. SELECT * FROM users WHERE id=? or specific columns
      if (sql.includes('FROM users WHERE id=?') || sql.includes('FROM users WHERE id = ?')) {
        const [id] = params;
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      // 2. SELECT mood_score FROM mood_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 1
      if (sql.includes('SELECT mood_score FROM mood_entries') && (sql.includes('LIMIT 1') || sql.includes('limit 1'))) {
        const [userId] = params;
        const { data, error } = await supabase
          .from('mood_entries')
          .select('mood_score')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
      }

      // 3. SELECT id FROM messages WHERE id=?
      if (sql.includes('SELECT id FROM messages WHERE id=?') || sql.includes('SELECT id FROM messages WHERE id = ?')) {
        const [id] = params;
        const { data, error } = await supabase
          .from('messages')
          .select('id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      // 4. SELECT id FROM mood_entries WHERE id=?
      if (sql.includes('SELECT id FROM mood_entries WHERE id=?') || sql.includes('SELECT id FROM mood_entries WHERE id = ?')) {
        const [id] = params;
        const { data, error } = await supabase
          .from('mood_entries')
          .select('id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      // 5. SELECT id FROM journal_entries WHERE id=?
      if (sql.includes('SELECT id FROM journal_entries WHERE id=?') || sql.includes('SELECT id FROM journal_entries WHERE id = ?')) {
        const [id] = params;
        const { data, error } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      // 6. SELECT COUNT(DISTINCT date(created_at)) as days FROM mood_entries WHERE user_id=? AND created_at >= datetime('now', '-30 days')
      if (sql.includes('COUNT(DISTINCT') && sql.includes('mood_entries')) {
        const [userId] = params;
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data, error } = await supabase
          .from('mood_entries')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', cutoff);
        if (error) throw error;
        
        const distinctDates = new Set(data.map(d => new Date(d.created_at).toISOString().split('T')[0]));
        return { days: distinctDates.size };
      }

      // 7. Global Platform Stats Counts: SELECT COUNT(*) as count FROM table
      if (sql.toUpperCase().includes('SELECT COUNT(*) AS COUNT FROM')) {
        const match = sql.toUpperCase().match(/FROM\s+(\w+)/i);
        const tableName = match ? match[1].toLowerCase() : null;
        if (tableName) {
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          if (error) throw error;
          return { count: count || 0 };
        }
      }

      // 8. SELECT * FROM users WHERE username = ?
      if (sql.includes('FROM users WHERE username = ?')) {
        const [username] = params;
        const { data, error } = await supabase
          .from('users')
          .select('id, username, password_hash, nickname, language, voice_preference, theme, created_at')
          .eq('username', username)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      throw new Error(`Unsupported SQL read single command for Supabase: ${sql}`);
    } catch (err) {
      console.error(`[Supabase GET Error] for query "${sql}":`, err.message);
      throw err;
    }
  }

  async all(...params) {
    if (!supabase) throw new Error("Supabase client is not initialized.");
    const sql = this.sql.trim().replace(/\s+/g, ' ');

    try {
      // 1. SELECT role, content FROM messages WHERE user_id=? ORDER BY created_at DESC LIMIT 20
      if (sql.includes('FROM messages WHERE user_id=?') && sql.includes('DESC') && sql.includes('LIMIT 20')) {
        const [userId] = params;
        const { data, error } = await supabase
          .from('messages')
          .select('role, content')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return data;
      }

      // 2. SELECT id, role, content, mood_detected, risk_level, created_at FROM messages WHERE user_id=? ORDER BY created_at ASC LIMIT ?
      if (sql.includes('FROM messages WHERE user_id=?') && sql.includes('ASC')) {
        const [userId, limit] = params;
        const { data, error } = await supabase
          .from('messages')
          .select('id, role, content, mood_detected, risk_level, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(limit || 50);
        if (error) throw error;
        return data;
      }

      // 3. SELECT memory_text FROM user_memories WHERE user_id=? ORDER BY created_at DESC LIMIT 5
      if (sql.includes('FROM user_memories WHERE user_id=?') && sql.includes('LIMIT 5')) {
        const [userId] = params;
        const { data, error } = await supabase
          .from('user_memories')
          .select('memory_text')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return data;
      }

      // 4. SELECT id, mood_score, note, tags, created_at FROM mood_entries WHERE user_id=? AND created_at >= datetime('now', '-X days') ORDER BY created_at ASC
      if (sql.includes('FROM mood_entries WHERE user_id=?') && sql.includes('created_at >=')) {
        const [userId] = params;
        const match = sql.match(/-\'?(\d+)\'?\s+days/);
        const days = match ? parseInt(match[1]) : 30;
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        
        const { data, error } = await supabase
          .from('mood_entries')
          .select('id, mood_score, note, tags, created_at')
          .eq('user_id', userId)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return data;
      }

      // 5. SELECT mood_score, tags, date(created_at) as date FROM mood_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 14
      if (sql.includes('FROM mood_entries WHERE user_id=?') && sql.includes('LIMIT 14')) {
        const [userId] = params;
        const { data, error } = await supabase
          .from('mood_entries')
          .select('mood_score, tags, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(14);
        if (error) throw error;
        
        return data.map(item => ({
          mood_score: item.mood_score,
          tags: item.tags,
          date: new Date(item.created_at).toISOString().split('T')[0]
        }));
      }

      // 6. SELECT id, content, prompt, mood_tag, created_at FROM journal_entries WHERE user_id=? ORDER BY created_at DESC LIMIT 20
      if (sql.includes('FROM journal_entries WHERE user_id=?') && sql.includes('LIMIT 20')) {
        const [userId] = params;
        const { data, error } = await supabase
          .from('journal_entries')
          .select('id, content, prompt, mood_tag, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) throw error;
        return data;
      }

      // 7. SELECT activity_type, COUNT(*) as count, SUM(duration_seconds) as total_time FROM wellness_sessions WHERE user_id=? GROUP BY activity_type
      if (sql.includes('wellness_sessions') && sql.includes('GROUP BY')) {
        const [userId] = params;
        const { data, error } = await supabase
          .from('wellness_sessions')
          .select('activity_type, duration_seconds')
          .eq('user_id', userId);
        if (error) throw error;

        const groups = {};
        data.forEach(item => {
          const type = item.activity_type;
          if (!groups[type]) {
            groups[type] = { activity_type: type, count: 0, total_time: 0 };
          }
          groups[type].count += 1;
          groups[type].total_time += item.duration_seconds || 0;
        });
        return Object.values(groups);
      }

      throw new Error(`Unsupported SQL read multiple command for Supabase: ${sql}`);
    } catch (err) {
      console.error(`[Supabase ALL Error] for query "${sql}":`, err.message);
      throw err;
    }
  }
}

class Database {
  constructor() {
    this.tables = {
      users: [],
      messages: [],
      mood_entries: [],
      wellness_sessions: [],
      journal_entries: [],
      crisis_events: [],
      user_memories: [],
      system_errors: [],
    };
    
    if (supabase) {
      console.log("🌟 Database initialized in production mode using Supabase PostgreSQL client.");
    } else {
      console.log("⚠️ Supabase credentials missing. Operating in zero-dependency, local In-Memory SQLite Emulator.");
    }
  }

  pragma() {}
  exec() {}

  prepare(sql) {
    if (supabase) {
      return new SupabaseStatement(sql);
    } else {
      return new MockStatement(sql, this.tables);
    }
  }

  async deleteUserAndData(userId) {
    if (supabase) {
      // Delete in Supabase PostgreSQL
      const tables = ['messages', 'mood_entries', 'user_memories', 'crisis_events', 'wellness_sessions', 'journal_entries'];
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('user_id', userId);
        if (error) console.error(`[Supabase Delete ${table} Error]`, error.message);
      }
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) console.error(`[Supabase Delete User Error]`, error.message);
    } else {
      // Delete in In-Memory SQLite Emulator
      this.tables.messages = this.tables.messages.filter(r => r.user_id !== userId);
      this.tables.mood_entries = this.tables.mood_entries.filter(r => r.user_id !== userId);
      this.tables.user_memories = this.tables.user_memories.filter(r => r.user_id !== userId);
      this.tables.crisis_events = this.tables.crisis_events.filter(r => r.user_id !== userId);
      this.tables.wellness_sessions = this.tables.wellness_sessions.filter(r => r.user_id !== userId);
      this.tables.journal_entries = this.tables.journal_entries.filter(r => r.user_id !== userId);
      this.tables.users = this.tables.users.filter(r => r.id !== userId);
    }
    return true;
  }
}

const db = new Database();
export const getDB = () => db;
export const initDB = () => {};

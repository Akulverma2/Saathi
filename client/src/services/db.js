import { openDB } from 'idb';

const DB_NAME = 'saathi_db';
const DB_VERSION = 1;

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('messages')) {
          const msgs = db.createObjectStore('messages', { keyPath: 'id' });
          msgs.createIndex('by_user', 'user_id');
          msgs.createIndex('by_created', 'created_at');
        }
        if (!db.objectStoreNames.contains('moods')) {
          const moods = db.createObjectStore('moods', { keyPath: 'id' });
          moods.createIndex('by_user', 'user_id');
          moods.createIndex('by_created', 'created_at');
        }
        if (!db.objectStoreNames.contains('journals')) {
          const j = db.createObjectStore('journals', { keyPath: 'id' });
          j.createIndex('by_created', 'created_at');
        }
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// Messages
export async function saveMessage(msg) {
  const db = await getDb();
  await db.put('messages', { ...msg, synced: false });
}
export async function getMessages(limit = 50) {
  const db = await getDb();
  const all = await db.getAll('messages');
  return all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(-limit);
}
export async function getUnsyncedMessages() {
  const db = await getDb();
  const all = await db.getAll('messages');
  return all.filter(m => !m.synced && m.role === 'user');
}
export async function markMessageSynced(id) {
  const db = await getDb();
  const msg = await db.get('messages', id);
  if (msg) await db.put('messages', { ...msg, synced: true });
}

// Moods
export async function saveMood(entry) {
  const db = await getDb();
  await db.put('moods', { ...entry, synced: false });
}
export async function getMoods(days = 30) {
  const db = await getDb();
  const all = await db.getAll('moods');
  const cutoff = new Date(Date.now() - days * 86400000);
  return all.filter(m => new Date(m.created_at) >= cutoff)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}
export async function getUnsyncedMoods() {
  const db = await getDb();
  const all = await db.getAll('moods');
  return all.filter(m => !m.synced);
}

// Journals
export async function saveJournal(entry) {
  const db = await getDb();
  await db.put('journals', { ...entry, synced: false });
}
export async function getJournals() {
  const db = await getDb();
  const all = await db.getAll('journals');
  return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// User profile
export async function saveProfile(profile) {
  const db = await getDb();
  await db.put('userProfile', { key: 'profile', ...profile });
}
export async function getProfile() {
  const db = await getDb();
  return db.get('userProfile', 'profile');
}

// Background Sync Queue
export async function addToSyncQueue(requestData) {
  const db = await getDb();
  await db.put('syncQueue', {
    url: requestData.url,
    method: requestData.method,
    body: requestData.body,
    headers: requestData.headers,
    addedAt: new Date().toISOString()
  });
}

export async function getSyncQueue() {
  const db = await getDb();
  return await db.getAll('syncQueue');
}

export async function removeFromSyncQueue(id) {
  const db = await getDb();
  await db.delete('syncQueue', id);
}

export async function closeDb() {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}

export async function clearAllStores() {
  const db = await getDb();
  const stores = ['messages', 'moods', 'journals', 'syncQueue', 'userProfile'];
  for (const store of stores) {
    if (db.objectStoreNames.contains(store)) {
      await db.clear(store);
    }
  }
}

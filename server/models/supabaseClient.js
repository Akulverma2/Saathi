import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;


// Example Usage to replace database.js:
// 
// import { supabase } from '../models/supabaseClient.js';
// 
// // Instead of db.prepare('INSERT...').run()
// const { data, error } = await supabase
//   .from('messages')
//   .insert([
//     { id: messageId, user_id: userId, role: 'user', content: content }
//   ]);
//
// // Instead of db.prepare('SELECT...').get()
// const { data, error } = await supabase
//   .from('users')
//   .select('nickname, language')
//   .eq('id', userId)
//   .single();

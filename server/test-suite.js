import 'dotenv/config';
import assert from 'assert';
import { detectCrisisLevel } from './services/crisisDetector.js';
import { getDB } from './models/database.js';

// Setup basic test cases
const runTests = async () => {
  console.log('🧪 Starting Saathi Backend Test Suite...');
  let passed = 0;
  let failed = 0;

  const test = (name, fn) => {
    try {
      fn();
      console.log(`✅ TEST PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ TEST FAILED: ${name}`);
      console.error(err);
      failed++;
    }
  };

  // 1. Crisis Detection tests
  test('Crisis detector matches Level 3 severe risks', () => {
    const result = detectCrisisLevel('I want to end my life and commit suicide');
    assert.strictEqual(result.level, 3);
    assert.strictEqual(result.requiresImmediate, true);
  });

  test('Crisis detector matches Level 1 mild stressors', () => {
    const result = detectCrisisLevel('I am very stressed about exams and feeling lonely');
    assert.strictEqual(result.level, 1);
    assert.strictEqual(result.requiresImmediate, false);
    assert.strictEqual(result.requiresEscalation, false);
  });

  test('Crisis detector returns Level 0 for normal conversation', () => {
    const result = detectCrisisLevel('Hello! Can you help me plan a study schedule?');
    assert.strictEqual(result.level, 0);
    assert.strictEqual(result.requiresImmediate, false);
  });

  // 2. Database Emulator/CRUD tests
  test('Database mock returns statements and operates in-memory', async () => {
    const db = getDB();
    const testUserId = 'test_user_123';
    
    // Insert mock user
    await db.prepare('INSERT INTO users (id, nickname, language, voice_preference) VALUES (?, ?, ?, ?)')
      .run(testUserId, 'Tester', 'en', 0);
      
    // Fetch mock user
    const user = await db.prepare('SELECT * FROM users WHERE id=?').get(testUserId);
    
    assert.ok(user);
    assert.strictEqual(user.id, testUserId);
    assert.strictEqual(user.nickname, 'Tester');
  });

  console.log('\n--- Test Suite Summary ---');
  console.log(`Passed: ${passed}/${passed + failed}`);
  if (failed > 0) {
    console.error(`❌ FAILED: ${failed} tests failed!`);
    process.exit(1);
  } else {
    console.log('🎉 All checks completed successfully!');
  }
};

runTests().catch(err => {
  console.error('Fatal testing error:', err);
  process.exit(1);
});

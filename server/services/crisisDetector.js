// Crisis detection service — keyword matching + severity scoring
// This is an MVP implementation. Phase 2 should use fine-tuned ML models.

const CRISIS_PATTERNS = {
  level3: {
    // Immediate high-risk - suicide/self-harm explicit and clear indirect hopeless intent
    keywords: [
      'kill myself', 'want to die', 'end my life', 'suicide', 'suicidal',
      'hurt myself', 'self harm', 'self-harm', 'cut myself', 'overdose',
      'मरना चाहता', 'मरना चाहती', 'जीना नहीं चाहता', 'जीना नहीं चाहती',
      'खुद को नुकसान', 'आत्महत्या', 'مرنا چاہتا', 'خودکشی',
      'no reason to live', 'better off dead', 'nobody would miss me',
      'abused', 'being abused', 'someone is hurting me', 'sexual abuse',
      'nobody would notice if i was gone', 'nobody would notice if i died',
      'better off dead', 'better off if i was dead', 'want to end it all',
      'ending my life', 'जीने का कोई फायदा नहीं', 'मर जाना चाहिए',
      'मैं मरना', 'सब खत्म करना चाहता', 'सब खत्म करना चाहती',
      'sab khatam karna hai', 'sab kuch khatam karna', 'mar jana chahta',
      'mar jana chahti', 'koi fayda nahi hai jeene ka', 'no one would notice if i was gone'
    ],
    score: 3,
  },
  level2: {
    // Moderate risk - distress signals, severe hopelessness
    keywords: [
      'hopeless', 'worthless', 'nobody cares', 'cant go on', "can't go on",
      'disappear', 'give up', 'no point', 'hate myself', 'hate my life',
      'tired of everything', 'tired of living', 'nothing matters',
      'बेकार हूं', 'किसी को परवाह नहीं', 'हार मान ली', 'बहुत थक गया',
      'alone forever', 'always alone', 'no friends', 'completely alone',
      'panic attack', 'cant breathe', "can't breathe", 'breaking down',
      'tired of this life', 'tired of my life', 'zindagi se tang',
      'tang aa chuka', 'tang aa chuki', 'jeena nahi hai', 'koi nahi chahta mujhe',
      'koi pyar nahi karta', 'मैं थक गया हूँ', 'मैं थक गई हूँ', 'अब नहीं हो रहा',
      'अब नहीं होता', 'can\'t handle this anymore', 'cant handle this anymore',
      'can\'t take this anymore', 'cant take this anymore', 'nothing goes right',
      'no one cares about me'
    ],
    score: 2,
  },
  level1: {
    // Mild - elevated distress, needs support
    keywords: [
      'stressed', 'anxious', 'anxiety', 'depressed', 'depression', 'sad',
      'crying', 'scared', 'afraid', 'worried', 'overwhelmed', 'exhausted',
      'can\'t sleep', 'not eating', 'bullied', 'bullying', 'lonely',
      'परेशान', 'दुखी', 'अकेला', 'नींद नहीं', 'डर', 'चिंता',
      'failing', 'failed', 'failure', 'disappointed', 'pressure',
    ],
    score: 1,
  },
};

export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  let normalized = text.toLowerCase().trim();

  // 1. Remove excessive repeated characters (e.g., "goooood" -> "good", "sadddd" -> "sad")
  // Collapses 3+ repeated characters to 2: e.g., "ooo" -> "oo", "ddd" -> "d"
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1');

  // 2. Map common typos/slang to canonical keywords
  const typoMap = {
    // Happy / Good
    'godd': 'good',
    'gud': 'good',
    'goodd': 'good',
    'hapy': 'happy',
    'happi': 'happy',
    'happey': 'happy',
    'hppy': 'happy',
    'awsum': 'awesome',
    'awsome': 'awesome',
    'exited': 'excited',
    'grt': 'great',
    'graet': 'great',

    // Sad / Lonely
    'sadd': 'sad',
    'lonly': 'lonely',
    'lonli': 'lonely',
    'depresed': 'depressed',
    'depres': 'depressed',
    'hurted': 'hurt',
    'confusd': 'confused',

    // Greetings
    'helo': 'hello',
    'hellow': 'hello',
    'hallo': 'hello',
    'hii': 'hi',
    'hiii': 'hi',
    'heyy': 'hey',
    'heyyy': 'hey',
    'hlo': 'hello',

    // Crisis / Stress
    'suiced': 'suicide',
    'suicid': 'suicide',
    'sucide': 'suicide',
    'suiside': 'suicide',
    'selfharm': 'self harm',
    'anxous': 'anxious',
    'anxios': 'anxious',
    'tention': 'tension',
    'stres': 'stress',
    'exm': 'exam',
    'stdy': 'study',

    // Wellness / Physical
    'perod': 'period',
    'pirod': 'period',
    'cramps': 'cramp',
    'tiredd': 'tired',
    'tred': 'tired',
    'slep': 'sleep',
    'sleepp': 'sleep',
    'headach': 'headache',

    // Hinglish / Hindi
    'khus': 'khush',
    'acha': 'achha',
    'thik': 'theek',
    'kasa': 'kaise',
    'keise': 'kaise',
    'udass': 'udas',
    'akelaa': 'akela',
    'tashan': 'tension',
    'tensen': 'tension',
    'studdi': 'study'
  };

  // Replace whole words or parts of words matching the typos using word boundary
  for (const [typo, correction] of Object.entries(typoMap)) {
    const regex = new RegExp(`\\b${typo}\\b`, 'g');
    normalized = normalized.replace(regex, correction);
  }

  return normalized;
}

export function detectCrisisLevel(text) {
  if (!text || typeof text !== 'string') return { level: 0, keywords: [] };

  const lowerText = normalizeText(text);
  const matchedKeywords = [];
  let maxLevel = 0;

  // Check level 3 first (most critical)
  for (const keyword of CRISIS_PATTERNS.level3.keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push({ keyword, level: 3 });
      maxLevel = 3;
    }
  }

  // Check level 2
  for (const keyword of CRISIS_PATTERNS.level2.keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push({ keyword, level: 2 });
      if (maxLevel < 2) maxLevel = 2;
    }
  }

  // Check level 1
  for (const keyword of CRISIS_PATTERNS.level1.keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push({ keyword, level: 1 });
      if (maxLevel < 1) maxLevel = 1;
    }
  }

  return {
    level: maxLevel,
    keywords: matchedKeywords,
    requiresImmediate: maxLevel === 3,
    requiresEscalation: maxLevel >= 2,
  };
}

export function getHelplineInfo(language = 'en') {
  const helplines = {
    en: [
      { name: 'iCall (TISS)', number: '9152987821', available: 'Mon-Sat, 8am-10pm', free: false },
      { name: 'KIRAN Mental Health', number: '1800-599-0019', available: '24/7', free: true },
      { name: 'Vandrevala Foundation', number: '1860-2662-345', available: '24/7', free: false },
      { name: 'Emergency', number: '112', available: '24/7', free: true },
    ],
    hi: [
      { name: 'किरण हेल्पलाइन', number: '1800-599-0019', available: '24/7, मुफ्त', free: true },
      { name: 'iCall (TISS)', number: '9152987821', available: 'सोम-शनि, सुबह 8 - रात 10', free: false },
      { name: 'आपातकालीन', number: '112', available: '24/7', free: true },
    ],
  };
  return helplines[language] || helplines.en;
}

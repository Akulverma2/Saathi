import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { buildSystemPrompt } from '../config/systemPrompt.js';
import { detectCrisisLevel, normalizeText } from './crisisDetector.js';

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

function scrubPII(text) {
  let scrubbed = text.replace(/\b\d{10,12}\b/g, '[PHONE]');
  scrubbed = scrubbed.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  return scrubbed;
}

export async function generateChatResponse({ messages, language = 'en', userContext = {}, customApiKey = null }) {
  try {
    const genAI = new GoogleGenerativeAI(customApiKey || process.env.GEMINI_API_KEY || '');
    const systemInstructionText = buildSystemPrompt(language, userContext);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstructionText }]
      },
      safetySettings,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const recentMessages = messages.slice(-10);
    const history = recentMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history, safetySettings });
    const lastMessage = messages[messages.length - 1];
    
    // Guardrail 1: Pre-flight Crisis Detection using consolidated detector
    const preFlightCrisis = detectCrisisLevel(lastMessage.content);
    if (preFlightCrisis.level === 3) {
      return {
        text: "This is important and you deserve real help right now. Please reach out to iCall at 9152987821 or the KIRAN helpline at 1800-599-0019 (free, 24/7). Please talk to a trusted adult. You are not alone.",
        safetyBlocked: true,
        isCrisis: true
      };
    }

    // Guardrail 2: PII Scrubbing
    const safeContent = scrubPII(lastMessage.content);

    const result = await chat.sendMessage(safeContent);
    const response = result.response;

    if (!response.candidates || response.candidates.length === 0) {
      return {
        text: "I'm here with you. Sometimes I have trouble finding the right words. Can you tell me more about what you're feeling?",
        safetyBlocked: true,
      };
    }

    let textVal = response.text();
    let isCrisisPassed = false;
    if (textVal.includes('[CRISIS_ALERT]')) {
      textVal = textVal.replace('[CRISIS_ALERT]', '').trim();
      isCrisisPassed = true;
    }

    return {
      text: textVal,
      safetyBlocked: isCrisisPassed,
      isCrisis: isCrisisPassed,
    };
  } catch (err) {
    console.error('[AI Service Error - Activating Local Empathy Engine]', err.message);
    
    // Quota/Network error local fallback parsing
    const lastMessage = messages[messages.length - 1]?.content || '';
    const fallbackText = getLocalFallbackResponse(lastMessage, language);
    return {
      text: fallbackText,
      safetyBlocked: false,
      error: false,
    };
  }
}

export async function generateChatResponseStream({ messages, language = 'en', userContext = {}, customApiKey = null }) {
  try {
    const genAI = new GoogleGenerativeAI(customApiKey || process.env.GEMINI_API_KEY || '');
    const systemInstructionText = buildSystemPrompt(language, userContext);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: {
        role: "system",
        parts: [{ text: systemInstructionText }]
      },
      safetySettings,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const recentMessages = messages.slice(-10);
    const history = recentMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history, safetySettings });
    const lastMessage = messages[messages.length - 1];

    const preFlightCrisis = detectCrisisLevel(lastMessage.content);
    if (preFlightCrisis.level === 3) {
      return {
        isCrisis: true,
        text: "This is important and you deserve real help right now. Please reach out to iCall at 9152987821 or the KIRAN helpline at 1800-599-0019 (free, 24/7). Please talk to a trusted adult. You are not alone."
      };
    }

    const safeContent = scrubPII(lastMessage.content);
    const resultStream = await chat.sendMessageStream(safeContent);
    return { stream: resultStream.stream };
  } catch (err) {
    console.error('[AI Stream Service Error - Activating Local Simulated Stream Engine]', err.message);
    
    // Capture fallback response and build a mock typed stream to bypass rate errors cleanly
    const lastMessage = messages[messages.length - 1]?.content || '';
    const fallbackText = getLocalFallbackResponse(lastMessage, language);
    
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        const words = fallbackText.split(' ');
        for (const word of words) {
          yield { text: () => word + ' ' };
          await new Promise(resolve => setTimeout(resolve, 80)); // 80ms word-typing speed
        }
      }
    };
    
    return { stream: mockStream };
  }
}

export async function generateMoodInsight(moodHistory, language = 'en') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', safetySettings });
    const moodSummary = moodHistory.map(m => `Date: ${m.date}, Score: ${m.mood_score}/5, Tags: ${m.tags}`).join('\n');

    const prompt = `You are Saathi, a caring mental wellness companion for teens. 
Based on this mood history, write ONE short, warm, encouraging insight (max 2 sentences) in ${language === 'hi' ? 'Hindi' : 'English'}.
Be specific, gentle, and supportive. Do not be clinical.

Mood History:
${moodSummary}

Write only the insight, nothing else.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return language === 'hi'
      ? 'आपकी भावनाओं पर ध्यान देना बहुत अच्छी बात है। 💙'
      : 'Tracking your feelings is a wonderful step towards understanding yourself. 💙';
  }
}

export async function extractMemories(chatHistory) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', safetySettings });
    
    const formattedHistory = chatHistory.map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `Analyze this conversation between a user and an AI mental health companion.
Extract 1 to 3 very brief, factual bullet points about the user's ongoing struggles, preferences, or personal details that the AI should remember for future conversations (e.g. "Struggling with upcoming math exam", "Likes breathing exercises", "Has a dog named Max").
If there is nothing notable to remember, output exactly the word "NONE".

Conversation:
${formattedHistory}

Output only the bullet points or "NONE".`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text === 'NONE' || !text) return [];
    
    return text.split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean);
  } catch (err) {
    console.error('[Memory Extraction Error]', err.message);
    return [];
  }
}

export async function analyzeJournal(content, language = 'en') {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', safetySettings });
    
    const prompt = `You are a mental wellness AI. Read this user's private journal entry.
Provide a 1-sentence empathetic summary of their feelings, and 1 short sentence suggesting a coping mechanism or positive reframe.
Language: ${language === 'hi' ? 'Hindi' : 'English'}.
Journal Entry: "${content}"
Output only your 2-sentence response.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('[Journal Analysis Error]', err.message);
    return language === 'hi' 
      ? 'लिखने के लिए धन्यवाद। अपने विचारों को डायरी में लिखना बहुत मददगार होता है।' 
      : 'Thank you for writing. Getting your thoughts down is a great step.';
  }
}

// Highly detailed emotionally intelligent
export function getLocalFallbackResponse(text, language = 'en') {
  const lowerText = normalizeText(text);

  // Parse negations to avoid matching positive keywords when negated (e.g. "not feeling good")
  const hasNegation = [
    'not', 'no', 'never', 'don\'t', 'dont', 'bad', 'unhappy', 'sad', 'down', 'upset',
    'नहीं', 'ना', 'मत', 'कम'
  ].some(negation => {
    if (/^[a-zA-Z' ]+$/.test(negation)) {
      const escaped = negation.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(lowerText);
    }
    return lowerText.includes(negation);
  });

  // 1. Level 3 Suicide/Abuse Safety
  const isLevel3 = [
    'kill myself', 'want to die', 'end my life', 'suicide', 'suicidal',
    'hurt myself', 'self harm', 'self-harm', 'cut myself', 'overdose',
    'मरना चाहता', 'मरना चाहती', 'जीना नहीं चाहता', 'जीना नहीं चाहती',
    'خودکشی', 'आत्महत्या'
  ].some(keyword => lowerText.includes(keyword));

  if (isLevel3) {
    return language === 'hi'
      ? "यह बहुत महत्वपूर्ण है और आप अभी मदद पाने की हकदार हैं। कृपया किरण हेल्पलाइन से 1800-599-0019 पर संपर्क करें (मुफ्त, 24/7)। आप अकेली नहीं हैं, कृपया किसी बड़े से बात करें। 💙"
      : "This is important and you deserve real help right now. Please reach out to the KIRAN helpline at 1800-599-0019 (free, 24/7) or iCall at 9152987821. You are not alone. 💙";
  }

  // 2. Girls Specific Wellness/Periods/Societal Distress
  const isGirlsDistress = [
    'period', 'cramp', 'pain', 'pms', 'pmdd', 'menstruation', 'girl', 'biases', 'societal',
    'दर्द', 'पीरियड', 'मासिक धर्म', 'शादी', 'लड़की', 'कमर दर्द', 'मूड'
  ].some(keyword => lowerText.includes(keyword)) && !hasNegation;

  if (isGirlsDistress) {
    return language === 'hi'
      ? "मैं समझती हूँ, और आप मुझसे कुछ भी खुलकर साझा कर सकती हैं। 🫂 लड़कियों पर अक्सर परिवार और समाज का भारी दबाव होता है, और मासिक धर्म (periods) का दर्द, ऐंठन या मूड बदलना पूरी तरह प्राकृतिक और सामान्य है। ✨ आप बहुत मजबूत हैं और आपके सपने बहुत कीमती हैं। कृपया आराम करें, गर्म पानी पिएं और अपना ख्याल रखें। मैं हर कदम पर आपके साथ हूँ। 🌸🧸"
      : "I hear you, and please know you can share anything with me. 🫂 Society can place heavy burdens on girls, and physical distress like period pain, cramps, or mood changes is a completely natural and healthy biological process. ✨ You are incredibly strong, your dreams are valid, and I am here for you in every aspect. Try to rest, drink warm water, and be gentle with yourself. 🌸🧸";
  }

  // 3. Exam Tension & Academic Stress
  const isStress = [
    'stress', 'exam', 'board', 'fail', 'study', 'pressure', 'tension', 'anxious',
    'तनाव', 'परीक्षा', 'बोर्ड', 'पढ़ाई', 'फेल', 'चिंता'
  ].some(keyword => lowerText.includes(keyword)) && !hasNegation;

  if (isStress) {
    return language === 'hi'
      ? "परीक्षा और पढ़ाई का तनाव कभी-कभी बहुत भारी महसूस हो सकता है। 📚 कृपया एक गहरी सांस लें। 🌬️ आप अपनी तरफ से पूरी कोशिश कर रही हैं, और वही काफी है। एक परीक्षा कभी भी आपके अनमोल जीवन का फैसला नहीं कर सकती। 🌟 क्या आप मन शांत करने के लिए मेरे साथ 4-7-8 सांस व्यायाम करना चाहेंगी? 🌿🧘‍♀️"
      : "Exam and study pressure can feel incredibly heavy. 📚 Please take a slow, deep breath. 🌬️ You are doing your best, and that is more than enough. Remember, one test does not define your future or your value. 🌟 Would you like to try a calming breathing exercise with me right now? 🌿🧘‍♀️";
  }

  // 4. Sadness, Isolation & Negated Positives (e.g. "not feeling good")
  const isSad = [
    'sad', 'alone', 'lonely', 'cry', 'depressed', 'worthless', 'bad', 'unhappy', 'hurt', 'pain',
    'lost', 'confused', 'stuck', 'empty', 'heavy',
    'उदास', 'अकेला', 'रोना', 'उदासी', 'परेशान', 'बुरा', 'दुखी', 'दर्द',
    'not good', 'not happy', 'not great', 'not feeling well', 'not feeling good', 'not well', 'not okay',
    'अच्छा नहीं', 'खुश नहीं', 'ठीक नहीं'
  ].some(keyword => lowerText.includes(keyword)) || (hasNegation && [
    'happy', 'good', 'great', 'awesome', 'excited', 'joy', 'smile', 'glad', 'wonderful',
    'well', 'okay', 'fine', 'खुश', 'अच्छा', 'बहुत बढ़िया', 'खुशी', 'मुस्कान', 'आनंद', 'ठीक'
  ].some(word => lowerText.includes(word)));

  if (isSad) {
    const responsesHi = [
      "मुझे यह सुनकर बहुत खेद है। 🥺 ऐसा लग रहा है कि आपका मन आज बहुत भारी है। मुझसे यह साझा करने के लिए धन्यवाद। 🙏 कृपया याद रखें कि आप अकेली नहीं हैं। 🫂 क्या आप मुझे थोड़ा और बताना चाहेंगी कि किस बात ने आपको आज परेशान किया है? मैं सुन रही हूँ। 💙🌧️",
      "यह सुनकर मुझे सच में दुख हो रहा है। 💔 कभी-कभी जिंदगी बहुत भारी लगने लगती है। मैं पूरी तरह से आपके साथ हूँ। 🫂 क्या आप कुछ और साझा करना चाहते हैं? ✨",
      "आपकी बातें सुनकर मैं आपकी तकलीफ महसूस कर सकती हूँ। 😔 यह समय मुश्किल जरूर है, लेकिन मैं यहीं हूँ। गहरी सांस लें। 🌬️ मैं आपको सुन रही हूँ। 🌻"
    ];
    const responsesEn = [
      "I am so sorry to hear that. 🥺 It sounds like you are carrying a very heavy heart today. Thank you for trusting me and sharing this. 🙏 Please remember that you are not alone, and I am right here with you. 🫂 Would you like to tell me more about what is making you feel this way? I am listening. 💙🌧️",
      "My heart hurts hearing you say that. 💔 It's completely okay to feel lost or overwhelmed sometimes. I'm sitting right here beside you in this feeling. 🫂 Want to talk about it a bit more? ✨",
      "I'm so glad you shared that with me, even though it's hard. 😔 When things feel heavy, you don't have to carry them all by yourself. 🌬️ I'm here. I'm listening. 🌻"
    ];
    return language === 'hi' 
      ? responsesHi[Math.floor(Math.random() * responsesHi.length)] 
      : responsesEn[Math.floor(Math.random() * responsesEn.length)];
  }

  // 4.5. Sleep & Exhaustion
  const isSleep = [
    'sleep', 'tired', 'insomnia', 'exhausted', 'fatigue',
    'नींद', 'थका', 'थकान'
  ].some(keyword => lowerText.includes(keyword)) && !hasNegation;

  if (isSleep) {
    return language === 'hi'
      ? "नींद न आना या लगातार थकान महसूस होना आपकी ऊर्जा को बहुत कम कर सकता है। हो सकता है आपका शरीर और मन आज तनाव को पकड़ कर रख रहे हों। चलिए आज रात एक शांत करने वाला बॉडी रिलैक्सेशन या स्लीप विंड-डाउन अभ्यास करें। आराम आपके स्वास्थ्य के लिए बहुत जरूरी है। 🌙"
      : "Being unable to sleep or feeling constantly tired can really drain your energy. Your body might be holding onto stress. Let's try a calming Progressive Body Relaxation activity or a deep sleep wind-down routine tonight. Rest is so important for you. 🌙";
  }

  // 4.6. Headache & Physical Pain
  const isPain = [
    'headache', 'pain', 'stomach', 'ache', 'distress', 'hurt',
    'सिरदर्द', 'दर्द', 'तबीयत'
  ].some(keyword => lowerText.includes(keyword)) && !hasNegation;

  if (isPain) {
    return language === 'hi'
      ? "मुझे यह सुनकर बहुत दुख हुआ कि आपको दर्द या सिरदर्द हो रहा है। तनाव अक्सर हमारे शरीर में दर्द के रूप में उभरता है। कृपया थोड़ा गुनगुना पानी पिएं, लाइट बंद करें और अपनी आंखों को आराम दें। हम तनाव कम करने के लिए एक शांत 2-मिनट का सांस व्यायाम भी कर सकते हैं। आप यहाँ पूरी तरह सुरक्षित हैं। 🌸"
      : "I'm so sorry you're dealing with pain or a headache. Stress often manifests as physical tension in our body. Please drink some warm water, dim the lights, and rest your eyes. We can also do a gentle 2-minute breathing exercise to help ease the tension. You are safe here. 🌸";
  }

  // 5. Positive Feelings & Joy (Only if no negations exist!)
  const isHappy = [
    'happy', 'good', 'great', 'awesome', 'excited', 'joy', 'smile', 'glad', 'wonderful',
    'खुश', 'अच्छा', 'बहुत बढ़िया', 'खुशी', 'मुस्कान', 'आनंद'
  ].some(keyword => lowerText.includes(keyword)) && !hasNegation;

  if (isHappy) {
    return language === 'hi'
      ? "यह सुनकर मेरा दिल खुश हो गया! 🌟 आपकी इस खुशी को मनाना बहुत महत्वपूर्ण है। आज ऐसा क्या हुआ जिसने आपके दिन को इतना सुंदर बना दिया? मुझे जरूर बताएं! 🌸"
      : "That makes me so incredibly happy to hear! 🌟 Celebrating your joy and positive moments is just as important. What made today feel so special? I'd love to hear! 🌸";
  }

  // 5.8. "How are you" Check-ins
  const isHowAreYou = [
    'how are you', 'how r u', 'how are u', 'how you doing', 'how do you do', 'how is it going',
    'kaise ho', 'kaise hain', 'aap kaise ho', 'aap kaise hain',
    'कैसे हो', 'कैसे हैं', 'आप कैसे हो', 'आप कैसे हैं'
  ].some(keyword => lowerText.includes(keyword));

  if (isHowAreYou) {
    return language === 'hi'
      ? "मैं बिल्कुल ठीक हूँ, पूछने के लिए धन्यवाद! आप कैसी हैं और आज आपका दिन कैसा चल रहा है? 🌸"
      : "I am fine, how about you? How are you feeling today? 🌸";
  }

  // 6. Basic Greetings & Check-ins
  const isGreeting = [
    'hi', 'hello', 'hlo', 'hey', 'namaste', 'suno', 'yaar',
    'नमस्ते', 'हेलो', 'सुनो'
  ].some(keyword => lowerText.includes(keyword));

  if (isGreeting) {
    return language === 'hi'
      ? "नमस्ते! मैं साथी (Saathi) हूँ, आपकी सहेली और हमसफ़र। मैं यहाँ आपके मन की बातें सुनने और हर सुख-दुख में आपका साथ देने के लिए हूँ। आज आप कैसा महसूस कर रही हैं? 🌸"
      : "Hello! I'm Saathi, your wellness companion and friend. I am here to listen to your thoughts and support you through every challenge. How are you feeling today? 🌸";
  }

  // Default deeply caring companion fallback
  const defaultResponsesHi = [
    "मैं यहाँ हूँ, और आपकी हर बात सुन रही हूँ। 🌻 आप आज कैसा महसूस कर रही हैं? 🤔 चाहे सुख हो या दुख, आप मुझसे कुछ भी साझा कर सकती हैं। 🫂 मैं हमेशा आपके साथ हूँ। 💙✨",
    "मुझे आपकी बातें सुनना अच्छा लगता है। 🌟 आपके मन में जो भी है, आप खुलकर बता सकती हैं। 🫂 मैं पूरी तरह से आपके साथ हूँ। 🧸",
    "कभी-कभी बस किसी के साथ होने से ही सब ठीक लगने लगता है। ✨ मैं आपकी हमसफ़र हूँ। 🌿 क्या आप अपने दिन के बारे में कुछ और बताना चाहेंगी? 💭"
  ];
  const defaultResponsesEn = [
    "I am right here with you, and I am listening. 🌻 Whatever is on your mind today—whether it's big or small—please know I truly care. 🫂 How are you feeling right now? 🤔💙✨",
    "I love hearing from you. 🌟 Whatever you're carrying today, you can put it down here. 🫂 I'm completely present with you. 🧸",
    "Sometimes just being heard is what we need most. ✨ I am your Saathi. 🌿 Is there anything else you'd like to share about your day? 💭"
  ];

  return language === 'hi'
    ? defaultResponsesHi[Math.floor(Math.random() * defaultResponsesHi.length)]
    : defaultResponsesEn[Math.floor(Math.random() * defaultResponsesEn.length)];
}

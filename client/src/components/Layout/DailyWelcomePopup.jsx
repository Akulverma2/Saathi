import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ── 365 thoughts, one per day ──────────────────────────────────────────────
const THOUGHTS = [
  "You are enough, exactly as you are today. 🌿",
  "Every storm runs out of rain. Brighter days are ahead. ☀️",
  "Small steps every day lead to big changes over time. 🚶",
  "Your feelings are valid. You don't have to pretend to be okay. 💚",
  "Be gentle with yourself — you are doing the best you can. 🌸",
  "Growth begins the moment you step out of your comfort zone. 🌱",
  "You have survived every difficult day so far. You're stronger than you think. 💪",
  "Rest is not giving up — it's preparing for your next beginning. 🌙",
  "One kind word to yourself today can change your entire day. 🕊️",
  "You don't have to have it all figured out. Just take the next small step. 👣",
  "Breathe. This moment is yours. 🍃",
  "You are worthy of love, peace, and all good things. 💛",
  "Courage doesn't mean you aren't afraid — it means you move forward anyway. 🦋",
  "Today is a new beginning. What will you create with it? ✨",
  "Your mental health is just as important as your physical health. 🧠",
  "Healing is not linear — and that's perfectly okay. 🌊",
  "You matter more than you know. 🌟",
  "It's okay to ask for help. That's what brave people do. 🤝",
  "The present moment is where life happens. Be here now. 🌼",
  "You have the power to choose how you respond to life's challenges. 🔥",
  "Kindness to yourself is the first step to kindness to others. 💝",
  "Every day you wake up is another chance to start fresh. 🌅",
  "Your potential is limitless — don't let doubt shrink it. 🚀",
  "Peace is not the absence of difficulty, it's the calm within it. 🏔️",
  "What you water grows. Water good thoughts today. 🌺",
  "You are allowed to take up space and be fully yourself. 🌈",
  "Difficult roads often lead to beautiful destinations. 🗺️",
  "Even the smallest act of self-care is a powerful statement. 🛁",
  "You are not your mistakes. You are what you choose to do next. 🦅",
  "Give yourself the grace you would give a dear friend. 💞",
  "Your story is still being written. The best chapters are ahead. 📖",
];

const MOODS = [
  { id: 'great',   label: 'Great',   emoji: '😄', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.4)' },
  { id: 'good',    label: 'Good',    emoji: '😊', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)' },
  { id: 'stressed',label: 'Stressed',emoji: '😤', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.4)' },
];

const STORAGE_KEY = 'saathi_daily_popup_date';

function getTodayThought() {
  const now  = new Date();
  const day  = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return THOUGHTS[day % THOUGHTS.length];
}

function shouldShowToday() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const today  = new Date().toDateString();
  return stored !== today;
}

function markShownToday() {
  localStorage.setItem(STORAGE_KEY, new Date().toDateString());
}

export default function DailyWelcomePopup({ userName }) {
  const [visible,      setVisible]      = useState(false);
  const [step,         setStep]         = useState('thought'); // 'thought' | 'mood' | 'done'
  const [selectedMood, setSelectedMood] = useState(null);
  const [leaving,      setLeaving]      = useState(false);
  const navigate = useNavigate();
  const thought = getTodayThought();

  useEffect(() => {
    if (shouldShowToday()) {
      // Small delay so the app shell renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setLeaving(true);
    markShownToday();
    setTimeout(() => { setVisible(false); setLeaving(false); }, 350);
  };

  const goToMood = () => setStep('mood');

  const submitMood = () => {
    if (!selectedMood) return;
    const mood = MOODS.find(m => m.id === selectedMood);
    // Store mood message so ChatView picks it up on mount
    const moodMsg = `I'm feeling ${mood.label} today ${mood.emoji}`;
    sessionStorage.setItem('saathi_pending_mood_msg', moodMsg);
    // Dismiss popup first, then navigate to chat
    markShownToday();
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      setLeaving(false);
      navigate('/chat');
    }, 300);
  };

  if (!visible) return null;

  const name = userName || 'Friend';

  return (
    <div className={`dwp-overlay ${leaving ? 'dwp-leave' : ''}`}>
      <div className={`dwp-card ${leaving ? 'dwp-card-leave' : ''}`}>

        {/* ── STEP 1: Thought of the Day ───────────────── */}
        {step === 'thought' && (
          <div className="dwp-step animate-fade-in">
            {/* Top glow blob */}
            <div className="dwp-blob" />

            <div className="dwp-thought-icon">🌿</div>
            <p className="dwp-greeting">Good {getTimeOfDay()}, {name}!</p>
            <h2 className="dwp-section-title">Thought of the Day</h2>

            <div className="dwp-quote-card">
              <span className="dwp-quote-mark">"</span>
              <p className="dwp-quote-text">{thought}</p>
              <span className="dwp-quote-mark dwp-quote-mark-end">"</span>
            </div>

            <button className="dwp-btn-primary" onClick={goToMood}>
              Continue &rarr;
            </button>
            <button className="dwp-btn-ghost" onClick={dismiss}>
              Skip for today
            </button>
          </div>
        )}

        {/* ── STEP 2: Mood check-in ────────────────────── */}
        {step === 'mood' && (
          <div className="dwp-step animate-fade-in">
            <div className="dwp-blob dwp-blob-2" />
            <div className="dwp-thought-icon">🌸</div>
            <h2 className="dwp-section-title">How are you feeling?</h2>
            <p className="dwp-subtitle">Take a moment to check in with yourself.</p>

            <div className="dwp-mood-grid">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  className={`dwp-mood-btn ${selectedMood === m.id ? 'dwp-mood-selected' : ''}`}
                  style={{
                    '--mood-color': m.color,
                    '--mood-bg':    m.bg,
                    '--mood-border': m.border,
                  }}
                  onClick={() => setSelectedMood(m.id)}
                >
                  <span className="dwp-mood-emoji">{m.emoji}</span>
                  <span className="dwp-mood-label">{m.label}</span>
                </button>
              ))}
            </div>

            <button
              className="dwp-btn-primary"
              onClick={submitMood}
              disabled={!selectedMood}
              style={{ opacity: selectedMood ? 1 : 0.5 }}
            >
              {selectedMood
                ? `I'm feeling ${MOODS.find(m => m.id === selectedMood)?.label} ${MOODS.find(m => m.id === selectedMood)?.emoji}`
                : 'Select your mood'}
            </button>
            <button className="dwp-btn-ghost" onClick={dismiss}>
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/apiClient';

const SLEEP_THEME = {
  page: {
    background: 'linear-gradient(135deg, #1a1035 0%, #0d0b2e 40%, #0a0a23 100%)',
    color: '#e0d6f6',
    minHeight: 'calc(100dvh - var(--header-height) - var(--nav-height))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    fontFamily: 'inherit',
    overflow: 'hidden',
  },
  stars: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    color: '#b8a9d4',
    borderColor: 'transparent',
  },
  stepBadge: {
    display: 'inline-block',
    padding: '4px 14px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    letterSpacing: '0.05em',
    background: 'rgba(139,92,246,0.18)',
    color: '#c4b5fd',
    marginBottom: '8px',
  },
  title: {
    color: '#e0d6f6',
    fontSize: '1.6rem',
    fontWeight: 700,
    marginBottom: '4px',
  },
  subtitle: {
    color: '#9b8cbf',
    fontSize: '0.95rem',
    marginBottom: '24px',
  },
  progressTrack: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
  },
  timerRing: {
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginBottom: '32px',
    position: 'relative',
  },
  timerNumber: {
    fontSize: '3rem',
    fontWeight: 700,
    color: '#e0d6f6',
    lineHeight: 1,
  },
  timerLabel: {
    fontSize: '0.85rem',
    color: '#9b8cbf',
    marginTop: '4px',
  },
  instruction: {
    fontSize: '1.15rem',
    color: '#d4c6f0',
    textAlign: 'center',
    maxWidth: '340px',
    lineHeight: 1.6,
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathLabel: {
    fontSize: '1.3rem',
    fontWeight: 600,
    color: '#c4b5fd',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
  },
  doneEmoji: {
    fontSize: '3.5rem',
    marginBottom: '16px',
  },
  doneTitle: {
    fontSize: '1.8rem',
    fontWeight: 700,
    color: '#e0d6f6',
    marginBottom: '8px',
  },
  doneSub: {
    fontSize: '1rem',
    color: '#9b8cbf',
    marginBottom: '32px',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    border: 'none',
    color: '#fff',
    boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
  },
};

/* ── Tiny animated stars ────────────────────────────────── */
function Stars() {
  const stars = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 1,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
    }))
  ).current;

  return (
    <div style={SLEEP_THEME.stars}>
      {stars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: '#c4b5fd',
            opacity: 0.35,
            animation: `sleepTwinkle ${s.duration} ease-in-out ${s.delay} infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes sleepTwinkle {
          0%  { opacity: 0.15; transform: scale(0.8); }
          100%{ opacity: 0.6;  transform: scale(1.2); }
        }
        @keyframes sleepPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(139,92,246,0.25); }
          50%      { box-shadow: 0 0 70px rgba(139,92,246,0.45); }
        }
        @keyframes sleepFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes sleepFadeSlide {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Progress dots ──────────────────────────────────────── */
function ProgressDots({ current, total }) {
  return (
    <div style={SLEEP_THEME.progressTrack}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '28px' : '10px',
            height: '10px',
            borderRadius: '999px',
            background: i < current ? '#7c3aed' : i === current ? '#a78bfa' : 'rgba(139,92,246,0.2)',
            transition: 'all 0.4s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ── Timer ring (SVG arc) ───────────────────────────────── */
function TimerRing({ timeLeft, totalTime, children }) {
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset = circumference * (1 - progress);

  return (
    <div style={SLEEP_THEME.timerRing}>
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="5" />
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke="#a78bfa" strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      {children}
    </div>
  );
}

/* ── Step configurations ────────────────────────────────── */
const BODY_SCAN_PARTS = [
  'sleep_body_toes',
  'sleep_body_legs',
  'sleep_body_stomach',
  'sleep_body_shoulders',
  'sleep_body_face',
  'sleep_body_whole',
];

const STEPS = [
  { id: 'dnd', duration: 30, titleKey: 'sleep_step1_title', instructionKey: 'sleep_step1_instruction' },
  { id: 'breathing', duration: 40, titleKey: 'sleep_step2_title', instructionKey: 'sleep_step2_instruction' },
  { id: 'bodyscan', duration: 120, titleKey: 'sleep_step3_title', instructionKey: 'sleep_step3_instruction' },
];

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */
export default function SleepWindDown({ activity, onComplete }) {
  const { t } = useTranslation();

  // Core state
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(STEPS[0].duration);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready | running | done

  // Breathing sub-state (step 2)
  const [breathCycle, setBreathCycle] = useState(0); // 0-4
  const [breathPhase, setBreathPhase] = useState('in'); // 'in' | 'out'
  const [breathSec, setBreathSec] = useState(4);

  // Body scan sub-state (step 3)
  const [scanPartIndex, setScanPartIndex] = useState(0);

  const timerRef = useRef(null);
  const step = STEPS[stepIndex];

  /* ── Master timer ────────────────────────────────────── */
  useEffect(() => {
    if (!isActive) return;

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else {
      // Step finished
      if (stepIndex < STEPS.length - 1) {
        const next = stepIndex + 1;
        setStepIndex(next);
        setTimeLeft(STEPS[next].duration);
        // reset sub-states for next step
        if (STEPS[next].id === 'breathing') {
          setBreathCycle(0);
          setBreathPhase('in');
          setBreathSec(4);
        }
        if (STEPS[next].id === 'bodyscan') {
          setScanPartIndex(0);
        }
      } else {
        // All done
        setIsActive(false);
        setPhase('done');
        saveSession();
      }
    }

    return () => clearTimeout(timerRef.current);
  }, [isActive, timeLeft, stepIndex]);

  /* ── Breathing sub-timer (step 2) ────────────────────── */
  useEffect(() => {
    if (!isActive || step.id !== 'breathing') return;

    if (breathSec > 0) return; // wait for main timer to tick

    // Flip phase
    if (breathPhase === 'in') {
      setBreathPhase('out');
      setBreathSec(4);
    } else {
      if (breathCycle < 4) {
        setBreathCycle(c => c + 1);
        setBreathPhase('in');
        setBreathSec(4);
      }
    }
  }, [isActive, step.id, breathSec, breathPhase, breathCycle]);

  // Decrement breath-specific second counter alongside main timer
  useEffect(() => {
    if (!isActive || step.id !== 'breathing') return;
    setBreathSec(prev => Math.max(prev - 1, 0));
  }, [timeLeft]); // fires each time master timeLeft ticks

  /* ── Body scan rotation (step 3) ─────────────────────── */
  useEffect(() => {
    if (!isActive || step.id !== 'bodyscan') return;
    const elapsed = STEPS[2].duration - timeLeft;
    const interval = STEPS[2].duration / BODY_SCAN_PARTS.length; // 20s each
    const idx = Math.min(Math.floor(elapsed / interval), BODY_SCAN_PARTS.length - 1);
    setScanPartIndex(idx);
  }, [isActive, timeLeft, step.id]);

  /* ── Save session ────────────────────────────────────── */
  const saveSession = async () => {
    try {
      await api.saveSession({
        activity_type: activity.type,
        duration_seconds: activity.duration,
        completed: true,
      });
    } catch { /* offline – fine */ }
  };

  /* ── Start / Continue ────────────────────────────────── */
  const handleStart = () => {
    if (phase === 'done') {
      onComplete();
      return;
    }
    setPhase('running');
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  /* ── Format seconds ──────────────────────────────────── */
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ── Render per-step content ─────────────────────────── */
  const renderStepContent = () => {
    if (step.id === 'dnd') {
      return (
        <div className="animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px', animation: 'sleepFloat 3s ease-in-out infinite' }}>🔕</div>
          <div style={SLEEP_THEME.instruction}>{t('sleep_step1_instruction')}</div>
        </div>
      );
    }

    if (step.id === 'breathing') {
      const isIn = breathPhase === 'in';
      const circleScale = isIn ? 1.4 : 1;
      return (
        <div className="breathing-circle-wrap" style={{ marginBottom: '16px' }}>
          <div
            className="breathing-circle"
            style={{
              transform: `scale(${circleScale})`,
              transitionDuration: '4s',
              background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.08) 70%)',
              border: '2px solid rgba(167,139,250,0.3)',
              width: '120px',
              height: '120px',
            }}
          >
            <div style={SLEEP_THEME.breathLabel}>
              {isIn ? t('sleep_breathe_in') : t('sleep_breathe_out')}
            </div>
          </div>
        </div>
      );
    }

    if (step.id === 'bodyscan') {
      return (
        <div
          key={scanPartIndex}
          style={{
            ...SLEEP_THEME.instruction,
            animation: 'sleepFadeSlide 0.8s ease forwards',
            fontSize: '1.25rem',
            fontStyle: 'italic',
          }}
        >
          {t(BODY_SCAN_PARTS[scanPartIndex])}
        </div>
      );
    }

    return null;
  };

  /* ══════════════════════════════════════════════════════
     JSX
     ══════════════════════════════════════════════════════ */

  /* ── Done screen ─────────────────────────────────────── */
  if (phase === 'done') {
    return (
      <div style={SLEEP_THEME.page}>
        <Stars />
        <button className="btn btn-ghost" style={SLEEP_THEME.backBtn} onClick={onComplete}>
          ← {t('back')}
        </button>

        <div className="animate-fade-in" style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={SLEEP_THEME.doneEmoji}>🌙</div>
          <div style={SLEEP_THEME.doneTitle}>{t('sleep_done_title')}</div>
          <div style={SLEEP_THEME.doneSub}>{t('sleep_done_sub')}</div>
          <button
            className="btn btn-primary btn-lg"
            style={SLEEP_THEME.primaryBtn}
            onClick={onComplete}
          >
            {t('done')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Active / Ready screen ───────────────────────────── */
  return (
    <div style={SLEEP_THEME.page}>
      <Stars />

      <button className="btn btn-ghost" style={SLEEP_THEME.backBtn} onClick={onComplete}>
        ← {t('back')}
      </button>

      <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Step badge */}
        <div style={SLEEP_THEME.stepBadge}>
          {t('sleep_step_label')} {stepIndex + 1} / {STEPS.length}
        </div>

        {/* Step title */}
        <h2 style={SLEEP_THEME.title}>{t(step.titleKey)}</h2>
        <p style={SLEEP_THEME.subtitle}>{activity.title}</p>

        {/* Progress dots */}
        <ProgressDots current={stepIndex} total={STEPS.length} />

        {/* Timer ring */}
        <TimerRing timeLeft={timeLeft} totalTime={step.duration}>
          <div style={SLEEP_THEME.timerNumber}>{fmt(timeLeft)}</div>
          <div style={SLEEP_THEME.timerLabel}>{t('sleep_remaining')}</div>
        </TimerRing>

        {/* Step-specific visual content */}
        <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isActive ? renderStepContent() : (
            <div style={SLEEP_THEME.instruction}>
              {phase === 'ready' ? t('sleep_ready_prompt') : t(step.instructionKey)}
            </div>
          )}
        </div>

        {/* Primary action button */}
        <button
          className="btn btn-primary btn-lg"
          style={{ ...SLEEP_THEME.primaryBtn, width: '200px', marginTop: '24px' }}
          onClick={isActive ? handlePause : handleStart}
        >
          {isActive ? t('breathing_pause') : (phase === 'ready' ? t('sleep_begin') : t('sleep_continue'))}
        </button>
      </div>
    </div>
  );
}

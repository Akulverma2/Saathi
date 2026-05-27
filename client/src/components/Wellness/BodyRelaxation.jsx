import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/apiClient';

const MUSCLE_GROUPS = [
  { id: 'hands',     emoji: '✊', labelKey: 'relax_hands',     instruction: 'relax_hands_instruction' },
  { id: 'arms',      emoji: '💪', labelKey: 'relax_arms',      instruction: 'relax_arms_instruction' },
  { id: 'shoulders', emoji: '🤷', labelKey: 'relax_shoulders', instruction: 'relax_shoulders_instruction' },
  { id: 'face',      emoji: '😤', labelKey: 'relax_face',      instruction: 'relax_face_instruction' },
  { id: 'chest',     emoji: '🫁', labelKey: 'relax_chest',     instruction: 'relax_chest_instruction' },
  { id: 'stomach',   emoji: '🎯', labelKey: 'relax_stomach',   instruction: 'relax_stomach_instruction' },
  { id: 'legs',      emoji: '🦵', labelKey: 'relax_legs',      instruction: 'relax_legs_instruction' },
  { id: 'feet',      emoji: '🦶', labelKey: 'relax_feet',      instruction: 'relax_feet_instruction' },
];

const TENSE_DURATION = 5;
const RELAX_DURATION = 10;

/* Fallback labels when i18n keys aren't defined yet */
const FALLBACKS = {
  relax_hands: 'Hands & Fists',
  relax_hands_instruction: 'Make tight fists with both hands',
  relax_arms: 'Arms & Biceps',
  relax_arms_instruction: 'Bend your arms and flex your biceps',
  relax_shoulders: 'Shoulders',
  relax_shoulders_instruction: 'Raise your shoulders up to your ears',
  relax_face: 'Face',
  relax_face_instruction: 'Scrunch up your face tightly',
  relax_chest: 'Chest',
  relax_chest_instruction: 'Take a deep breath and hold it',
  relax_stomach: 'Stomach',
  relax_stomach_instruction: 'Tighten your stomach muscles',
  relax_legs: 'Legs',
  relax_legs_instruction: 'Press your legs together tightly',
  relax_feet: 'Feet',
  relax_feet_instruction: 'Curl your toes downward',
  relax_tense: 'TENSE',
  relax_relax: 'RELAX',
  relax_ready_title: 'Progressive Body Relaxation',
  relax_ready_sub: 'We\'ll guide you through tensing and relaxing each muscle group. This helps release physical tension you might not even know you\'re holding.',
  relax_complete: 'Your body is now deeply relaxed ✨',
  relax_complete_sub: 'Take a moment to notice how calm your body feels.',
  relax_now_relax: 'Now slowly release… let all the tension melt away',
};

function tx(t, key) {
  const val = t(key);
  return val === key ? (FALLBACKS[key] || key) : val;
}

export default function BodyRelaxation({ activity, onComplete }) {
  const { t } = useTranslation();

  // States: ready | tense | relax | done
  const [stage, setStage] = useState('ready');
  const [groupIndex, setGroupIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);

  const currentGroup = MUSCLE_GROUPS[groupIndex] || MUSCLE_GROUPS[0];

  /* ── Timer logic ───────────────────────────────── */
  useEffect(() => {
    if (!isActive || stage === 'ready' || stage === 'done') return;

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else {
      // Phase ended – advance
      if (stage === 'tense') {
        setStage('relax');
        setTimeLeft(RELAX_DURATION);
      } else if (stage === 'relax') {
        // Move to next muscle group
        if (groupIndex >= MUSCLE_GROUPS.length - 1) {
          setIsActive(false);
          setStage('done');
          saveSession();
        } else {
          setGroupIndex(i => i + 1);
          setStage('tense');
          setTimeLeft(TENSE_DURATION);
        }
      }
    }

    return () => clearTimeout(timerRef.current);
  }, [isActive, timeLeft, stage, groupIndex]);

  /* ── API ────────────────────────────────────────── */
  const saveSession = async () => {
    try {
      await api.saveSession({
        activity_type: activity.type,
        duration_seconds: activity.duration,
        completed: true,
      });
    } catch { /* offline */ }
  };

  /* ── Controls ───────────────────────────────────── */
  const handleStart = () => {
    setStage('tense');
    setTimeLeft(TENSE_DURATION);
    setIsActive(true);
  };

  const handlePause = () => setIsActive(false);
  const handleResume = () => setIsActive(true);

  const handleDone = () => onComplete();

  /* ── Visual helpers ─────────────────────────────── */
  const isTense = stage === 'tense';
  const isRelax = stage === 'relax';
  const progress = groupIndex + 1;
  const total = MUSCLE_GROUPS.length;

  const phaseColor = isTense
    ? 'var(--color-error, #e74c3c)'
    : 'var(--color-primary-500, #14b8a6)';

  const phaseBg = isTense
    ? 'rgba(231, 76, 60, 0.10)'
    : 'rgba(20, 184, 166, 0.10)';

  const phaseGlow = isTense
    ? '0 0 40px rgba(231,76,60,0.25), 0 0 80px rgba(231,76,60,0.10)'
    : '0 0 40px rgba(20,184,166,0.25), 0 0 80px rgba(20,184,166,0.10)';

  const circleScale = isTense ? 1.25 : isRelax ? 1 : 1;

  /* Progress bar percentage */
  const progressPct = (() => {
    const groupProgress = groupIndex / total;
    if (stage === 'tense') {
      return (groupProgress + ((TENSE_DURATION - timeLeft) / TENSE_DURATION) * (0.5 / total)) * 100;
    }
    if (stage === 'relax') {
      return (groupProgress + 0.5 / total + ((RELAX_DURATION - timeLeft) / RELAX_DURATION) * (0.5 / total)) * 100;
    }
    if (stage === 'done') return 100;
    return 0;
  })();

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="breathing-view" style={{ position: 'relative' }}>
      {/* Back button */}
      <button
        className="btn btn-ghost"
        style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}
        onClick={onComplete}
      >
        ← {t('back')}
      </button>

      {/* Title */}
      <h2 className="mb-2">{activity.title}</h2>

      {/* Progress indicator */}
      {stage !== 'ready' && stage !== 'done' && (
        <p className="text-muted" style={{ margin: 0 }}>
          {progress} / {total}
        </p>
      )}

      {/* Progress bar */}
      {stage !== 'ready' && (
        <div
          style={{
            width: '220px',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--color-surface-200, #e2e8f0)',
            margin: '8px auto 0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              borderRadius: '2px',
              background: stage === 'done' ? 'var(--color-primary-500, #14b8a6)' : phaseColor,
              transition: 'width 1s linear, background 0.6s ease',
            }}
          />
        </div>
      )}

      {/* ── Central visual ── */}
      <div className="breathing-circle-wrap" style={{ marginTop: '24px' }}>
        {/* Pulsing rings during active phases */}
        {isActive && (isTense || isRelax) && (
          <>
            <div className="breathing-ring" style={{ borderColor: phaseColor, opacity: 0.15 }} />
            <div className="breathing-ring" style={{ borderColor: phaseColor, opacity: 0.10 }} />
            <div className="breathing-ring" style={{ borderColor: phaseColor, opacity: 0.06 }} />
          </>
        )}

        <div
          className="breathing-circle"
          style={{
            transform: `scale(${circleScale})`,
            transitionDuration: isTense ? `${TENSE_DURATION}s` : isRelax ? '1.5s' : '0.5s',
            background: stage === 'done'
              ? 'linear-gradient(135deg, var(--color-primary-100, #ccfbf1), var(--color-primary-200, #99f6e4))'
              : (isTense || isRelax) ? phaseBg : undefined,
            boxShadow: (isTense || isRelax) ? phaseGlow : undefined,
            border: (isTense || isRelax) ? `2px solid ${phaseColor}` : undefined,
          }}
        >
          {stage === 'ready' && (
            <div style={{ fontSize: '2.5rem' }}>{activity.icon}</div>
          )}

          {(isTense || isRelax) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>{currentGroup.emoji}</div>
              <div
                className="breathing-counter"
                style={{ color: phaseColor, fontSize: '1.5rem', fontWeight: 700 }}
              >
                {timeLeft}
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>✨</div>
          )}
        </div>
      </div>

      {/* ── Phase label & instruction ── */}
      <div style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
        {stage === 'ready' && (
          <div className="animate-fade-in" style={{ maxWidth: '360px', margin: '0 auto' }}>
            <div className="breathing-phase" style={{ fontSize: '1rem', marginBottom: '6px' }}>
              {tx(t, 'relax_ready_title')}
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
              {tx(t, 'relax_ready_sub')}
            </div>
          </div>
        )}

        {isTense && (
          <div className="animate-fade-in" key={`tense-${groupIndex}`}>
            <div
              className="breathing-phase"
              style={{
                color: phaseColor,
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              {tx(t, 'relax_tense')} — {tx(t, currentGroup.labelKey)}
            </div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
              {tx(t, currentGroup.instruction)}
            </div>
          </div>
        )}

        {isRelax && (
          <div className="animate-fade-in" key={`relax-${groupIndex}`}>
            <div
              className="breathing-phase"
              style={{
                color: phaseColor,
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              {tx(t, 'relax_relax')} — {tx(t, currentGroup.labelKey)}
            </div>
            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
              {tx(t, 'relax_now_relax')}
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="animate-bounce-in">
            <div className="breathing-phase" style={{ color: 'var(--color-primary-600)', marginBottom: '6px' }}>
              {tx(t, 'relax_complete')}
            </div>
            <div className="text-muted" style={{ fontSize: '0.85rem' }}>
              {tx(t, 'relax_complete_sub')}
            </div>
          </div>
        )}
      </div>

      {/* ── Action button ── */}
      <button
        className="btn btn-primary btn-lg mt-8"
        style={{ width: '200px' }}
        onClick={
          stage === 'ready'
            ? handleStart
            : stage === 'done'
              ? handleDone
              : isActive
                ? handlePause
                : handleResume
        }
      >
        {stage === 'ready'
          ? t('breathing_start')
          : stage === 'done'
            ? t('done')
            : isActive
              ? t('breathing_pause')
              : t('breathing_start')}
      </button>
    </div>
  );
}

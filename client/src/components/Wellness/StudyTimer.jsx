import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/apiClient';

const DEFAULT_DURATION = 1500; // 25 minutes in seconds

export default function StudyTimer({ activity, onComplete }) {
  const { t } = useTranslation();
  const totalSeconds = activity?.duration || DEFAULT_DURATION;

  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready | running | paused | done
  const timerRef = useRef(null);

  // ── Countdown logic ───────────────────────────
  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else {
      // Timer reached zero
      setIsRunning(false);
      setPhase('done');
      saveSession();
    }

    return () => clearTimeout(timerRef.current);
  }, [isRunning, timeLeft]);

  // ── Helpers ───────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = 1 - timeLeft / totalSeconds; // 0 → 1
  const progressDeg = progress * 360;

  const saveSession = async () => {
    try {
      await api.saveSession({
        activity_type: activity.type,
        duration_seconds: totalSeconds,
        completed: true,
      });
    } catch { /* offline-safe */ }
  };

  // ── Controls ──────────────────────────────────
  const handleStartPause = () => {
    if (phase === 'done') {
      onComplete();
      return;
    }
    if (isRunning) {
      setIsRunning(false);
      setPhase('paused');
    } else {
      setIsRunning(true);
      setPhase('running');
    }
  };

  const handleReset = () => {
    clearTimeout(timerRef.current);
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setPhase('ready');
  };

  // ── Motivational messages while studying ──────
  const getMotivation = () => {
    if (phase === 'ready') return t('study_timer_ready', 'Press start when you\'re ready to focus ✨');
    if (phase === 'paused') return t('study_timer_paused', 'Paused — take a breath, then keep going 💪');
    if (progress < 0.25) return t('study_timer_start_msg', 'You\'ve got this! Stay focused 🚀');
    if (progress < 0.5) return t('study_timer_quarter_msg', 'Great momentum! Keep it up 🔥');
    if (progress < 0.75) return t('study_timer_half_msg', 'Halfway there — you\'re doing amazing! ⚡');
    return t('study_timer_almost_msg', 'Almost done — finish strong! 🏁');
  };

  // ── Progress ring style (conic-gradient) ──────
  const ringStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: `conic-gradient(
      var(--color-primary-400) ${progressDeg}deg,
      var(--color-neutral-100) ${progressDeg}deg 360deg
    )`,
    opacity: 0.25,
    transition: 'background 0.4s ease',
  };

  const innerCircleStyle = {
    width: '140px',
    height: '140px',
    borderRadius: '50%',
    background: phase === 'done'
      ? 'linear-gradient(135deg, var(--color-secondary-400), var(--color-primary-400))'
      : 'linear-gradient(135deg, var(--color-primary-400), var(--color-secondary-400))',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 600,
    boxShadow: 'var(--shadow-glow)',
    zIndex: 1,
    transition: 'transform 0.6s ease, background 0.6s ease',
    transform: isRunning ? 'scale(1.05)' : 'scale(1)',
  };

  return (
    <div className="breathing-view">
      {/* ── Back button ─────────────────────────── */}
      <button
        className="btn btn-ghost"
        style={{ position: 'absolute', top: '16px', left: '16px' }}
        onClick={onComplete}
      >
        ← {t('back')}
      </button>

      {/* ── Title ────────────────────────────────── */}
      <h2 className="mb-2">{activity.title}</h2>
      {phase !== 'done' && (
        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
          {t('study_timer_subtitle', '25-minute Pomodoro session')}
        </p>
      )}

      {/* ── Circle with progress ring ────────────── */}
      <div className="breathing-circle-wrap">
        {/* Conic-gradient progress ring */}
        <div style={ringStyle} />

        {/* Subtle animated ripple rings when running */}
        {isRunning && (
          <>
            <div className="breathing-ring" />
            <div className="breathing-ring" />
            <div className="breathing-ring" />
          </>
        )}

        {/* Center circle with timer */}
        <div className="breathing-circle" style={innerCircleStyle}>
          {phase === 'done' ? (
            <div style={{ fontSize: '2.5rem' }}>🎉</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
                {formatTime(timeLeft)}
              </div>
              <div style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {isRunning ? t('study_timer_focusing', 'focusing') : t('study_timer_label', 'focus')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Message area ─────────────────────────── */}
      <div style={{ height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {phase === 'done' ? (
          <div className="animate-bounce-in">
            <div className="breathing-phase" style={{ color: 'var(--color-primary-600)' }}>
              {t('study_timer_complete', 'Great focus session!')}
            </div>
            <div className="breathing-instruction">
              {t('study_timer_break', 'Time for a 5 minute break 🎉')}
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <div className="breathing-instruction">{getMotivation()}</div>
          </div>
        )}
      </div>

      {/* ── Progress bar (thin) ──────────────────── */}
      {phase !== 'done' && (
        <div style={{
          width: '200px',
          height: '4px',
          borderRadius: '2px',
          background: 'var(--color-neutral-100)',
          marginBottom: 'var(--space-4)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, var(--color-primary-400), var(--color-secondary-400))',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}

      {/* ── Buttons ──────────────────────────────── */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        {phase !== 'done' && phase !== 'ready' && (
          <button
            className="btn btn-secondary"
            style={{ width: '100px' }}
            onClick={handleReset}
          >
            {t('study_timer_reset', 'Reset')}
          </button>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '200px' }}
          onClick={handleStartPause}
        >
          {phase === 'done'
            ? t('done')
            : isRunning
              ? t('study_timer_pause', 'Pause')
              : t('study_timer_start', 'Start')}
        </button>
      </div>
    </div>
  );
}

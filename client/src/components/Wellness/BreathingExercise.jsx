import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/apiClient';

export default function BreathingExercise({ activity, onComplete }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('ready'); // ready, inhale, hold, exhale, done
  const [timeLeft, setTimeLeft] = useState(0);
  const [round, setRound] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const totalRounds = 4;
  
  const timerRef = useRef(null);

  const phases = {
    inhale: { time: 4, next: 'hold', label: 'breathing_inhale' },
    hold: { time: 7, next: 'exhale', label: 'breathing_hold' },
    exhale: { time: 8, next: 'inhale', label: 'breathing_exhale' }
  };

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else {
      if (phase === 'exhale') {
        if (round >= totalRounds) {
          setIsActive(false);
          setPhase('done');
          saveSession();
          return;
        }
        setRound(r => r + 1);
      }
      
      const nextPhase = phase === 'ready' ? 'inhale' : phases[phase].next;
      setPhase(nextPhase);
      setTimeLeft(phases[nextPhase].time);
    }

    return () => clearTimeout(timerRef.current);
  }, [isActive, timeLeft, phase, round]);

  const saveSession = async () => {
    try {
      await api.saveSession({ activity_type: activity.type, duration_seconds: activity.duration, completed: true });
    } catch { /* offline */ }
  };

  const toggleTimer = () => {
    if (phase === 'done') {
      onComplete();
      return;
    }
    setIsActive(!isActive);
  };

  const getCircleScale = () => {
    if (!isActive) return 1;
    if (phase === 'inhale') return 1.5;
    if (phase === 'hold') return 1.5;
    if (phase === 'exhale') return 1;
    return 1;
  };

  return (
    <div className="breathing-view">
      <button className="btn btn-ghost" style={{ position: 'absolute', top: '16px', left: '16px' }} onClick={onComplete}>
        ← {t('back')}
      </button>
      
      <h2 className="mb-2">{activity.title}</h2>
      {phase !== 'done' && <p className="text-muted">{t('breathing_rounds')}: {round}/{totalRounds}</p>}

      <div className="breathing-circle-wrap">
        {isActive && (
          <>
            <div className="breathing-ring" />
            <div className="breathing-ring" />
            <div className="breathing-ring" />
          </>
        )}
        <div 
          className="breathing-circle"
          style={{ transform: `scale(${getCircleScale()})`, transitionDuration: phase === 'inhale' ? '4s' : phase === 'exhale' ? '8s' : '0.5s' }}
        >
          {isActive ? (
            <div className="breathing-counter">{timeLeft}</div>
          ) : (
            <div style={{ fontSize: '2.5rem' }}>{activity.icon}</div>
          )}
        </div>
      </div>

      <div style={{ height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {phase === 'done' ? (
          <div className="animate-bounce-in">
            <div className="breathing-phase" style={{ color: 'var(--color-primary-600)' }}>{t('breathing_complete')}</div>
            <div className="breathing-instruction">{t('breathing_complete_sub')}</div>
          </div>
        ) : isActive ? (
          <div className="animate-fade-in">
            <div className="breathing-phase">{phase !== 'ready' && phases[phase] ? t(phases[phase].label) : ''}</div>
          </div>
        ) : (
          <div className="breathing-instruction">Press start when you're ready</div>
        )}
      </div>

      <button className="btn btn-primary btn-lg mt-8" style={{ width: '200px' }} onClick={toggleTimer}>
        {phase === 'done' ? t('done') : isActive ? t('breathing_pause') : t('breathing_start')}
      </button>
    </div>
  );
}

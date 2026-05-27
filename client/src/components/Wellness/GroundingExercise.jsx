import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/apiClient';

const STEPS = [
  { count: 5, sense: 'SEE',   emoji: '👀', translationKey: 'grounding_5', color: '#6C63FF' },
  { count: 4, sense: 'TOUCH', emoji: '✋', translationKey: 'grounding_4', color: '#38B2AC' },
  { count: 3, sense: 'HEAR',  emoji: '👂', translationKey: 'grounding_3', color: '#E86F68' },
  { count: 2, sense: 'SMELL', emoji: '👃', translationKey: 'grounding_2', color: '#D69E2E' },
  { count: 1, sense: 'TASTE', emoji: '👅', translationKey: 'grounding_1', color: '#ED64A6' },
];

export default function GroundingExercise({ activity, onComplete }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [inputs, setInputs] = useState(
    STEPS.map(step => Array(step.count).fill(''))
  );
  const [phase, setPhase] = useState('active'); // active | done

  const step = STEPS[currentStep];

  const handleInputChange = (index, value) => {
    setInputs(prev => {
      const updated = prev.map(arr => [...arr]);
      updated[currentStep][index] = value;
      return updated;
    });
  };

  const canProceed = inputs[currentStep]?.every(v => v.trim().length > 0);

  const handleNext = () => {
    if (!canProceed) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setPhase('done');
      saveSession();
    }
  };

  const saveSession = async () => {
    try {
      await api.saveSession({
        activity_type: activity.type,
        duration_seconds: activity.duration,
        completed: true,
        responses: inputs,
      });
    } catch { /* offline */ }
  };

  /* ── Completion screen ── */
  if (phase === 'done') {
    return (
      <div className="breathing-view">
        <div className="animate-bounce-in" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)',
        }}>
          <div style={{ fontSize: '4rem' }}>🌟</div>
          <h2 style={{ color: 'var(--color-primary-600)', margin: 0 }}>{t('grounding_title')}</h2>
          <p className="text-muted" style={{
            maxWidth: '340px', textAlign: 'center', lineHeight: 1.6,
          }}>
            You noticed <strong>15 things</strong> around you — your mind is right here, right now. Well done! 💛
          </p>

          {/* Mini summary */}
          <div style={{
            display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                background: `${s.color}18`, borderRadius: '12px',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: '0.85rem', color: s.color, fontWeight: 600,
              }}>
                {s.emoji} {s.count}
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg mt-8"
            style={{ width: '200px' }}
            onClick={onComplete}
          >
            {t('done')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Active exercise ── */
  return (
    <div className="breathing-view" style={{ justifyContent: 'flex-start', paddingTop: 'var(--space-4)' }}>
      {/* Back button */}
      <button
        className="btn btn-ghost"
        style={{ position: 'absolute', top: '16px', left: '16px' }}
        onClick={onComplete}
      >
        ← {t('back')}
      </button>

      {/* Progress bar */}
      <div style={{
        width: '100%', maxWidth: '360px', marginTop: 'var(--space-8)',
        marginBottom: 'var(--space-2)',
      }}>
        <p className="text-muted" style={{
          textAlign: 'center', fontSize: '0.85rem', marginBottom: 'var(--space-2)',
        }}>
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <div style={{
          height: '6px', borderRadius: '3px',
          background: 'var(--color-primary-100, #e2e8f0)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${((currentStep + 1) / STEPS.length) * 100}%`,
            background: step.color,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Main card */}
      <div
        key={currentStep}
        className="animate-fade-in"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-4)', width: '100%', maxWidth: '400px',
          padding: 'var(--space-6)', marginTop: 'var(--space-2)',
        }}
      >
        {/* Big emoji + number badge */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
          <div style={{
            fontSize: '4.5rem', lineHeight: 1,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
          }}>
            {step.emoji}
          </div>
          <div style={{
            position: 'absolute', top: '-8px', right: '-16px',
            width: '36px', height: '36px', borderRadius: '50%',
            background: step.color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.1rem',
            boxShadow: `0 2px 8px ${step.color}66`,
          }}>
            {step.count}
          </div>
        </div>

        {/* Prompt text */}
        <h2 style={{
          margin: 0, fontSize: '1.35rem', textAlign: 'center',
          color: step.color, fontWeight: 700,
        }}>
          {t(step.translationKey)}
        </h2>

        {/* Input fields */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 'var(--space-3)', width: '100%',
          marginTop: 'var(--space-2)',
        }}>
          {inputs[currentStep].map((val, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: val.trim() ? step.color : `${step.color}22`,
                color: val.trim() ? '#fff' : step.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 600, flexShrink: 0,
                transition: 'all 0.3s ease',
              }}>
                {i + 1}
              </div>
              <input
                type="text"
                value={val}
                onChange={e => handleInputChange(i, e.target.value)}
                placeholder={`${step.sense.toLowerCase()} #${i + 1}...`}
                autoFocus={i === 0}
                style={{
                  flex: 1, padding: 'var(--space-3) var(--space-4)',
                  borderRadius: '12px',
                  border: `2px solid ${val.trim() ? step.color : '#e2e8f0'}`,
                  outline: 'none', fontSize: '1rem',
                  transition: 'border-color 0.3s ease',
                  background: val.trim() ? `${step.color}08` : 'transparent',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    // Focus next input or trigger next step
                    if (i < inputs[currentStep].length - 1) {
                      const nextInput = e.target.parentElement.nextElementSibling?.querySelector('input');
                      nextInput?.focus();
                    } else if (canProceed) {
                      handleNext();
                    }
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Next button */}
        <button
          className={`btn btn-lg mt-8 ${canProceed ? 'btn-primary' : ''}`}
          disabled={!canProceed}
          onClick={handleNext}
          style={{
            width: '200px',
            background: canProceed ? step.color : undefined,
            borderColor: canProceed ? step.color : undefined,
            opacity: canProceed ? 1 : 0.45,
            transition: 'all 0.3s ease',
            boxShadow: canProceed ? `0 4px 14px ${step.color}44` : 'none',
          }}
        >
          {currentStep < STEPS.length - 1 ? 'Next →' : t('done') + ' ✨'}
        </button>
      </div>
    </div>
  );
}

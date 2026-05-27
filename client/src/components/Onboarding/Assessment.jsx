import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/apiClient';

export default function Assessment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePreferences, user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [selectedMood, setSelectedMood] = useState(3); // Default to 3 (Okay)
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [voicePref, setVoicePref] = useState(false);
  const [saving, setSaving] = useState(false);

  // Prefill the nickname field when user loads
  useEffect(() => {
    if (user) {
      setNickname(user.nickname || user.username || '');
    }
  }, [user]);

  const moodOptions = [
    { score: 1, label: t('mood_1') || 'Very sad', emoji: '😭', color: 'rgba(229, 115, 115, 0.18)', borderColor: 'var(--mood-1)' },
    { score: 2, label: t('mood_2') || 'Sad', emoji: '😢', color: 'rgba(255, 183, 77, 0.18)', borderColor: 'var(--mood-2)' },
    { score: 3, label: t('mood_3') || 'Okay', emoji: '😐', color: 'rgba(255, 241, 118, 0.18)', borderColor: 'var(--mood-3)' },
    { score: 4, label: t('mood_4') || 'Good', emoji: '🙂', color: 'rgba(129, 199, 132, 0.18)', borderColor: 'var(--mood-4)' },
    { score: 5, label: t('mood_5') || 'Great', emoji: '😁', color: 'rgba(77, 208, 225, 0.18)', borderColor: 'var(--mood-5)' },
  ];

  const goalOptions = [
    { id: 'school', label: t('mood_tag_school') || 'School', emoji: '🏫' },
    { id: 'exams', label: t('mood_tag_exams') || 'Exams', emoji: '📝' },
    { id: 'family', label: t('mood_tag_family') || 'Family', emoji: '🏡' },
    { id: 'friends', label: t('mood_tag_friends') || 'Friends', emoji: '👥' },
    { id: 'sleep', label: t('mood_tag_sleep') || 'Sleep', emoji: '😴' },
    { id: 'health', label: t('mood_tag_health') || 'Health', emoji: '🩺' },
    { id: 'loneliness', label: t('mood_tag_loneliness') || 'Loneliness', emoji: '🌧️' },
    { id: 'stress', label: t('quick_anxious') || 'Stress/Anxiety', emoji: '😰' },
  ];

  const handleGoalToggle = (goalId) => {
    if (selectedGoals.includes(goalId)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goalId));
    } else {
      setSelectedGoals([...selectedGoals, goalId]);
    }
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const finalName = user?.nickname || user?.username || 'Friend';
      
      // 1. Update general preferences
      await updatePreferences({
        nickname: finalName,
        voice_preference: voicePref
      });

      // 2. Automatically log the first mood check-in to give them an instant dashboard state
      try {
        await api.checkIn({
          mood_score: selectedMood,
          note: 'Logged during initial setup wizard.',
          tags: selectedGoals.join(',')
        });
      } catch (checkInErr) {
        console.error('Failed to log first onboarding check-in:', checkInErr);
      }

      navigate('/chat');
    } catch (err) {
      console.error('Failed to complete onboarding wizard:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding-page" style={{ 
      background: 'var(--surface-bg)',
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 'calc(var(--space-6) + 12px) var(--space-4) var(--space-6)',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      {/* Step Dots Indicators */}
      <div className="step-indicator" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`step-dot ${step >= s ? 'done' : ''} ${step === s ? 'active' : ''}`} />
        ))}
      </div>

      {/* Main wizard content */}
      <div className="onboarding-content" style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        margin: 'var(--space-4) 0',
        width: '100%'
      }}>
        {/* Step 1: How are you feeling today? */}
        {step === 1 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '340px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '700' }}>{t('onboarding_step1_title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>{t('onboarding_step1_sub')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {moodOptions.map((opt) => (
                <button
                  key={opt.score}
                  className={`card ${selectedMood === opt.score ? 'selected' : ''}`}
                  onClick={() => setSelectedMood(opt.score)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: selectedMood === opt.score ? opt.color : 'rgba(255, 255, 255, 0.05)',
                    border: selectedMood === opt.score ? `2px solid ${opt.borderColor}` : '1.5px solid rgba(255, 255, 255, 0.1)',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    transform: selectedMood === opt.score ? 'scale(1.02)' : 'none',
                    outline: 'none'
                  }}
                >
                  <span style={{ fontSize: '1.6rem' }}>{opt.emoji}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem' }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: What brings you here? */}
        {step === 2 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '340px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '700' }}>{t('onboarding_step2_title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>{t('onboarding_step2_sub')}</p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              width: '100%'
            }}>
              {goalOptions.map((opt) => {
                const isSelected = selectedGoals.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    className={`card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleGoalToggle(opt.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '14px 8px',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(79, 139, 122, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '2px solid var(--color-primary-400)' : '1.5px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.2s',
                      transform: isSelected ? 'scale(1.03)' : 'none',
                      outline: 'none'
                    }}
                  >
                    <span style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{opt.emoji}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.82rem', textAlign: 'center' }}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: How would you like to talk? */}
        {step === 3 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '340px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: '700' }}>{t('onboarding_step3_title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>{t('onboarding_step3_sub')}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              <button 
                className={`card ${!voicePref ? 'selected' : ''}`} 
                onClick={() => setVoicePref(false)}
                style={{ 
                  cursor: 'pointer', 
                  border: !voicePref ? '2px solid var(--color-primary-500)' : '1.5px solid rgba(255,255,255,0.1)',
                  background: !voicePref ? 'rgba(79, 139, 122, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '20px',
                  borderRadius: '16px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  transform: !voicePref ? 'scale(1.02)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '2.2rem' }}>⌨️</div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', margin: 0 }}>{t('prefer_text')}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type naturally at your own pace.</p>
                </div>
              </button>
              <button 
                className={`card ${voicePref ? 'selected' : ''}`} 
                onClick={() => setVoicePref(true)}
                style={{ 
                  cursor: 'pointer', 
                  border: voicePref ? '2px solid var(--color-primary-500)' : '1.5px solid rgba(255,255,255,0.1)',
                  background: voicePref ? 'rgba(79, 139, 122, 0.25)' : 'rgba(255,255,255,0.05)',
                  padding: '20px',
                  borderRadius: '16px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  transform: voicePref ? 'scale(1.02)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '2.2rem' }}>🎙️</div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: '600', margin: 0 }}>{t('prefer_voice')}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Speak out loud, and have Saathi read aloud.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="animate-bounce-in" style={{ textAlign: 'center', maxWidth: '340px', margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '16px', display: 'inline-block' }}>🌿</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 'bold', fontSize: '1.75rem' }}>{t('all_set')}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.95rem' }}>{t('all_set_sub')}</p>
          </div>
        )}
      </div>

      {/* Button Actions Footer */}
      <div className="onboarding-actions" style={{ 
        display: 'flex', 
        gap: '12px', 
        width: '100%', 
        maxWidth: '340px', 
        margin: '0 auto',
        paddingTop: 'var(--space-2)'
      }}>
        {step > 1 && (
          <button 
            className="btn" 
            onClick={prevStep}
            disabled={saving}
            style={{ 
              flex: 1, 
              borderRadius: '24px', 
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1.5px solid rgba(255, 255, 255, 0.15)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              outline: 'none',
              padding: '14px'
            }}
          >
            ← {t('back')}
          </button>
        )}
        <button 
          className="btn btn-primary" 
          onClick={nextStep}
          disabled={saving}
          style={{ 
            flex: 2, 
            borderRadius: '24px',
            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
            boxShadow: 'var(--shadow-glow)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: '700',
            outline: 'none',
            padding: '14px'
          }}
        >
          {saving ? t('loading') : step === 4 ? t('start_chatting') : t('continue')}
        </button>
      </div>
    </div>
  );
}

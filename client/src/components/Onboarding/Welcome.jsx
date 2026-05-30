import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export default function Welcome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { startGuestSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const languages = [
    { code: 'en', label: 'English', letter: 'A' },
    { code: 'hi', label: 'हिंदी', letter: 'अ' },
    { code: 'bn', label: 'বাংলা', letter: 'অ' },
    { code: 'te', label: 'తెలుగు', letter: 'అ' },
    { code: 'ta', label: 'தமிழ்', letter: 'அ' },
    { code: 'mr', label: 'मराठी', letter: 'अ' },
    { code: 'kn', label: 'ಕನ್ನಡ', letter: 'ಅ' },
    { code: 'gu', label: 'ગુજરાતી', letter: 'અ' },
    { code: 'ur', label: 'اردو', letter: 'ا' }
  ];

  const setLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('saathi_lang', lang);
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await startGuestSession({ language: i18n.language });
      navigate('/onboarding');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page" style={{ 
      position: 'relative', 
      overflowY: 'auto', 
      height: '100dvh', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between', 
      padding: 'calc(var(--space-6) + 12px) var(--space-4) var(--space-6)',
      boxSizing: 'border-box'
    }}>
      {step === 1 ? (
        // Step 1: High-Impact Language Selector Grid
        <>
          <div className="onboarding-logo" style={{ marginBottom: '0' }}>
            <div className="onboarding-logo-icon" style={{ fontSize: '2.8rem', padding: '10px', animation: 'bounceIn 0.8s ease' }}>🌿</div>
            <h1 className="logo-text" style={{ fontSize: '2.8rem', margin: '8px 0 2px', fontWeight: 'bold' }}>Saathi</h1>
            <p className="onboarding-subtitle" style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.75)', opacity: 0.9, maxWidth: '280px', margin: '0 auto' }}>
              {t('choose_language')}
            </p>
          </div>

          <div style={{
            width: '100%',
            maxWidth: '340px',
            margin: '0 auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 'var(--space-6)'
          }}>
            {/* The Grid */}
            <div className="lang-grid-3x3" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-2)',
              width: '100%'
            }}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-btn ${i18n.language === lang.code ? 'selected' : ''}`}
                  onClick={() => setLanguage(lang.code)}
                  style={{
                    padding: 'var(--space-3) var(--space-1)',
                    borderRadius: '16px',
                    background: i18n.language === lang.code ? 'rgba(79, 139, 122, 0.35)' : 'rgba(255, 255, 255, 0.05)',
                    border: i18n.language === lang.code ? '2.5px solid var(--color-primary-400)' : '1.5px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: i18n.language === lang.code ? '0 0 15px rgba(79, 139, 122, 0.3)' : 'none',
                    transform: i18n.language === lang.code ? 'scale(1.04)' : 'none',
                    outline: 'none'
                  }}
                >
                  <span style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '2px', fontFamily: 'var(--font-sans)' }}>{lang.letter}</span>
                  <span className="lang-name" style={{ fontSize: '0.72rem', fontWeight: '600', opacity: 0.95, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{lang.label}</span>
                </button>
              ))}
            </div>

            {/* The Button */}
            <div style={{ width: '100%' }}>
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={() => setStep(2)}
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                  borderRadius: '24px',
                  padding: '14px 28px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-glow)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  width: '100%',
                  outline: 'none'
                }}
              >
                {t('continue')} ➔
              </button>
            </div>
          </div>
        </>
      ) : (
        // Step 2: High-Impact Startup Authentication Landing Page
        <>
          {/* Circular Back button */}
          <button
            onClick={() => setStep(1)}
            style={{
              position: 'absolute',
              top: '18px',
              left: '18px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(120, 120, 120, 0.15)',
              border: '1.5px solid var(--color-neutral-300)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '1.2rem',
              backdropFilter: 'blur(10px)',
              outline: 'none',
              zIndex: 10
            }}
            title="Change Language"
          >
            ←
          </button>

          <div className="onboarding-logo" style={{ marginTop: 'var(--space-6)', marginBottom: '0' }}>
            <div className="onboarding-logo-icon" style={{ fontSize: '3rem', padding: '12px', animation: 'bounceIn 0.8s ease' }}>🌿</div>
            <h1 className="logo-text" style={{ fontSize: '3.4rem', margin: '12px 0 8px', fontWeight: 'bold' }}>Saathi</h1>
            <p className="onboarding-subtitle" style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.8)', maxWidth: '320px', margin: '0 auto', lineHeight: '1.5' }}>
              {t('welcome_sub')}
            </p>
          </div>

          <div className="onboarding-content" style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', flex: 1, margin: 'var(--space-4) 0', width: '100%' }}>
            {/* Curated callout/visual elements to represent Hackathon high-quality brand */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1.5px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              padding: '20px 18px',
              textAlign: 'center',
              maxWidth: '340px',
              width: '100%',
              backdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)'
            }}>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', animation: 'pulse 2.5s infinite' }}>🧘‍♀️</span>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.72)', lineHeight: '1.45', fontWeight: '500' }}>
                Your private workspace is protected with local encryption. Create an account to log timelines securely.
              </p>
            </div>
          </div>

          <div className="onboarding-actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '340px', margin: '0 auto', paddingTop: 0 }}>
            {/* Primary Action: Sign Up (Register New User) */}
            <button
              className="btn btn-primary btn-lg btn-full animate-pulse-glow"
              onClick={() => navigate('/signup')}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
                borderRadius: '24px',
                padding: '14px',
                fontWeight: '700',
                fontSize: '1rem',
                boxShadow: 'var(--shadow-glow)',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🚀 {t('sign_up')}
            </button>

            {/* Secondary Action: Sign In */}
            <button
              className="btn btn-full"
              onClick={() => navigate('/signin')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '24px',
                padding: '13px',
                fontWeight: '600',
                fontSize: '0.95rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.25s',
                outline: 'none'
              }}
            >
              🔑 {t('sign_in')}
            </button>

            {/* Tertiary / Skip Action: Guest Mode */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                className="btn-ghost"
                onClick={handleStart}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: '0.85rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: '500',
                  padding: '4px',
                  outline: 'none'
                }}
              >
                {loading ? t('loading') : t('start_guest') || 'Skip & Explore as Guest'} ➔
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/apiClient';
import { v4 as uuidv4 } from 'uuid';
import OfflineIndicator from './OfflineIndicator';
import { saveMood } from '../../services/db';

export default function AppShell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [showWarning, setShowWarning] = useState(false);

  const [showDailyPopup, setShowDailyPopup] = useState(false);
  const [dailyMoodStep, setDailyMoodStep] = useState('select'); // 'select' | 'good' | 'bad'
  const [dailyMoodNote, setDailyMoodNote] = useState('');
  const [isSavingDailyMood, setIsSavingDailyMood] = useState(false);

  useEffect(() => {
    if (user) {
      const today = new Date().toLocaleDateString('en-CA');
      const lastPopupDate = localStorage.getItem('saathi_last_daily_popup');
      
      if (!lastPopupDate) {
        // Initial setup for new users to prevent immediate popup on Day 1
        localStorage.setItem('saathi_last_daily_popup', today);
      } else if (lastPopupDate !== today) {
        setShowDailyPopup(true);
      }
    }
  }, [user]);

  const handleSaveDailyMood = async (score, note = '', talkToBot = false) => {
    if (!user) return;
    setIsSavingDailyMood(true);
    
    const today = new Date().toLocaleDateString('en-CA');
    const entry = {
      id: uuidv4(),
      mood_score: score,
      note: note || (score === 5 ? 'Daily Check-in: Good' : 'Daily Check-in: Bad'),
      tags: score === 5 ? ['good', 'peaceful', 'joy'] : ['bad'],
      created_at: new Date().toISOString()
    };
    
    try {
      await saveMood(entry);
      try {
        await api.checkIn(entry);
      } catch (err) {
        console.warn('Sync failed (offline):', err);
      }
      localStorage.setItem('saathi_last_daily_popup', today);
      setShowDailyPopup(false);
      setDailyMoodStep('select');
      setDailyMoodNote('');
      
      if (talkToBot) {
        navigate('/chat');
      }
    } catch (error) {
      console.error('Failed to save daily mood check-in:', error);
    } finally {
      setIsSavingDailyMood(false);
    }
  };

  useEffect(() => {
    if (user && (user.isGuest || !user.username)) {
      const count = parseInt(localStorage.getItem('saathi_guest_sessions') || '1');
      const dismissed = localStorage.getItem('saathi_guest_warning_dismissed') === 'true';
      
      if (!sessionStorage.getItem('saathi_session_registered')) {
        const newCount = count + 1;
        localStorage.setItem('saathi_guest_sessions', newCount.toString());
        sessionStorage.setItem('saathi_session_registered', 'true');
        if (newCount >= 2 && !dismissed) {
          setShowWarning(true);
        }
      } else if (count >= 2 && !dismissed) {
        setShowWarning(true);
      }
    } else {
      setShowWarning(false);
    }
  }, [user]);

  const dismissWarning = () => {
    localStorage.setItem('saathi_guest_warning_dismissed', 'true');
    setShowWarning(false);
  };

  if (!user) return <Outlet />; // Don't show shell on onboarding

  return (
    <div className="app-shell">
      {showWarning && (
        <div className="guest-warning-banner" style={{
          background: 'linear-gradient(135deg, #b45309, #d97706)',
          color: 'white',
          padding: '10px 16px',
          fontSize: '0.85rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>Your data is stored on this device only. Create an account to keep it safe.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => navigate('/signup')}
              style={{
                background: 'white',
                color: '#b45309',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                transition: 'transform 0.15s'
              }}
            >
              🔒 Secure My History
            </button>
            <button 
              onClick={dismissWarning}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Dismiss warning"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <header className="app-header">
        <NavLink to="/" className="app-logo">
          <span className="app-logo-icon">🌿</span>
          <span className="logo-text">{t('app_name')}</span>
        </NavLink>
        <NavLink to="/profile" style={{ 
          display: 'flex', alignItems: 'center', gap: '8px', 
          textDecoration: 'none', color: 'var(--text-secondary)',
          fontSize: '0.82rem', fontWeight: '500'
        }}>
          <span style={{ opacity: 0.8 }}>Hi, {user?.nickname || 'Friend'}</span>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, var(--color-primary-400), var(--color-secondary-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', fontSize: '0.9rem',
            border: '2px solid var(--color-primary-200)',
            boxShadow: '0 2px 8px rgba(79,139,122,0.2)'
          }}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : '🌿'}
          </div>
        </NavLink>
      </header>

      <OfflineIndicator />

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/chat" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💬</span>
          <span className="nav-label">{t('nav_chat')}</span>
        </NavLink>
        <NavLink to="/mood" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">😊</span>
          <span className="nav-label">{t('nav_mood')}</span>
        </NavLink>
        <NavLink to="/wellness" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🌿</span>
          <span className="nav-label">{t('nav_wellness')}</span>
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">Data</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="nav-avatar" />
            ) : (
              '👤'
            )}
          </span>
          <span className="nav-label">{t('nav_profile')}</span>
        </NavLink>
      </nav>

      {showDailyPopup && (
        <div className="daily-popup-overlay">
          <div className="daily-popup-card">
            {dailyMoodStep === 'select' && (
              <>
                <button 
                  className="daily-popup-close" 
                  onClick={() => setShowDailyPopup(false)}
                  title="Dismiss check-in"
                  disabled={isSavingDailyMood}
                >
                  &times;
                </button>
                <div className="daily-popup-header">
                  <h2>Today's Mood Check-in 🌿</h2>
                  <p>How are you feeling today?</p>
                </div>
                <div className="daily-mood-options">
                  <button 
                    className="daily-mood-btn good"
                    onClick={() => setDailyMoodStep('good')}
                    disabled={isSavingDailyMood}
                  >
                    <span className="daily-mood-emoji">😊</span>
                    <span className="daily-mood-label">Good</span>
                  </button>
                  <button 
                    className="daily-mood-btn bad"
                    onClick={() => setDailyMoodStep('bad')}
                    disabled={isSavingDailyMood}
                  >
                    <span className="daily-mood-emoji">😔</span>
                    <span className="daily-mood-label">Bad</span>
                  </button>
                </div>
              </>
            )}

            {dailyMoodStep === 'good' && (
              <div className="daily-response-view">
                <span className="daily-response-icon">🌿</span>
                <p className="daily-response-text">
                  That's great! May your day be good, peaceful, and filled with joy.
                </p>
                <button 
                  className="btn-good-path"
                  onClick={() => handleSaveDailyMood(5)}
                  disabled={isSavingDailyMood}
                >
                  {isSavingDailyMood ? 'Saving...' : 'Thank you 🌸'}
                </button>
              </div>
            )}

            {dailyMoodStep === 'bad' && (
              <div className="daily-response-view">
                <span className="daily-response-icon">😔</span>
                <p className="daily-response-text">
                  Oh, I'm so sorry. What happened?
                </p>
                <textarea
                  className="daily-textarea"
                  value={dailyMoodNote}
                  onChange={(e) => setDailyMoodNote(e.target.value)}
                  placeholder="Would you like to write about it? (optional)..."
                  disabled={isSavingDailyMood}
                />
                <div className="daily-action-btns">
                  <button 
                    className="btn-bad-path-primary"
                    onClick={() => handleSaveDailyMood(2, dailyMoodNote, true)}
                    disabled={isSavingDailyMood}
                  >
                    {isSavingDailyMood ? 'Saving...' : "Yes, let's talk 💬"}
                  </button>
                  <button 
                    className="btn-bad-path-secondary"
                    onClick={() => handleSaveDailyMood(2, dailyMoodNote, false)}
                    disabled={isSavingDailyMood}
                  >
                    {isSavingDailyMood ? 'Saving...' : 'Just browsing 🌸'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

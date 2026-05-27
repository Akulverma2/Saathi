import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import OfflineIndicator from './OfflineIndicator';

export default function AppShell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (user && user.isGuest) {
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
    </div>
  );
}

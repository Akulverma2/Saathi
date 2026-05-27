import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import OfflineIndicator from './OfflineIndicator';

export default function AppShell() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) return <Outlet />; // Don't show shell on onboarding

  return (
    <div className="app-shell">
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

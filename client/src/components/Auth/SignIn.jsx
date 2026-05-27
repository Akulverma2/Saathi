import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

export default function SignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError('Username and password are required.');
    
    let cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }
    
    try {
      setError('');
      setLoading(true);
      await signIn({ username: cleanUsername, password });
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page" style={{ justifyContent: 'center', padding: 'var(--space-6)' }}>
      <div className="onboarding-logo" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="onboarding-logo-icon" style={{ fontSize: '2.5rem' }}>🌿</div>
        <h1 className="logo-text" style={{ fontSize: '2.5rem', margin: '8px 0' }}>Saathi</h1>
        <p className="onboarding-subtitle">Your safe space, always</p>
      </div>

      <div className="card card-glass animate-slide-up" style={{ padding: 'var(--space-6)', width: '100%' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>
          Sign In
        </h2>

        {error && (
          <div style={{ 
            background: 'rgba(229, 115, 115, 0.15)', 
            color: 'var(--color-danger)', 
            padding: '10px 12px', 
            borderRadius: '8px', 
            fontSize: '0.85rem', 
            marginBottom: '1rem',
            border: '1px solid rgba(229, 115, 115, 0.3)'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Username</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="input" 
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ background: 'rgba(255, 255, 255, 0.2)', paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  opacity: 0.7
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            style={{ marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--color-primary-500)', fontWeight: '600', textDecoration: 'none' }}>
            Register Now
          </Link>
        </div>
      </div>
      
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to="/" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}>
          ← Back to Welcome
        </Link>
      </div>
    </div>
  );
}

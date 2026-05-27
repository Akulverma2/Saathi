import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/apiClient';

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(user ? user.nickname : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Real-time username availability state
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken | error
  const checkTimeoutRef = useRef(null);

  const isUpgrading = user && user.isGuest;

  // Debounced real-time username availability check
  useEffect(() => {
    // Clear previous timeout
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    let cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }

    // Don't check if too short
    if (cleanUsername.length < 4) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await api.checkUsername(cleanUsername);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        // Don't block signup on network errors, server will still validate
        setUsernameStatus('idle');
      }
    }, 500); // 500ms debounce

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [username]);

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    const checks = {
      length: pwd.length >= 6,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    score = Object.values(checks).filter(Boolean).length;
    const levels = [
      { label: '', color: '' },
      { label: 'Very Weak', color: '#ef4444' },
      { label: 'Weak', color: '#f97316' },
      { label: 'Fair', color: '#eab308' },
      { label: 'Good', color: '#22c55e' },
      { label: 'Strong', color: '#10b981' },
    ];
    return { score, ...levels[score], checks };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError('Username and password are required.');
    
    let cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername.startsWith('@')) {
      cleanUsername = '@' + cleanUsername;
    }

    if (cleanUsername.length < 4) {
      return setError('Username must be at least 3 characters long (excluding @).');
    }
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    // Block if username is known to be taken
    if (usernameStatus === 'taken') {
      return setError(`Username ${cleanUsername} is already taken. Please choose a different one.`);
    }
    
    try {
      setError('');
      setLoading(true);
      await signUp({ 
        username: cleanUsername, 
        password, 
        nickname: nickname.trim() || cleanUsername 
      });
      if (isUpgrading) {
        navigate('/chat');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      const msg = err.message || 'Failed to register account.';
      if (msg.includes('already taken') || msg.includes('Username is already')) {
        setUsernameStatus('taken');
        setError(`Username ${cleanUsername} is already taken. Please choose a different one.`);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const getUsernameIndicator = () => {
    switch (usernameStatus) {
      case 'checking':
        return (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="spinner-dot" style={{ 
              width: '10px', height: '10px', borderRadius: '50%', 
              border: '2px solid transparent', borderTopColor: 'var(--color-primary-400)',
              animation: 'spin 0.8s linear infinite', display: 'inline-block'
            }} /> Checking availability...
          </span>
        );
      case 'available':
        return (
          <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: '600' }}>
            ✅ Username is available!
          </span>
        );
      case 'taken':
        return (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: '600' }}>
            ❌ Username is already taken
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-page" style={{ justifyContent: 'center', padding: 'var(--space-6)' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="onboarding-logo" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="onboarding-logo-icon" style={{ fontSize: '2.5rem' }}>🌿</div>
        <h1 className="logo-text" style={{ fontSize: '2.5rem', margin: '8px 0' }}>Saathi</h1>
        <p className="onboarding-subtitle">Your safe space, always</p>
      </div>

      <div className="card card-glass animate-slide-up" style={{ padding: 'var(--space-6)', width: '100%' }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)', fontSize: '1.25rem', textAlign: 'center', fontWeight: 'bold' }}>
          {isUpgrading ? 'Secure Your History' : 'Register Account'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'var(--space-4)', lineHeight: '1.3' }}>
          {isUpgrading 
            ? 'Lock in your wellness insights and logs under a secure password.'
            : 'Start your dynamic mental wellness journey with Saathi.'
          }
        </p>

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
              placeholder="At least 3 characters"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              style={{ 
                background: 'rgba(255, 255, 255, 0.2)',
                borderColor: usernameStatus === 'taken' ? 'var(--color-danger)' : 
                             usernameStatus === 'available' ? '#4ade80' : undefined
              }}
            />
            <div style={{ minHeight: '18px', marginTop: '2px' }}>
              {getUsernameIndicator()}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="input" 
                placeholder="At least 6 characters"
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
            {password && (
              <div style={{ marginTop: '8px' }}>
                {/* Strength bar */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.3s ease'
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '600', color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                {/* Requirement checklist */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                  {[
                    { key: 'length', label: '6+ chars' },
                    { key: 'uppercase', label: 'A-Z' },
                    { key: 'lowercase', label: 'a-z' },
                    { key: 'number', label: '0-9' },
                    { key: 'special', label: '!@#$' },
                  ].map(({ key, label }) => (
                    <span key={key} style={{
                      fontSize: '0.68rem',
                      color: strength.checks?.[key] ? '#4ade80' : 'var(--text-secondary)',
                      opacity: strength.checks?.[key] ? 1 : 0.6,
                      transition: 'color 0.2s'
                    }}>
                      {strength.checks?.[key] ? '✓' : '○'} {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Nickname (Optional)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="What should Saathi call you?"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
              style={{ background: 'rgba(255, 255, 255, 0.2)' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full" 
            style={{ marginTop: '0.5rem' }}
            disabled={loading || usernameStatus === 'taken'}
          >
            {loading ? 'Creating Account...' : isUpgrading ? 'Secure My Account' : 'Register'}
          </button>
        </form>

        {!isUpgrading && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/signin" style={{ color: 'var(--color-primary-500)', fontWeight: '600', textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link to={isUpgrading ? "/profile" : "/"} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: '500' }}>
          {isUpgrading ? '← Back to Profile' : '← Back to Welcome'}
        </Link>
      </div>
    </div>
  );
}

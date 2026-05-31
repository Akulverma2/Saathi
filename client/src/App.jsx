import React, { Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import AppShell from './components/Layout/AppShell';
import Welcome from './components/Onboarding/Welcome';

// Lazy load heavy dashboard, forms, and assessment wizard
const Assessment = React.lazy(() => import('./components/Onboarding/Assessment'));
const ChatView = React.lazy(() => import('./components/Chat/ChatView'));
const MoodCheckIn = React.lazy(() => import('./components/MoodTracker/MoodCheckIn'));
const WellnessHub = React.lazy(() => import('./components/Wellness/WellnessHub'));
const MoodDashboard = React.lazy(() => import('./components/MoodTracker/MoodDashboard'));
const SignIn = React.lazy(() => import('./components/Auth/SignIn'));
const SignUp = React.lazy(() => import('./components/Auth/SignUp'));

import { useTheme } from './contexts/ThemeContext';
import { api } from './services/apiClient';

function ProfilePage() {
  const { user, logout, updatePreferences } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme, customHue, setCustomHue, lowBandwidth, setLowBandwidth, calmMode, setCalmMode } = useTheme();

  const [editing, setEditing] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [newLang, setNewLang] = useState('en');
  const [newVoice, setNewVoice] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [customApiKey, setCustomApiKeyState] = useState(() => localStorage.getItem('saathi_custom_gemini_key') || '');

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'mr', label: 'मराठी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'ur', label: 'اردو' }
  ];

  // Sync state with loaded user profile
  useEffect(() => {
    if (user) {
      setNewNickname(user.nickname || '');
      setNewLang(user.language || 'en');
      setNewVoice(user.voice_preference ? true : false);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
  };

  const handleUpdate = async (fields) => {
    try {
      await updatePreferences(fields);
      if (fields.language) {
        i18n.changeLanguage(fields.language);
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update preferences', err);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB.');
      return;
    }

    setUploadingAvatar(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setUploadingAvatar(false);
      alert('Could not read the image file. Please try another.');
    };
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        setUploadingAvatar(false);
        alert('Could not load the image. Please try a different photo.');
      };
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 120;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          await handleUpdate({ avatar: compressedBase64 });
        } catch (err) {
          console.error('Avatar upload failed:', err);
          alert('Failed to upload photo. Please try again.');
        } finally {
          setUploadingAvatar(false);
          // Reset the file input so the same file can be re-selected
          e.target.value = '';
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfileInfo = (e) => {
    e.preventDefault();
    handleUpdate({
      nickname: newNickname.trim() || 'Friend',
      language: newLang,
      voice_preference: newVoice
    });
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: Are you sure you want to permanently delete your Saathi account? " +
      "This will immediately erase all your chats, mood history, journal reflections, and personal settings. " +
      "This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await api.deleteAccount();
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Failed to delete account', err);
      alert('Could not delete account. Please try again.');
    }
  };

  const isGuest = !user || user.isGuest || !user.username;

  return (
    <div className="profile-page animate-fade-in" style={{ padding: '1rem', paddingBottom: '80px' }}>
      
      {/* Dynamic Success Checkmark Notification */}
      {showSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-primary-500)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 999,
          fontSize: '0.9rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'bounceIn 0.4s ease'
        }}>
          ✨ Settings Saved Successfully!
        </div>
      )}

      {/* Premium Profile Visual Card */}
      <div className="profile-header" style={{
        background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-400))',
        borderRadius: '24px',
        padding: '1.75rem 1.5rem',
        textAlign: 'center',
        color: 'white',
        marginBottom: '1.25rem',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        
        {/* Avatar Container with Floating Action Badge */}
        <div style={{ position: 'relative', marginBottom: '4px' }}>
          <div 
            onClick={() => !uploadingAvatar && document.getElementById('avatarInput').click()}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              border: '3px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploadingAvatar ? 'wait' : 'pointer',
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
              transition: 'transform 0.2s',
              position: 'relative'
            }}
            title={uploadingAvatar ? 'Uploading...' : 'Upload profile picture'}
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt="Profile Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: uploadingAvatar ? 0.3 : 1 }} 
              />
            ) : (
              <span style={{ fontSize: '2.5rem', opacity: uploadingAvatar ? 0.3 : 1 }}>🌿</span>
            )}
            {uploadingAvatar && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '50%'
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
              </div>
            )}
          </div>
          
          {/* Hidden uploader input */}
          <input 
            type="file" 
            id="avatarInput" 
            accept="image/*" 
            onChange={handleAvatarChange} 
            style={{ display: 'none' }} 
          />

          {/* Floating Edit Icon */}
          <div 
            onClick={() => document.getElementById('avatarInput').click()}
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              background: 'var(--color-primary-500)',
              border: '2px solid white',
              borderRadius: '50%',
              width: '26px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
            title="Upload profile picture"
          >
            📷
          </div>
        </div>

        {user?.avatar && (
          <button
            onClick={() => handleUpdate({ avatar: null })}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.72rem',
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: '2px',
              outline: 'none',
              padding: '2px 8px'
            }}
          >
            Clear Photo
          </button>
        )}

        <h2 style={{ color: 'white', margin: 0, fontSize: '1.35rem', fontWeight: 'bold', marginTop: '4px' }}>
          {user?.nickname || 'Friend'}
        </h2>
        {isGuest ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255,255,255,0.15)',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.72rem',
            fontWeight: '600',
            marginTop: '2px'
          }}>
            👤 {t('guest_account')}
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--mono)' }}>
              {user?.username && user.username.startsWith('@') ? user.username : `@${user?.username}`}
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255,255,255,0.25)',
              padding: '3px 10px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: '700',
              marginTop: '3px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              🛡️ Verified Account
            </span>
          </div>
        )}
      </div>

      <div className="profile-actions">
        {/* Dynamic Guest Account Upgrade Callout */}
        {isGuest && (
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(139, 111, 212, 0.06), rgba(79, 139, 122, 0.06))',
            border: '1.5px dashed var(--color-primary-300)',
            borderRadius: '18px',
            padding: '1.25rem',
            marginBottom: '1.25rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ fontSize: '1.6rem', margin: 0 }}>🔒</div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>Lock In Your History</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Create a permanent account to secure your wellness logs and chats across devices forever.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/signup')}
              style={{ 
                width: 'auto', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔑 Secure My Account
            </button>
          </div>
        )}

        {/* Dynamic Edit Profile Information Panel */}
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
          {!editing ? (
            // Info Display
            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1.5px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                📋 Profile Information
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '500' }}>👤 Nickname:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{user?.nickname || 'Friend'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '500' }}>🌐 Language:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {languages.find(l => l.code === user?.language)?.label || 'English'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '500' }}>🎙️ Voice Support:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {user?.voice_preference ? 'Enabled 🎙️' : 'Disabled ⌨️'}
                  </span>
                </div>
              </div>

              <button
                className="btn btn-secondary btn-full"
                onClick={() => setEditing(true)}
                style={{ 
                  borderRadius: '16px', 
                  padding: '10px', 
                  fontSize: '0.85rem', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid rgba(255,255,255,0.1)'
                }}
              >
                ✏️ Edit Information
              </button>
            </div>
          ) : (
            // Info Form Editor
            <form onSubmit={saveProfileInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                ✏️ Edit Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Nickname</label>
                <input 
                  type="text"
                  className="input"
                  placeholder="What should Saathi call you?"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Preferred Language</label>
                <select
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px',
                    color: 'white',
                    border: '1.5px solid rgba(255,255,255,0.15)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} style={{ background: '#1e293b', color: 'white' }}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>🎙️ Voice Responses</span>
                <input 
                  type="checkbox"
                  checked={newVoice}
                  onChange={(e) => setNewVoice(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary-500)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditing(false)}
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💾 Save Details
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Device Modes and Custom System Toggles */}
        <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '700', borderBottom: '1.5px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
            ⚙️ Display Settings
          </h3>
          
          {/* Theme Selector Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '600' }}>🎨 Theme Option</span>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {['light', 'dark', 'customized'].map((tOpt) => {
                const isSelected = theme === tOpt;
                return (
                  <button
                    type="button"
                    key={tOpt}
                    onClick={() => setTheme(tOpt)}
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: '12px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      border: isSelected ? '2px solid var(--color-primary-500)' : '1.5px solid var(--color-neutral-200)',
                      background: isSelected ? 'rgba(79, 139, 122, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      outline: 'none'
                    }}
                  >
                    {tOpt === 'customized' ? '🎨 Custom' : tOpt === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HSL Hue Customizer (Visible ONLY when customized theme is chosen) */}
          {theme === 'customized' && (
            <div className="animate-fade-in" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '10px', 
              padding: '12px', 
              borderRadius: '16px', 
              background: 'var(--color-neutral-100)',
              border: '1px solid var(--color-neutral-200)'
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                <span>🎯 Select Custom Color Accent</span>
                <span style={{ color: 'var(--color-primary-500)', fontWeight: 'bold' }}>Hue: {customHue}°</span>
              </span>

              {/* Predefined Color Accents */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '4px 0' }}>
                {[
                  { name: 'Terracotta', hue: 25, color: '#d66f2c' },
                  { name: 'Forest', hue: 160, color: '#35a08c' },
                  { name: 'Ocean', hue: 200, color: '#4fc3f7' },
                  { name: 'Lavender', hue: 265, color: '#8b6fd4' },
                  { name: 'Rose', hue: 340, color: '#e57373' }
                ].map((preset) => (
                  <button
                    type="button"
                    key={preset.hue}
                    onClick={() => setCustomHue(preset.hue)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: preset.color,
                      border: customHue === preset.hue ? '3px solid var(--text-primary)' : '1.5px solid white',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transform: customHue === preset.hue ? 'scale(1.15)' : 'none',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                    title={preset.name}
                  />
                ))}
              </div>

              {/* Color range slider */}
              <input 
                type="range"
                min="0"
                max="360"
                value={customHue}
                onChange={(e) => setCustomHue(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'linear-gradient(to right, red, orange, yellow, green, cyan, blue, purple, red)',
                  cursor: 'pointer',
                  appearance: 'none',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Custom Gemini API Key Panel */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            paddingTop: '10px', 
            borderTop: '1px solid rgba(255,255,255,0.08)' 
          }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔑 Custom Gemini API Key
            </span>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              If the default AI chat runs out of daily quota (quota exceeded error), paste your own free Gemini API key below to restore active chat instantly.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="password"
                className="input"
                placeholder="Paste AIzaSy... API key"
                value={customApiKey}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setCustomApiKeyState(val);
                  localStorage.setItem('saathi_custom_gemini_key', val);
                }}
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  borderRadius: '12px', 
                  padding: '10px',
                  fontSize: '0.85rem',
                  flex: 1
                }}
              />
              {customApiKey && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setCustomApiKeyState('');
                    localStorage.removeItem('saathi_custom_gemini_key');
                  }}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '12px', 
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    background: 'rgba(229, 115, 115, 0.1)',
                    color: 'var(--color-danger)',
                    border: '1.5px solid var(--color-danger)'
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {customApiKey && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                ✨ Active Key Saved Locally! Saathi is ready to chat.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '500' }}>📶 Low Bandwidth Mode (Fast)</span>
              <input 
                type="checkbox" 
                checked={lowBandwidth} 
                onChange={(e) => setLowBandwidth(e.target.checked)} 
                style={{ width: '22px', height: '22px', accentColor: 'var(--color-primary-500)', cursor: 'pointer' }}
              />
            </label>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: '500' }}>🧘 Calm UI Mode</span>
              <input 
                type="checkbox" 
                checked={calmMode} 
                onChange={(e) => setCalmMode(e.target.checked)} 
                style={{ width: '22px', height: '22px', accentColor: 'var(--color-primary-500)', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>

        {/* Safe Logout & Delete Operations */}
        {isGuest ? (
          <button className="btn btn-danger btn-full" onClick={handleLogout}>
            {t('sign_out')}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn btn-secondary btn-full" 
              onClick={handleLogout}
              style={{ 
                border: '1.5px solid var(--color-neutral-300)',
                color: 'var(--text-secondary)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🚪 Sign Out Safely
            </button>
            <button 
              className="btn btn-danger btn-full" 
              onClick={handleDeleteAccount}
              style={{ 
                background: 'rgba(229, 115, 115, 0.1)',
                border: '1.5px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              🗑️ Delete Account Permanently
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const LoadingScreen = () => (
  <div className="loading-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
    <div className="loading-logo" style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>🌿</div>
    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '12px' }}>Preparing your safe space...</p>
  </div>
);

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/onboarding" element={<Assessment />} />
        {!user ? (
          <>
            <Route path="/" element={<Welcome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/chat" element={<ChatView />} />
            <Route path="/mood" element={<MoodCheckIn />} />
            <Route path="/wellness" element={<WellnessHub />} />
            <Route path="/dashboard" element={<MoodDashboard />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/signup" element={<SignUp />} /> {/* Upgrade anonymous guest user route */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}

import { useTranslation } from 'react-i18next';
import { useVoice } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MessageBubble({ message }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { speak, isSupported } = useVoice(i18n.language);
  const navigate = useNavigate();
  const isUser = message.role === 'user';

  // Auto-read aloud if user prefers voice and it's a new assistant message
  useEffect(() => {
    if (!isUser && user?.voice_preference && isSupported && message.created_at) {
      const msgTime = new Date(message.created_at).getTime();
      const now = Date.now();
      if (now - msgTime < 5000) { // Only auto-speak if it's very recent
        speak(message.content);
      }
    }
  }, [message, isUser, user?.voice_preference, isSupported, speak]);

  const timeString = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Detect wellness suggestions in assistant messages and generate a beautiful action CTA button
  let activityButton = null;
  if (!isUser) {
    const lowerContent = message.content.toLowerCase();
    
    if (lowerContent.includes('breathing') || lowerContent.includes('सांस')) {
      activityButton = (
        <button 
          onClick={() => navigate('/wellness?start=breathing')}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
            color: 'white',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: '600',
            marginTop: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(79,139,122,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s',
            outline: 'none'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🌬️ Start Breathing Exercise
        </button>
      );
    } else if (lowerContent.includes('journal') || lowerContent.includes('डायरी') || lowerContent.includes('लिखना')) {
      activityButton = (
        <button 
          onClick={() => navigate('/wellness?start=journal')}
          style={{
            background: 'linear-gradient(135deg, var(--color-secondary-500), var(--color-secondary-600))',
            color: 'white',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: '600',
            marginTop: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(200,150,100,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s',
            outline: 'none'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          📓 Open Guided Journal
        </button>
      );
    } else if (lowerContent.includes('grounding') || lowerContent.includes('5-4-3-2-1')) {
      activityButton = (
        <button 
          onClick={() => navigate('/wellness?start=grounding')}
          style={{
            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-500))',
            color: 'white',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: '600',
            marginTop: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(79,139,122,0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s',
            outline: 'none'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🌿 Start Grounding Exercise
        </button>
      );
    } else if (lowerContent.includes('relaxation') || lowerContent.includes('रिलैक्सेशन') || lowerContent.includes('body')) {
      activityButton = (
        <button 
          onClick={() => navigate('/wellness?start=relaxation')}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: 'white',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: '600',
            marginTop: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s',
            outline: 'none'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          ✨ Start Body Relaxation
        </button>
      );
    } else if (lowerContent.includes('sleep') || lowerContent.includes('सोने') || lowerContent.includes('wind-down')) {
      activityButton = (
        <button 
          onClick={() => navigate('/wellness?start=sleep')}
          style={{
            background: 'linear-gradient(135deg, #312e81, #1e1b4b)',
            color: 'white',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: '600',
            marginTop: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(49,46,129,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s',
            outline: 'none'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🌙 Start Sleep Wind-Down
        </button>
      );
    }
  }

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      {/* AI avatar — left side */}
      {!isUser && (
        <div className="message-avatar assistant-avatar">🌿</div>
      )}

      <div className="message-content-wrapper" style={isUser ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }}>
        <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
          <div>{message.content}</div>
          {activityButton}
        </div>

        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'msg-meta-right' : 'msg-meta-left'}`}>
          {!isUser && isSupported && (
            <button
              className="tts-btn"
              onClick={() => speak(message.content)}
              title={t('read_aloud')}
              aria-label="Read message aloud"
            >
              🔊
            </button>
          )}
          <span className="message-time">{timeString}</span>
          {isUser && !message.synced && <span className="message-time" title="Pending sync">⏳</span>}
        </div>
      </div>

      {/* User avatar — right side */}
      {isUser && (
        <div className="message-avatar user-avatar" style={{
          background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, var(--color-secondary-400), var(--color-primary-400))',
          overflow: 'hidden'
        }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : '👤'}
        </div>
      )}
    </div>
  );
}

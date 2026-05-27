import { useTranslation } from 'react-i18next';
import { useVoice } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect } from 'react';

export default function MessageBubble({ message }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { speak, isSupported } = useVoice(i18n.language);
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

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="message-avatar">🌿</div>}
      {isUser && (
        <div className="message-avatar" style={{
          background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, var(--color-secondary-400), var(--color-primary-400))',
          overflow: 'hidden'
        }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : '👤'}
        </div>
      )}
      
      <div className="flex-col" style={isUser ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }}>
        <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
          {message.content}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="message-time">{timeString}</span>
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
          {isUser && !message.synced && <span className="message-time" title="Pending sync">⏳</span>}
        </div>
      </div>
    </div>
  );
}

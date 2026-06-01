import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import CrisisAlert from '../Crisis/CrisisAlert';
import SafetyBanner from '../Crisis/SafetyBanner';

export default function ChatView() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { messages, loading, crisisLevel, dismissCrisis, sendMessage, bottomRef } = useChat(i18n.language);

  // Auto-send pending mood message set by the daily welcome popup
  useEffect(() => {
    const pending = sessionStorage.getItem('saathi_pending_mood_msg');
    if (pending) {
      sessionStorage.removeItem('saathi_pending_mood_msg');
      // Small delay so chat is fully mounted before sending
      const t = setTimeout(() => sendMessage(pending), 600);
      return () => clearTimeout(t);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="chat-view">
      {crisisLevel >= 2 && (
        <CrisisAlert level={crisisLevel} onDismiss={dismissCrisis} />
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-avatar">🌿</div>
            <h2>{t('chat_welcome_title', { name: user?.nickname || 'Friend' })}</h2>
            <p>{t('chat_welcome_sub')}</p>
            <div className="quick-actions">
              <button className="quick-action-pill" onClick={() => sendMessage(t('quick_stressed'))}>{t('quick_stressed')}</button>
              <button className="quick-action-pill" onClick={() => sendMessage(t('quick_sleep'))}>{t('quick_sleep')}</button>
              <button className="quick-action-pill" onClick={() => sendMessage(t('quick_anxious'))}>{t('quick_anxious')}</button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        
        {loading && (
          <div className="message-row assistant animate-fade-in">
            <div className="message-avatar">🌿</div>
            <div className="message-bubble assistant">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} />
      <SafetyBanner />
    </div>
  );
}

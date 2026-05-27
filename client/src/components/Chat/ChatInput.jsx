import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoice } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatInput({ onSend, disabled }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const { isRecording, transcript, isSupported, startRecording, stopRecording } = useVoice(i18n.language);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  // Update text with voice transcript
  useEffect(() => {
    if (transcript) setText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${transcript}` : transcript;
    });
  }, [transcript]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  return (
    <div className="chat-input-area">
      {isSupported && (
        <button 
          className={`voice-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleVoice}
          disabled={disabled}
          title={isRecording ? 'Stop recording' : 'Start recording'}
          aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
        >
          {isRecording ? '🎙️' : '🎤'}
        </button>
      )}
      
      <div className="chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Listening...' : t('chat_placeholder')}
          disabled={disabled || isRecording}
          rows={1}
        />
      </div>

      <button 
        className="send-btn" 
        onClick={handleSend} 
        disabled={disabled || !text.trim()}
        aria-label="Send message"
      >
        ➤
      </button>
    </div>
  );
}

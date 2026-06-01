import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoice } from '../../hooks/useVoice';
import { useAuth } from '../../contexts/AuthContext';

export default function ChatInput({ onSend, disabled }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const textareaRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const fileRef = useRef(null);
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
    if ((text.trim() || attachments.length > 0) && !disabled) {
      let fullText = text;
      if (attachments.length > 0) {
        const names = attachments.map(a => `📎 ${a.name}`).join('\n');
        fullText = text ? `${text}\n${names}` : names;
      }
      onSend(fullText);
      setText('');
      setAttachments([]);
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
    }
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎬';
    return '📄';
  };

  return (
    <div className="chat-input-container">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="attachment-preview-bar">
          {attachments.map((file, idx) => (
            <div key={idx} className="attachment-chip">
              <span className="attachment-chip-icon">{getFileIcon(file)}</span>
              <span className="attachment-chip-name">{file.name.length > 16 ? file.name.slice(0, 14) + '…' : file.name}</span>
              <button className="attachment-chip-remove" onClick={() => removeAttachment(idx)} aria-label="Remove attachment">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        {/* Hidden file inputs */}
        <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} multiple />
        <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleFileChange} multiple />
        <input ref={fileRef}  type="file" accept="*/*"     style={{ display: 'none' }} onChange={handleFileChange} multiple />

        {/* Attach button with popup menu */}
        <div className="attach-wrapper">
          <button
            className={`attach-btn ${showAttachMenu ? 'active' : ''}`}
            onClick={() => setShowAttachMenu(v => !v)}
            disabled={disabled}
            aria-label="Attach files"
            title="Attach photo, video or file"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {showAttachMenu && (
            <div className="attach-menu">
              <button className="attach-menu-item" onClick={() => { photoRef.current?.click(); }}>
                <span className="attach-menu-icon">🖼️</span>
                <span>Photo</span>
              </button>
              <button className="attach-menu-item" onClick={() => { videoRef.current?.click(); }}>
                <span className="attach-menu-icon">🎬</span>
                <span>Video</span>
              </button>
              <button className="attach-menu-item" onClick={() => { fileRef.current?.click(); }}>
                <span className="attach-menu-icon">📄</span>
                <span>File</span>
              </button>
            </div>
          )}
        </div>

        {/* Text input */}
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

        {/* Voice btn */}
        {isSupported && (
          <button
            className={`voice-btn ${isRecording ? 'recording' : ''}`}
            onClick={toggleVoice}
            disabled={disabled}
            title={isRecording ? 'Stop recording' : 'Voice message'}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
          >
            {isRecording ? (
              /* Animated waveform bars when recording */
              <span className="voice-wave-icon">
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
                <span className="voice-bar" />
              </span>
            ) : (
              /* Clean SVG microphone icon */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="9"  y1="22" x2="15" y2="22" />
              </svg>
            )}
          </button>
        )}

        {/* Send btn */}
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

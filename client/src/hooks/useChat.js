import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/apiClient';
import { saveMessage, getMessages, getUnsyncedMessages, markMessageSynced } from '../services/db';

export function useChat(language = 'en') {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [crisisLevel, setCrisisLevel] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  // Load history from IndexedDB on mount
  useEffect(() => {
    getMessages(60).then(msgs => {
      if (msgs.length) setMessages(msgs);
    });
  }, []);

  // Online/offline detection
  useEffect(() => {
    const on = () => { setIsOnline(true); syncPending(); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const syncPending = async () => {
    try {
      const unsent = await getUnsyncedMessages();
      if (unsent.length) {
        await api.syncMessages(unsent);
        for (const m of unsent) await markMessageSynced(m.id);
      }
    } catch { /* silent fail */ }
  };

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || loading) return;

    const lowerContent = content.trim().toLowerCase();
    
    // Check if user is replying affirmatively to a wellness suggestion from the assistant
    const isAffirmative = ['yes', 'yep', 'ok', 'sure', 'yeah', 'please', 'haan', 'हाँ', 'जी', 'जी हाँ', 'ok structure', 'ok routine'].some(aff => 
      lowerContent === aff || 
      lowerContent.includes(' ' + aff) || 
      lowerContent.startsWith(aff + ' ')
    );

    if (isAffirmative && messages.length > 0) {
      const assistantMsgs = [...messages].reverse().filter(m => m.role === 'assistant');
      if (assistantMsgs.length > 0) {
        const lastContent = assistantMsgs[0].content.toLowerCase();
        let targetActivity = null;

        if (lastContent.includes('breathing') || lastContent.includes('सांस')) {
          targetActivity = 'breathing';
        } else if (lastContent.includes('journal') || lastContent.includes('डायरी') || lastContent.includes('लिखना')) {
          targetActivity = 'journal';
        } else if (lastContent.includes('grounding') || lastContent.includes('5-4-3-2-1')) {
          targetActivity = 'grounding';
        } else if (lastContent.includes('relaxation') || lastContent.includes('रिलैक्सेशन') || lastContent.includes('body')) {
          targetActivity = 'relaxation';
        } else if (lastContent.includes('sleep') || lastContent.includes('सोने') || lastContent.includes('wind-down')) {
          targetActivity = 'sleep';
        }

        if (targetActivity) {
          navigate(`/wellness?start=${targetActivity}`);
          return;
        }
      }
    }

    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
      synced: false,
    };

    setMessages(prev => [...prev, userMsg]);
    await saveMessage(userMsg);
    setLoading(true);

    try {
      const token = localStorage.getItem('saathi_token');
      const response = await fetch('/api/chat/message/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content: content.trim(), language })
      });

      if (!response.ok) {
        throw new Error('Streaming failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullContent = '';
      let aiMsgId = uuidv4();

      // Create an optimistic AI bubble that updates in real-time
      const initialAiMsg = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        synced: true
      };
      
      setMessages(prev => [...prev, initialAiMsg]);
      setLoading(false); // Stop loading since we have active token streams now

      // Process stream reader chunks
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  fullContent += data.token;
                  setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m));
                }
                if (data.done) {
                  done = true;
                  const finalMsg = {
                    id: data.id || aiMsgId,
                    role: 'assistant',
                    content: data.content || fullContent,
                    created_at: new Date().toISOString(),
                    synced: true
                  };
                  setMessages(prev => prev.map(m => m.id === aiMsgId ? finalMsg : m));
                  await saveMessage(finalMsg);
                  if (data.crisisLevel > 0) setCrisisLevel(data.crisisLevel);
                }
              } catch (e) {
                // Incomplete JSON boundary ignore
              }
            }
          }
        }
      }
    } catch (err) {
      setLoading(false);
      if (!navigator.onLine || err.message.includes('failed') || err.message.includes('NetworkError')) {
        const offlineMsg = {
          id: uuidv4(),
          role: 'assistant',
          content: language === 'hi'
            ? 'मैं अभी ऑफलाइन हूँ, लेकिन आपकी बात सुन रहा हूँ। कनेक्शन आने पर आपसे बात करूँगा। 💙'
            : "I'm offline right now, but I hear you. I'll respond fully when your connection is back. 💙",
          created_at: new Date().toISOString(),
          synced: false,
        };
        setMessages(prev => [...prev, offlineMsg]);
        await saveMessage(offlineMsg);
      }
    }
  }, [loading, language]);

  const dismissCrisis = () => setCrisisLevel(0);

  return { messages, loading, crisisLevel, dismissCrisis, sendMessage, isOnline, bottomRef };
}

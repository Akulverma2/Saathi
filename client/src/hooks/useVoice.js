import { useState, useCallback, useRef } from 'react';

export function useVoice(language = 'en') {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported] = useState(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const recognitionRef = useRef(null);

  const langMap = { en: 'en-IN', hi: 'hi-IN', ks: 'hi-IN' };

  const startRecording = useCallback((onResult) => {
    if (!isSupported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = langMap[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        onResult?.(t);
        setTranscript('');
      }
    };
    recognition.onend = () => { setIsRecording(false); recognitionRef.current = null; };
    recognition.onerror = () => { setIsRecording(false); recognitionRef.current = null; };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, isSupported]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const speak = useCallback((text, lang = language) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = langMap[lang] || 'en-IN';
    utt.rate = 0.9;
    utt.pitch = 1.0;
    window.speechSynthesis.speak(utt);
  }, [language]);

  const stopSpeaking = () => window.speechSynthesis?.cancel();

  return { isRecording, transcript, isSupported, startRecording, stopRecording, speak, stopSpeaking };
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/apiClient';

const DAILY_PROMPTS = [
  'What made you smile today?',
  'What is one thing you learned about yourself today?',
  'What are you looking forward to tomorrow?',
  'If today had a color, what would it be and why?',
  'What is something kind you did or someone did for you today?',
];

const GRATITUDE_PROMPTS = [
  'Name 3 things you are grateful for right now',
  'Who is someone that made your day better?',
  'What is a small thing that brought you joy today?',
  'What part of your body are you thankful for?',
  'What is a memory that always makes you smile?',
];

const MOOD_TAGS = [
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'anxious', emoji: '😰', label: 'Anxious' },
  { key: 'calm', emoji: '😌', label: 'Calm' },
  { key: 'grateful', emoji: '🙏', label: 'Grateful' },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function JournalActivity({ activity, onComplete }) {
  const { t } = useTranslation();

  const isGratitude = activity.id === 'journal-gratitude';
  const prompts = isGratitude ? GRATITUDE_PROMPTS : DAILY_PROMPTS;

  const [prompt] = useState(() => pickRandom(prompts));
  const [content, setContent] = useState('');
  const [moodTag, setMoodTag] = useState(null);
  const [phase, setPhase] = useState('writing'); // writing | saving | analyzing | done
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState('');

  const canSave = content.trim().length > 0 && moodTag;

  const handleSave = async () => {
    if (!canSave) return;
    setPhase('saving');
    setError(null);

    try {
      await api.saveJournal({
        content: content.trim(),
        prompt,
        mood_tag: moodTag,
      });

      // Analyze it via AI
      setPhase('analyzing');
      try {
        const { analysis: aiText } = await api.analyzeJournal({ content: content.trim() });
        setAnalysis(aiText);
      } catch (analyzeErr) {
        console.warn('AI analysis failed, skipping', analyzeErr);
      }

      setPhase('done');
    } catch (err) {
      if (err.message === 'OFFLINE') {
        setPhase('done');
      } else {
        setError(t('journal_save_error') || 'Could not save. Please try again.');
        setPhase('writing');
      }
    }
  };

  // ── Done / Completion Screen ──────────────────
  if (phase === 'done') {
    return (
      <div className="breathing-view">
        <div className="animate-bounce-in" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>
            {isGratitude ? '💛' : '✨'}
          </div>
          <h2 style={{ color: 'var(--color-primary-600)', marginBottom: 'var(--space-2)' }}>
            {t('journal_saved_title') || 'Beautiful — saved!'}
          </h2>
          <p className="text-muted" style={{ maxWidth: 280, margin: '0 auto var(--space-4)' }}>
            {t('journal_saved_sub') || 'Taking time to reflect is a gift you give yourself. Keep going 💚'}
          </p>

          {analysis && (
            <div className="card animate-fade-in" style={{ background: 'var(--surface-card)', textAlign: 'left', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.2rem' }}>🌱</span>
                <span style={{ fontWeight: 600, color: 'var(--color-primary-700)' }}>Saathi's Note</span>
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {analysis}
              </p>
            </div>
          )}

          <button className="btn btn-primary btn-lg" style={{ width: 200 }} onClick={onComplete}>
            {t('done') || 'Done'}
          </button>
        </div>
      </div>
    );
  }

  // ── Writing Screen ────────────────────────────
  return (
    <div className="journal-view animate-fade-in" style={{ position: 'relative', minHeight: 'calc(100dvh - var(--header-height) - var(--nav-height))' }}>

      {/* Back button */}
      <button
        className="btn btn-ghost"
        style={{ position: 'absolute', top: 'var(--space-2)', left: 0, zIndex: 2 }}
        onClick={onComplete}
      >
        ← {t('back')}
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>{activity.icon}</div>
        <h2 style={{ marginBottom: 'var(--space-1)' }}>{activity.title}</h2>
        <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
          {t('journal_subtitle') || 'This is your safe space. Write freely.'}
        </p>
      </div>

      {/* Prompt card */}
      <div className="journal-prompt" style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '1.3rem', display: 'block', marginBottom: 'var(--space-2)' }}>💭</span>
        <p style={{ fontWeight: 500, fontSize: 'var(--font-size-md)' }}>
          {prompt}
        </p>
      </div>

      {/* Textarea */}
      <textarea
        className="journal-textarea"
        placeholder={t('journal_placeholder') || 'Start writing here…'}
        value={content}
        onChange={e => setContent(e.target.value)}
        autoFocus
        style={{ marginBottom: 'var(--space-4)' }}
      />

      {/* Word count hint */}
      <div style={{ textAlign: 'right', marginTop: '-0.75rem', marginBottom: 'var(--space-4)' }}>
        <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
          {content.trim().split(/\s+/).filter(Boolean).length} {t('words') || 'words'}
        </span>
      </div>

      {/* Mood tag selector */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <p style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)',
        }}>
          {t('journal_mood_label') || 'How are you feeling?'}
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {MOOD_TAGS.map(tag => {
            const isSelected = moodTag === tag.key;
            return (
              <button
                key={tag.key}
                onClick={() => setMoodTag(isSelected ? null : tag.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected
                    ? '2px solid var(--color-primary-500)'
                    : '1.5px solid var(--color-neutral-200)',
                  background: isSelected
                    ? 'var(--color-primary-50)'
                    : 'var(--surface-card)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{tag.emoji}</span>
                {t(`mood_${tag.key}`) || tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#b91c1c',
          fontSize: 'var(--font-size-sm)',
          marginBottom: 'var(--space-4)',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Save button */}
      <button
        className="btn btn-primary btn-lg btn-full"
        disabled={!canSave || phase === 'saving'}
        onClick={handleSave}
        style={{ marginBottom: 'var(--space-6)' }}
      >
        {phase === 'saving' || phase === 'analyzing'
          ? (phase === 'saving' ? (t('saving') || 'Saving…') : 'Analyzing…')
          : (t('journal_save') || 'Save Entry ✨')
        }
      </button>
    </div>
  );
}

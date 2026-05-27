import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMood } from '../../hooks/useMood';
import MoodTimeline from './MoodTimeline';

export default function MoodCheckIn() {
  const { t } = useTranslation();
  const { checkIn, loading, getWeekData, streak, insight } = useMood();
  const [selectedScore, setSelectedScore] = useState(null);
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const emojis = [
    { score: 1, icon: '😢', label: 'mood_1' },
    { score: 2, icon: '😔', label: 'mood_2' },
    { score: 3, icon: '😐', label: 'mood_3' },
    { score: 4, icon: '😊', label: 'mood_4' },
    { score: 5, icon: '😄', label: 'mood_5' }
  ];

  const tags = ['mood_tag_school', 'mood_tag_family', 'mood_tag_friends', 'mood_tag_sleep', 'mood_tag_health', 'mood_tag_exams', 'mood_tag_loneliness'];

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (!selectedScore || loading) return;
    await checkIn({ mood_score: selectedScore, note, tags: selectedTags });
    setSubmitted(true);
  };

  return (
    <div className="mood-page">
      {!submitted ? (
        <div className="mood-checkin-card">
          <h2>{t('mood_title')}</h2>
          <p>{t('mood_checkin')}</p>

          <div className="mood-emojis">
            {emojis.map((m) => (
              <button 
                key={m.score}
                className={`mood-emoji-btn ${selectedScore === m.score ? 'selected' : ''}`}
                onClick={() => setSelectedScore(m.score)}
              >
                <span className="emoji">{m.icon}</span>
                <span className="label">{t(m.label)}</span>
              </button>
            ))}
          </div>

          {selectedScore && (
            <div className="animate-slide-up">
              <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('mood_tags')}</p>
              <div className="stress-tags">
                {tags.map(tag => (
                  <button 
                    key={tag}
                    className={`stress-tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {t(tag)}
                  </button>
                ))}
              </div>
              <textarea 
                className="input mt-4" 
                placeholder={t('mood_note_placeholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }}
              />
              <button 
                className="btn btn-secondary btn-full mt-4" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {t('save')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="streak-card animate-bounce-in">
          <div className="streak-number">{streak}</div>
          <div className="streak-info">
            <h4>{t('streak_days')}</h4>
            <p>{t('streak_message')}</p>
          </div>
        </div>
      )}

      {insight && (
        <div className="insight-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-primary-600)' }}>✨ {t('your_insight')}</h4>
          <p>{insight}</p>
        </div>
      )}

      <MoodTimeline weekData={getWeekData()} />
    </div>
  );
}

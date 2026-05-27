import { useTranslation } from 'react-i18next';

export default function MoodTimeline({ weekData }) {
  const { t } = useTranslation();

  const getMoodColor = (score) => {
    if (!score) return 'empty';
    if (score <= 2) return `var(--mood-${score})`;
    if (score === 3) return 'var(--mood-3)';
    return `var(--mood-${score})`;
  };

  const getMoodEmoji = (score) => {
    if (!score) return '';
    return ['😢','😔','😐','😊','😄'][score - 1];
  };

  return (
    <div className="mt-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
      <h3 className="mood-section-title">{t('mood_timeline')}</h3>
      <div className="card">
        <div className="mood-week">
          {weekData.map((day, i) => (
            <div key={i} className="mood-day">
              <div 
                className={`mood-dot ${!day.score ? 'empty' : ''}`}
                style={day.score ? { background: getMoodColor(day.score) } : {}}
              >
                {getMoodEmoji(day.score)}
              </div>
              <span className="mood-day-label">{day.dayLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

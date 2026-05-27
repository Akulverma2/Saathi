import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/apiClient';
import BreathingExercise from './BreathingExercise';
import JournalActivity from './JournalActivity';
import BodyRelaxation from './BodyRelaxation';
import GroundingExercise from './GroundingExercise';
import StudyTimer from './StudyTimer';
import SleepWindDown from './SleepWindDown';

export default function WellnessHub() {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const location = useLocation();

  useEffect(() => {
    if (activities.length > 0) {
      const params = new URLSearchParams(location.search);
      const startId = params.get('start') || location.state?.start;
      if (startId) {
        const found = activities.find(a => a.id === startId || a.type === startId || a.id.includes(startId));
        if (found) {
          setActiveSession(found);
        }
      }
    }
  }, [activities, location]);


  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await api.getActivities(i18n.language);
        setActivities(data);
      } catch (err) {
        // Fallback for offline if cache fails
        setActivities([
          { id: 'breathing-478', type: 'breathing', title: '4-7-8 Breathing', duration: 180, icon: '🌬️', category: 'calm' },
          { id: 'breathing-box', type: 'breathing', title: 'Box Breathing', duration: 240, icon: '⬜', category: 'calm' },
          { id: 'grounding-54321', type: 'grounding', title: '5-4-3-2-1 Grounding', duration: 300, icon: '🌿', category: 'calm' },
          { id: 'journal-daily', type: 'journal', title: 'Daily Reflection', duration: 600, icon: '📓', category: 'reflect' },
          { id: 'journal-gratitude', type: 'journal', title: 'Gratitude Log', duration: 300, icon: '🙏', category: 'reflect' },
          { id: 'study-pomodoro', type: 'study', title: 'Study Timer', duration: 1500, icon: '📚', category: 'focus' },
          { id: 'sleep-routine', type: 'sleep', title: 'Sleep Wind-Down', duration: 600, icon: '🌙', category: 'sleep' },
          { id: 'progressive-relax', type: 'relaxation', title: 'Body Relaxation', duration: 420, icon: '✨', category: 'calm' },
        ]);
      }
    };
    fetchActivities();
  }, [i18n.language]);

  if (activeSession) {
    if (activeSession.type === 'breathing') {
      return <BreathingExercise activity={activeSession} onComplete={() => setActiveSession(null)} />;
    }
    if (activeSession.type === 'journal') {
      return <JournalActivity activity={activeSession} onComplete={() => setActiveSession(null)} />;
    }
    if (activeSession.type === 'grounding') {
      return <GroundingExercise activity={activeSession} onComplete={() => setActiveSession(null)} />;
    }
    if (activeSession.type === 'study') {
      return <StudyTimer activity={activeSession} onComplete={() => setActiveSession(null)} />;
    }
    if (activeSession.type === 'sleep') {
      return <SleepWindDown activity={activeSession} onComplete={() => setActiveSession(null)} />;
    }
    if (activeSession.type === 'relaxation') {
      return <BodyRelaxation activity={activeSession} onComplete={() => setActiveSession(null)} />;
    }
    return (
      <div className="wellness-page text-center">
        <h2>Coming soon!</h2>
        <button className="btn btn-secondary mt-4" onClick={() => setActiveSession(null)}>{t('back')}</button>
      </div>
    );
  }

  return (
    <div className="wellness-page">
      <div className="mb-4">
        <h2>{t('wellness_title')}</h2>
        <p className="text-muted">{t('wellness_sub')}</p>
      </div>

      <div className="activity-grid">
        {activities.map(act => (
          <div key={act.id} className="activity-card" onClick={() => setActiveSession(act)}>
            <div className={`activity-category category-${act.category}`}>
              {t(`category_${act.category}`)}
            </div>
            <div className="activity-icon">{act.icon}</div>
            <div>
              <h4 className="activity-title">{act.title}</h4>
              <span className="activity-duration">{Math.round(act.duration/60)} min</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

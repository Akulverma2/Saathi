import { useTranslation } from 'react-i18next';

export default function CrisisAlert({ level, onDismiss }) {
  const { t } = useTranslation();

  const helplines = [
    { name: 'KIRAN', number: '1800-599-0019', desc: t('crisis_free') },
    { name: 'iCall', number: '9152987821', desc: 'Mon-Sat' },
    { name: 'Emergency', number: '112', desc: '24/7' }
  ];

  return (
    <div className="crisis-overlay">
      <div className="crisis-card">
        <div className="crisis-header">
          <span className="crisis-icon">💙</span>
          <h2>{level >= 3 ? t('crisis_title') : t('crisis_level2_title')}</h2>
          <p>{level >= 3 ? t('crisis_message') : t('crisis_level2_message')}</p>
        </div>

        <p className="text-sm font-semibold">{t('crisis_helplines')}</p>
        <ul className="helpline-list">
          {helplines.map((hl) => (
            <li key={hl.name} className="helpline-item">
              <div>
                <div className="helpline-name">{hl.name}</div>
                <div className="helpline-meta">{hl.desc}</div>
              </div>
              <a href={`tel:${hl.number}`} className="helpline-call">📞 Call</a>
            </li>
          ))}
        </ul>

        <button className="btn btn-ghost btn-full mt-4" onClick={onDismiss}>
          {t('crisis_dismiss')}
        </button>
      </div>
    </div>
  );
}

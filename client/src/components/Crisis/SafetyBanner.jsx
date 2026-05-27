import { useTranslation } from 'react-i18next';

export default function SafetyBanner() {
  const { t } = useTranslation();

  return (
    <div className="safety-strip">
      <span>{t('safety_text')}</span>
      <a href="tel:18005990019">{t('safety_link')}</a>
    </div>
  );
}

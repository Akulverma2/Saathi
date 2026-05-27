import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function OfflineIndicator() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      setTimeout(() => setJustCameOnline(false), 3000);
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline && !justCameOnline) return null;

  return (
    <div className={`offline-banner ${justCameOnline ? 'success' : ''}`} style={justCameOnline ? { background: 'var(--color-success)' } : {}}>
      {justCameOnline ? (
        <><span>✅</span> {t('syncing')}</>
      ) : (
        <><span>📶</span> {t('offline')}</>
      )}
    </div>
  );
}

'use client';

import { useI18n, type Locale } from '@/app/common/i18n';
import styles from './LanguageSwitch.module.css';

export function LanguageSwitch({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { locale, setLocale, t } = useI18n();
  const set = (next: Locale) => setLocale(next);
  return (
    <div className={`${styles.switch} ${tone === 'dark' ? styles.dark : ''}`} role="group" aria-label="Language">
      <button
        type="button"
        className={locale === 'en' ? styles.on : styles.off}
        onClick={() => set('en')}
      >
        {t('lang.en')}
      </button>
      <button
        type="button"
        className={locale === 'zh' ? styles.on : styles.off}
        onClick={() => set('zh')}
      >
        {t('lang.zh')}
      </button>
    </div>
  );
}

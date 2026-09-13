'use client';

import { useEffect } from 'react';
import { useI18n } from '@/app/common/i18n';

export function LocaleSync({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);
  return children;
}

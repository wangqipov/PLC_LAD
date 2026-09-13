import { createStore, useStore } from '@/app/common/state';
import { en } from '@/app/common/i18n/en';
import { zh } from '@/app/common/i18n/zh';

export type Locale = 'en' | 'zh';

export const localeStore = createStore<{ locale: Locale }>({ locale: 'en' });

const tables: Record<Locale, Record<string, string>> = { en, zh };

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
): string {
  let text = tables[locale][key] ?? tables.en[key] ?? fallback ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export function useI18n() {
  const { locale } = useStore(localeStore);
  const t = (key: string, vars?: Record<string, string | number>, fallback?: string) =>
    translate(locale, key, vars, fallback);
  const setLocale = (next: Locale) => localeStore.patch({ locale: next });
  return { locale, t, setLocale };
}

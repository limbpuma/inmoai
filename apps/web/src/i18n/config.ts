export const locales = ['es', 'de', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  de: 'Deutsch',
  en: 'English',
};

export const localeSpeechCodes: Record<Locale, string> = {
  es: 'es-ES',
  de: 'de-DE',
  en: 'en-US',
};

import { it } from './it';

export type { AppStrings } from './it';
export { it };

/** Default (and currently only) locale dictionary. Import this in components. */
export const strings = it;

/** Short alias: `import { t } from '@/i18n'` */
export const t = strings;

export type Locale = 'it';
export const defaultLocale: Locale = 'it';
export const locales: Locale[] = ['it'];

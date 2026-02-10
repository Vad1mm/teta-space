/** Simple i18n system with t('key') function */
import { uk } from '../data/locales/uk.js';
import { en } from '../data/locales/en.js';

const locales = { uk, en };

let currentLocale = 'uk';

export function initLocale(savedLocale) {
  if (savedLocale && locales[savedLocale]) {
    currentLocale = savedLocale;
  } else {
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang === 'uk' || browserLang === 'ru') {
      currentLocale = 'uk';
    } else {
      currentLocale = 'en';
    }
  }
}

export function setLocale(locale) {
  if (locales[locale]) {
    currentLocale = locale;
  }
}

export function getLocale() {
  return currentLocale;
}

export function t(key, params = {}) {
  let text = locales[currentLocale]?.[key] || locales['en']?.[key] || key;
  for (const [param, value] of Object.entries(params)) {
    text = text.replace(`{${param}}`, value);
  }
  return text;
}

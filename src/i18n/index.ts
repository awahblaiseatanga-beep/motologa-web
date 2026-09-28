import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEN from './locales/en/common.json';
import navigationEN from './locales/en/navigation.json';
import statusesEN from './locales/en/statuses.json';
import notificationsEN from './locales/en/notifications.json';
import invoicesEN from './locales/en/invoices.json';
import authEN from './locales/en/auth.json';
import intakeEN from './locales/en/intake.json';
import checkoutEN from './locales/en/checkout.json';
import ownerEN from './locales/en/owner.json';

import commonFR from './locales/fr/common.json';
import navigationFR from './locales/fr/navigation.json';
import statusesFR from './locales/fr/statuses.json';
import notificationsFR from './locales/fr/notifications.json';
import invoicesFR from './locales/fr/invoices.json';
import authFR from './locales/fr/auth.json';
import intakeFR from './locales/fr/intake.json';
import checkoutFR from './locales/fr/checkout.json';
import ownerFR from './locales/fr/owner.json';

const resources = {
  en: {
    common: commonEN,
    navigation: navigationEN,
    statuses: statusesEN,
    notifications: notificationsEN,
    invoices: invoicesEN,
    auth: authEN,
    intake: intakeEN,
    checkout: checkoutEN,
    owner: ownerEN,
    translation: {
      common: commonEN,
      navigation: navigationEN,
      statuses: statusesEN,
      notifications: notificationsEN,
      invoices: invoicesEN,
      auth: authEN,
      intake: intakeEN,
      checkout: checkoutEN,
      owner: ownerEN,
    }
  },
  fr: {
    common: commonFR,
    navigation: navigationFR,
    statuses: statusesFR,
    notifications: notificationsFR,
    invoices: invoicesFR,
    auth: authFR,
    intake: intakeFR,
    checkout: checkoutFR,
    owner: ownerFR,
    translation: {
      common: commonFR,
      navigation: navigationFR,
      statuses: statusesFR,
      notifications: notificationsFR,
      invoices: invoicesFR,
      auth: authFR,
      intake: intakeFR,
      checkout: checkoutFR,
      owner: ownerFR,
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Core technical fallback
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from XSS
    }
  });

export default i18n;

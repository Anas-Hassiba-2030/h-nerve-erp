// Server-only — uses cookies(). Must NOT be imported in client components.

import { cookies } from "next/headers";
import {
  LOCALE_COOKIE,
  getMessagesByLocale,
  localeOrDefault,
  isRtl as isRtlPure,
  tBy,
  type Locale,
  type Messages,
  type MessageKey,
} from "./i18n";

export function getLocale(): Locale {
  return localeOrDefault(cookies().get(LOCALE_COOKIE)?.value);
}

export function getMessages(locale?: Locale): Messages {
  return getMessagesByLocale(locale ?? getLocale());
}

export function t(key: MessageKey, locale?: Locale): string {
  return tBy(locale ?? getLocale(), key);
}

export function isRtl(locale?: Locale): boolean {
  return isRtlPure(locale ?? getLocale());
}

export type { Locale, Messages, MessageKey };

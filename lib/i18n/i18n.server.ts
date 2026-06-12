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
} from "@/lib/i18n/i18n";

export async function getLocale(): Promise<Locale> {
  return localeOrDefault((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getMessages(locale?: Locale): Promise<Messages> {
  return getMessagesByLocale(locale ?? (await getLocale()));
}

export async function t(key: MessageKey, locale?: Locale): Promise<string> {
  return tBy(locale ?? (await getLocale()), key);
}

export async function isRtl(locale?: Locale): Promise<boolean> {
  return isRtlPure(locale ?? (await getLocale()));
}

export type { Locale, Messages, MessageKey };

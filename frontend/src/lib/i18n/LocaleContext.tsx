"use client";

// ─── lib/i18n/LocaleContext.tsx ────────────────────────────────────────────────
// 언어(로케일) 전역 상태.
//
// 구성:
//   - Locale: "en" | "ko" 유니언 타입
//   - LocaleProvider: locale 상태 보관 + 쿠키 동기화 (유효기간 1년)
//   - useLocale(): locale과 setLocale을 반환하는 커스텀 훅
//
// 로케일 변경 시 쿠키를 즉시 갱신 → 다음 SSR 요청(새로고침)에서 layout.tsx가 읽음

import { createContext, useContext, useState, type ReactNode } from "react";

export type Locale = "en" | "ko";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function setLocaleCookie(locale: Locale) {
  document.cookie = `locale=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function LocaleProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(next: Locale) {
    setLocaleCookie(next);
    setLocaleState(next);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}

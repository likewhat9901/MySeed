"use client";

// ─── lib/i18n/I18nProvider.tsx ────────────────────────────────────────────────
// LocaleProvider + ToastProvider를 I18nProvider 하나로 묶은 합성 Provider.
// layout.tsx에서 <I18nProvider initialLocale={...}> 한 줄로 두 Provider를 동시에 마운트.

import { LocaleProvider, type Locale } from "@/lib/i18n/LocaleContext";
import { ToastProvider } from "@/components/toast/ToastContext";
import type { ReactNode } from "react";

export default function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <ToastProvider>{children}</ToastProvider>
    </LocaleProvider>
  );
}

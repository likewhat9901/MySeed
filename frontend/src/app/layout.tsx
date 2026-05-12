// ─── app/layout.tsx ───────────────────────────────────────────────────────────
// 앱 루트 레이아웃 (Server Component).
//
// 역할:
//   1. SSR에서 로그인 상태(initialLoggedIn)와 로케일(locale)을 cookies()로 읽어
//      각 Provider에 prop으로 내려줌 → 클라이언트 hydration 시 깜빡임 없음
//   2. Provider 중첩 순서: I18nProvider(Locale+Toast) > AuthProvider > children
//   3. Geist 폰트 CSS 변수 설정 + pt-14(고정 헤더 높이만큼 여백)

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Header from '@/components/layout/Header';
import ReactScanInit from '@/lib/dev/ReactScanInit';
import I18nProvider from '@/lib/i18n/I18nProvider';
import { AuthProvider } from '@/features/auth/AuthContext';
import { getServerUser } from '@/lib/supabase/core/server';
import type { Locale } from "@/lib/i18n/LocaleContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MySeed — Smart Custom Ledger Service",
  description: "Create your own wealth with our own custom ledger. Stop fighting rigid spreadsheets.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "en") as Locale;

  // 서버에서 초기 로그인 상태를 읽어 AuthProvider에 전달 (SSR 깜빡임 방지)
  const user = await getServerUser();
  const initialLoggedIn = !!user;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-14">
        <ReactScanInit />
        <I18nProvider initialLocale={locale}>
          <AuthProvider initialLoggedIn={initialLoggedIn}>
            <Header />
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

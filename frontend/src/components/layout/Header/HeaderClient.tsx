"use client";

// 헤더의 클라이언트 영역 — AuthContext/LocaleContext 기반 로그인 상태 UI 렌더링

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthContext";
import NotificationPopover from "@/components/layout/Header/NotificationPopover";
import LocaleSwitcher from "@/components/layout/Header/LocaleSwitcher";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { navMessages } from "@/lib/i18n/messages/headerMessages";

export default function HeaderClient() {
  const { loggedIn } = useAuth();
  const { locale } = useLocale();
  const t = navMessages[locale];

  // 로그인 상태 — 전역 사이드바가 메뉴/유저를 담당하므로 헤더는 검색+알림만
  if (loggedIn) {
    return (
      <>
        <div className="hidden lg:flex items-center bg-gray-50 border border-gray-200 px-3 py-1.5 gap-2 min-w-[16rem] max-w-md">
          <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            name="header-search"
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            className="w-full min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LocaleSwitcher />
          <NotificationPopover />
        </div>
      </>
    );
  }

  return (
    <>
      {/* 가운데 Nav Links — md 이상에서만 표시 */}
      <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
        <a href="/ledger" className="hover:text-gray-900 whitespace-nowrap">{t.navLedger}</a>
        <a href="/card" className="hover:text-gray-900 whitespace-nowrap">{t.navCard}</a>
        <a href="/invest" className="hover:text-gray-900 whitespace-nowrap">{t.navInvest}</a>
        {process.env.NODE_ENV === 'development' && (
          <>
            <a href="/error-test" className="text-red-500 hover:text-red-700 whitespace-nowrap">{t.navErrorTest}</a>
            <a href="/not-found" className="hover:text-gray-900 whitespace-nowrap">{t.navNotFound}</a>
          </>
        )}
      </div>

      {/* 오른쪽 */}
      <div className="flex items-center gap-2 shrink-0">
        <LocaleSwitcher />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            {t.inquiryLink}
          </Link>
          <Link
            href="/auth/signup"
            className="cursor-pointer text-sm font-medium text-white bg-brand-dark hover:bg-brand-darker whitespace-nowrap px-3 py-1.5 rounded-lg"
          >
            {t.signupLink}
          </Link>
        </div>
      </div>
    </>
  );
}

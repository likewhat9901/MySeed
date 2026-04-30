"use client";

// ─── components/header/UserDropdown.tsx ───────────────────────────────────────
// 헤더 우상단 유저 아바타 버튼 + 드롭다운 메뉴.
//
// 포함 항목:
//   - 유저 이름 + 이메일 (상단)
//   - Account Settings / Preferences 링크
//   - 로그아웃 버튼
//
// 아바타: full_name의 첫 글자 → email 앞부분 첫 글자 순으로 fallback

import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { Settings, UserCog, LogOut } from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useAuth } from "@/features/auth/useAuth";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { userDropdownMessages } from "@/lib/i18n/headerMessages";

export default function UserDropdown() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const t = userDropdownMessages[locale];
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, open, close);

  // 표시 이름: user_metadata의 full_name → email 앞부분 순으로 fallback
  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "사용자";

  const displayEmail = user?.email ?? "";

  // 아바타 첫 글자
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-xs font-medium cursor-pointer shrink-0 hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label="사용자 메뉴"
        aria-expanded={open}
      >
        {avatarLetter}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
          {/* 사용자 정보 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{displayEmail}</p>
          </div>

          {/* 메뉴 항목 */}
          <div className="py-1">
            <Link
              href="/profile/mypage"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <UserCog className="size-4 text-gray-500" />
              {t.accountSettings}
            </Link>
            <Link
              href="/profile/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Settings className="size-4 text-gray-500" />
              {t.preferences}
            </Link>
          </div>

          {/* 로그아웃 */}
          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="size-4" />
              {t.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

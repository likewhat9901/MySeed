"use client";

import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { Settings, UserCog, LogOut } from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useAuth } from "@/features/auth/AuthContext";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { userDropdownMessages } from "@/lib/i18n/messages/headerMessages";

export default function UserDropdown() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const t = userDropdownMessages[locale];
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, open, close);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "사용자";

  const displayEmail = user?.email ?? "";
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
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{displayEmail}</p>
          </div>

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

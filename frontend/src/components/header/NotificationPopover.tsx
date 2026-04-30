"use client";

// ─── components/header/NotificationPopover.tsx ────────────────────────────────
// 헤더 알림 팝오버 (종 아이콘 클릭 시 열림).
//
// 구성:
//   - NOTIFICATIONS: 더미 데이터 (현재 실제 알림 API 미연결)
//   - 읽음/안읽음 상태 관리: markRead / markAllRead
//   - 알림 타입별 색상 점(TYPE_DOT): info=파랑, alert=빨강, success=초록
//   - 다국어 지원: headerMessages.ts의 notificationMessages 사용

import { useRef, useState, useCallback } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { notificationMessages, type NotificationMessages } from "@/lib/i18n/headerMessages";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type NotifType = "info" | "alert" | "success";

interface Notification {
  id: string;
  type: NotifType;
  titleKey: keyof NotificationMessages;
  bodyKey: keyof NotificationMessages;
  timeKey: keyof NotificationMessages;
  read: boolean;
}

const NOTIFICATIONS: Notification[] = [
  { id: "1", type: "alert",   titleKey: "notif1Title", bodyKey: "notif1Body", timeKey: "timeAgo5min",  read: false },
  { id: "2", type: "success", titleKey: "notif2Title", bodyKey: "notif2Body", timeKey: "timeAgo2hrs",  read: false },
  { id: "3", type: "info",    titleKey: "notif3Title", bodyKey: "notif3Body", timeKey: "timeAgo1day",  read: true  },
];

const TYPE_DOT: Record<NotifType, string> = {
  alert:   "bg-red-400",
  success: "bg-emerald-400",
  info:    "bg-blue-400",
};

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);
  const { locale } = useLocale();
  const t = notificationMessages[locale];
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, open, close);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 shrink-0 cursor-pointer"
        aria-label={t.notifications}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{t.notifications}</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                {t.markAllRead}
              </button>
            )}
          </div>

          {/* 목록 */}
          <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? "opacity-60" : ""}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[n.type]} ${n.read ? "opacity-0" : ""}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{t[n.titleKey]}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{t[n.bodyKey]}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{t[n.timeKey]}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* 푸터 */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button
              type="button"
              className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer w-full text-center"
            >
              {t.viewAll}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

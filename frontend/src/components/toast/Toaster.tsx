"use client";

// ─── components/toast/Toaster.tsx ─────────────────────────────────────────────
// 토스트 알림을 실제로 렌더링하는 표시 컴포넌트.
// ToastContext(Provider)에서 toasts 배열과 onDismiss 핸들러를 받아 화면 상단 중앙에 쌓아 표시.
// 변형(variant)별 색상과 아이콘을 VARIANT_STYLES / VARIANT_ICON 맵으로 관리.

import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { ToastItem } from "@/lib/toast/ToastContext";

const VARIANT_STYLES: Record<ToastItem["variant"], string> = {
  info:    "bg-gray-900 text-white",
  warning: "bg-amber-500 text-white",
  success: "bg-emerald-500 text-white",
  error:   "bg-red-500 text-white",
};

const VARIANT_ICON: Record<ToastItem["variant"], React.ReactNode> = {
  info:    <Info className="size-4 shrink-0" />,
  warning: <AlertTriangle className="size-4 shrink-0" />,
  success: <CheckCircle className="size-4 shrink-0" />,
  error:   <AlertTriangle className="size-4 shrink-0" />,
};

interface ToasterProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function Toaster({ toasts, onDismiss }: ToasterProps) {
  return (
    <div
      aria-live="polite"
      className="fixed top-[72px] left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto
            animate-in fade-in slide-in-from-top-2 duration-200
            ${VARIANT_STYLES[t.variant]}`}
        >
          {VARIANT_ICON[t.variant]}
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="ml-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="닫기"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

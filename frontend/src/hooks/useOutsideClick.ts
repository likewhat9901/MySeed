'use client'

// ─── hooks/useOutsideClick.ts ─────────────────────────────────────────────────
// 특정 요소(ref) 바깥 클릭 감지 공용 훅.
// enabled가 false이면 리스너를 등록하지 않음 (메뉴가 닫힌 상태에서는 비용 없음).
// LedgerCard / LedgerRow / UserDropdown / NotificationPopover 등에서 사용.

import { useEffect, type RefObject } from 'react'

export function useOutsideClick<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, enabled, onOutside])
}

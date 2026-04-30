'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCurrentUser } from '@/features/auth/api'
import { getOrCreateLedger } from '@/features/ledger/api'
import { getCanvasWidgets, saveCanvasWidgets } from '@/features/editor/api'
import type { WidgetItem } from '@/features/editor/types'

// ─── useCanvasPersist ─────────────────────────────────────────────────────────
// ledger 로드/생성 + 위젯 수동 저장 React 훅.
// URL ?led=xxx 가 있으면 해당 ledger 로드, 없으면 최신 ledger 로드(없으면 생성).

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseCanvasPersistReturn {
  canvasId: string | null
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  saveCanvas: () => Promise<void>
  initialWidgets: WidgetItem[] | null  // null이면 로딩 중, []이면 빈 캔버스
}

export function useCanvasPersist(widgetsRef: React.RefObject<WidgetItem[]>): UseCanvasPersistReturn {
  const searchParams = useSearchParams()
  const ledIdFromUrl = searchParams.get('led')  // 홈에서 선택한 ledger ID

  const [canvasId, setCanvasId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [initialWidgets, setInitialWidgets] = useState<WidgetItem[] | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언마운트 시 저장 상태 복원 타이머 정리
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  // ── URL ?led 변경 시: initialWidgets를 null로 리셋 → useWidgets가 전환 감지 ──
  useEffect(() => {
    setInitialWidgets(null)
  }, [ledIdFromUrl])

  // ── 마운트 시: URL ?led 가 있으면 해당 ledger, 없으면 최신 ledger (없으면 생성) ──
  useEffect(() => {
    let cancelled = false

    async function loadLedger() {
      let ledId = ledIdFromUrl

      if (!ledId) {
        // ?led 없음 → 유저의 최신 ledger 로드 (없으면 생성)
        const user = await getCurrentUser()
        if (!user || cancelled) return

        const ledger = await getOrCreateLedger(user.id)
        if (!ledger || cancelled) return

        ledId = ledger.led_id
      }

      const widgets = await getCanvasWidgets(ledId)
      if (cancelled) return

      setCanvasId(ledId)
      setInitialWidgets(widgets)
    }

    loadLedger()
    return () => { cancelled = true }
  }, [ledIdFromUrl])

  // ── 수동 저장 ──────────────────────────────────────────────────────────────
  const saveCanvas = useCallback(async () => {
    if (!canvasId) return

    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    setSaveStatus('saving')

    const success = await saveCanvasWidgets(canvasId, widgetsRef.current ?? [])

    setSaveStatus(success ? 'saved' : 'error')
    if (success) setLastSavedAt(new Date())

    statusTimerRef.current = setTimeout(
      () => setSaveStatus(s => s !== 'saving' ? 'idle' : s),
      2000
    )
  }, [canvasId, widgetsRef])

  return { canvasId, saveStatus, lastSavedAt, saveCanvas, initialWidgets }
}

'use client'

import { useCallback, useRef, useLayoutEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { WidgetItem } from '@/features/editor/types'

const MAX_HISTORY = 50

function cloneWidgets(w: WidgetItem[]): WidgetItem[] {
  return structuredClone(w)
}

// ─── useWidgetHistory ─────────────────────────────────────────────────────────
// 위젯 캔버스 스냅샷 기반 Undo / Redo.
// - commitBeforeChange: 논리적 변경 직전에 1회
// - undo / redo: past / future 스택으로 WidgetItem[] 복원

export function useWidgetHistory(
  widgets: WidgetItem[],
  setWidgets: Dispatch<SetStateAction<WidgetItem[]>>,
) {
  // useLayoutEffect로 동기화해 렌더 직후 즉시 최신값 반영
  const widgetsRef = useRef(widgets)
  useLayoutEffect(() => { widgetsRef.current = widgets }, [widgets])

  // 스택을 ref로 관리 — 연속 undo/redo 시 stale closure 방지
  const pastRef = useRef<WidgetItem[][]>([])
  const futureRef = useRef<WidgetItem[][]>([])

  // canUndo / canRedo는 UI 반영을 위해 state 유지
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  const commitBeforeChange = useCallback(() => {
    const next = [...pastRef.current, cloneWidgets(widgetsRef.current)]
    pastRef.current = next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
    futureRef.current = []
    syncFlags()
  }, [syncFlags])

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return
    const fromPast = pastRef.current[pastRef.current.length - 1]
    futureRef.current = [cloneWidgets(widgetsRef.current), ...futureRef.current]
    pastRef.current = pastRef.current.slice(0, -1)
    setWidgets(cloneWidgets(fromPast))
    // widgetsRef는 setWidgets 후 다음 렌더에서 layoutEffect로 갱신되므로
    // 연속 undo를 위해 ref를 즉시 업데이트
    widgetsRef.current = cloneWidgets(fromPast)
    syncFlags()
  }, [setWidgets, syncFlags])

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return
    const fromFuture = futureRef.current[0]
    pastRef.current = [...pastRef.current, cloneWidgets(widgetsRef.current)]
    futureRef.current = futureRef.current.slice(1)
    setWidgets(cloneWidgets(fromFuture))
    widgetsRef.current = cloneWidgets(fromFuture)
    syncFlags()
  }, [setWidgets, syncFlags])

  const reset = useCallback(() => {
    pastRef.current = []
    futureRef.current = []
    syncFlags()
  }, [syncFlags])

  return {
    commitBeforeChange,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  }
}

'use client'

import { createContext, useContext, useCallback, useRef, useEffect } from 'react'
import { useViewportState, type ViewportState } from '../_hooks/useViewportState'
import { useWidgetState, type WidgetState, type WidgetStateInternal } from '../_hooks/useWidgetState'
import { useUIState, type UIState } from '../_hooks/useUIState'
import { useCanvasPersist, type SaveStatus } from '../canvas/_hooks/useCanvasPersist'
import type { WidgetItem } from '@/features/editor/types'

export { CELL_SIZE } from '@/constants/editor'

// ─── Context 타입 ─────────────────────────────────────────────────────────────

interface PersistState {
  canvasId: string | null   // tb_ledger.led_id (외부 인터페이스명 유지)
  ledgerName: string | null
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  saveCanvas: () => Promise<void>
  saveAsNewLedger: (name: string) => Promise<string | null>
  isDirty: boolean
  markDirty: () => void
}

type EditorContextValue =
  ViewportState &
  WidgetState &
  Omit<UIState, 'setRightSidebarOpen'> &
  PersistState

const EditorContext = createContext<EditorContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
// 도메인 훅 4개(viewport / ui / widget / persist)를 조합합니다.

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const viewport = useViewportState()
  const ui = useUIState()

  // widgets의 최신값을 ref로 관리 — useCanvasPersist가 저장 시 읽습니다.
  const widgetsRef = useRef<WidgetItem[]>([])

  const { canvasId, ledgerName, saveStatus, lastSavedAt, saveCanvas, saveAsNewLedger, initialWidgets, isDirty, markDirty } =
    useCanvasPersist(widgetsRef)

  const widget: WidgetStateInternal = useWidgetState(
    viewport.viewport,
    viewport.canvasRef,
    initialWidgets,
    canvasId,
  )

  const isFirstWidgetLoad = useRef(true)

  // 장부 전환 시 첫 로드 플래그 리셋
  useEffect(() => {
    isFirstWidgetLoad.current = true
  }, [canvasId])

  // widget.widgets가 바뀔 때마다 ref 동기화 + dirty 마킹
  useEffect(() => {
    widgetsRef.current = widget.widgets
    if (isFirstWidgetLoad.current) {
      isFirstWidgetLoad.current = false
      return
    }
    markDirty()
  }, [widget.widgets, markDirty])

  // 더블클릭: 위젯 선택(widget) + 사이드바 열기(ui) 결합
  const onWidgetDoubleClick = useCallback((id: string) => {
    widget._onWidgetDoubleClick(id)
    ui.setRightSidebarOpen(true)
    ui.setRightActiveTab('properties')
  }, [widget, ui])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { setRightSidebarOpen: _set, ...uiPublic } = ui
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _onWidgetDoubleClick: _dbl, ...widgetPublic } = widget

  return (
    <EditorContext.Provider value={{
      ...viewport,
      ...widgetPublic,
      ...uiPublic,
      onWidgetDoubleClick,
      canvasId,
      ledgerName,
      saveStatus,
      lastSavedAt,
      saveCanvas,
      saveAsNewLedger,
      isDirty,
      markDirty,
    }}>
      {children}
    </EditorContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditorContext는 EditorProvider 하위에서 사용해야 합니다.')
  return ctx
}

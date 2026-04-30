'use client'

import { createContext, useContext, useCallback, useRef, useEffect } from 'react'
import { useViewportState, type ViewportState } from './useViewportState'
import { useWidgetState, type WidgetState, type WidgetStateInternal } from './useWidgetState'
import { useUIState, type UIState } from './useUIState'
import { useCanvasPersist, type SaveStatus } from '../_hooks/useCanvasPersist'
import type { WidgetItem } from '@/features/editor/types'

export { CELL_SIZE } from '../constants'

// ─── Context 타입 ─────────────────────────────────────────────────────────────

interface PersistState {
  canvasId: string | null   // tb_ledger.led_id (외부 인터페이스명 유지)
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  saveCanvas: () => Promise<void>
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

  const { canvasId, saveStatus, lastSavedAt, saveCanvas, initialWidgets } =
    useCanvasPersist(widgetsRef)

  const widget: WidgetStateInternal = useWidgetState(
    viewport.viewport,
    viewport.canvasRef,
    initialWidgets,
    canvasId,
  )

  // widget.widgets가 바뀔 때마다 ref 동기화
  useEffect(() => {
    widgetsRef.current = widget.widgets
  }, [widget.widgets])

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
      saveStatus,
      lastSavedAt,
      saveCanvas,
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

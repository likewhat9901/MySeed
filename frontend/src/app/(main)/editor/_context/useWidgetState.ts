'use client'

import { useState, useCallback, useRef, useEffect, useLayoutEffect, type PointerEvent, type RefObject } from 'react'
import { WidgetItem, WidgetType, ResizeHandle, PendingWidget, WidgetDataBinding } from '@/features/editor/types'
import { useWidgets } from '../canvas/_hooks/useWidgets'
import { useDragWidget } from '../canvas/_hooks/useDragWidget'
import { useResizeWidget } from '../canvas/_hooks/useResizeWidget'
import { useWidgetHistory } from '../canvas/_hooks/useWidgetHistory'
import { type Viewport } from '../canvas/_hooks/useEditorViewport'
import { CELL_SIZE } from '../constants'

// ─── useWidgetState ───────────────────────────────────────────────────────────
// 위젯 목록·선택·고스트·드래그·리사이즈·Undo/Redo 를 관리합니다.
// EditorProvider 내부에서만 호출합니다.

/** Context 밖으로 공개되는 위젯 상태 타입 */
export interface WidgetState {
  widgets: WidgetItem[]
  setWidgets: React.Dispatch<React.SetStateAction<WidgetItem[]>>
  pendingWidget: PendingWidget | null
  selectedWidgetId: string | null
  draggingCollidingId: string | null
  addWidget: (type: WidgetType) => void
  removeWidget: (id: string) => void
  updateWidget: (id: string, patch: Partial<WidgetItem>) => void
  updateWidgetData: (id: string, binding: WidgetDataBinding) => void
  commitBeforeWidgetEdit: () => void
  onWidgetDoubleClick: (id: string) => void
  onCloseInspector: () => void
  onUpdateInspector: (patch: Partial<WidgetItem>) => void
  onGhostMove: (mouseX: number, mouseY: number) => void
  onGhostPlace: () => void
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onPointerUp: () => void
  onWidgetPointerDown: (e: PointerEvent<Element>, id: string) => void
  onResizeStart: (e: PointerEvent<Element>, id: string, handle: ResizeHandle) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

/** EditorProvider 내부에서만 사용하는 확장 타입. */
export interface WidgetStateInternal extends WidgetState {
  _onWidgetDoubleClick: (id: string) => void
}

export function useWidgetState(
  viewport: Viewport,
  canvasRef: RefObject<HTMLDivElement | null>,
  initialWidgets: WidgetItem[] | null = [],
  /** ledger 전환 시 히스토리 스택 비우기 */
  canvasId: string | null = null,
): WidgetStateInternal {
  const [draggingCollidingId, setDraggingCollidingId] = useState<string | null>(null)
  const commitRef = useRef<() => void>(() => {})

  const {
    widgets,
    setWidgets,
    widgetsRef,
    pendingWidget,
    selectedWidgetId,
    addWidget,
    removeWidget,
    updateWidget,
    updateWidgetData,
    onWidgetDoubleClick: _onWidgetDoubleClick,
    onCloseInspector,
    onUpdateInspector,
    onGhostMove,
    onGhostPlace,
  } = useWidgets(
    viewport, canvasRef, CELL_SIZE, initialWidgets,
    () => { commitRef.current() },
  )

  const { commitBeforeChange, undo, redo, reset: resetHistory, canUndo, canRedo } = useWidgetHistory(
    widgets, setWidgets,
  )
  useLayoutEffect(() => {
    commitRef.current = commitBeforeChange
  }, [commitBeforeChange])

  useEffect(() => {
    resetHistory()
  }, [canvasId, resetHistory])

  const { onWidgetPointerDown, dragOnPointerMove, dragOnPointerUp } = useDragWidget(
    widgetsRef,
    viewport.scale,
    setWidgets,
    setDraggingCollidingId,
    CELL_SIZE,
    commitBeforeChange,
  )

  const { onResizeStart, resizeOnPointerMove, resizeOnPointerUp } = useResizeWidget(
    widgetsRef,
    viewport.scale,
    setWidgets,
    setDraggingCollidingId,
    CELL_SIZE,
    commitBeforeChange,
  )

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    dragOnPointerMove(e)
    resizeOnPointerMove(e)
  }, [dragOnPointerMove, resizeOnPointerMove])

  const onPointerUp = useCallback(() => {
    dragOnPointerUp()
    resizeOnPointerUp()
    setDraggingCollidingId(null)
  }, [dragOnPointerUp, resizeOnPointerUp])

  return {
    widgets,
    setWidgets,
    pendingWidget,
    selectedWidgetId,
    draggingCollidingId,
    addWidget,
    removeWidget,
    updateWidget,
    updateWidgetData,
    commitBeforeWidgetEdit: commitBeforeChange,
    _onWidgetDoubleClick,
    onWidgetDoubleClick: _onWidgetDoubleClick,
    onCloseInspector,
    onUpdateInspector,
    onGhostMove,
    onGhostPlace,
    onPointerMove,
    onPointerUp,
    onWidgetPointerDown,
    onResizeStart,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}

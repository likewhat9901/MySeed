import { useRef, useCallback } from 'react'
import { WidgetItem } from '@/features/editor/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragState {
  widgetId: string
  startMouseX: number
  startMouseY: number
  startWidgetX: number
  startWidgetY: number
  isColliding: boolean
  /** true면 이번 제스처에서 이미 히스토리에 스냅샷 1회 기록됨 */
  historyCommitted: boolean
}

// ─── useDragWidget ────────────────────────────────────────────────────────────
// 위젯 드래그(이동) 전용 훅.
// - onWidgetPointerDown: 드래그 시작 시 시작 좌표를 dragRef에 저장
// - dragOnPointerMove: 마우스 이동량을 그리드 셀 단위로 변환해 위치 업데이트 + AABB 충돌 감지
// - dragOnPointerUp: 충돌 상태이면 원래 위치로 복원
//
// draggingCollidingId setter는 drag·resize가 공유하므로 Editor.tsx에서 주입.

export function useDragWidget(
  widgetsRef: React.MutableRefObject<WidgetItem[]>,
  scale: number,
  setWidgets: React.Dispatch<React.SetStateAction<WidgetItem[]>>,
  setDraggingCollidingId: React.Dispatch<React.SetStateAction<string | null>>,
  cellSize: number,
  /** 드래그 시작 직전 — useWidgetHistory.commitBeforeChange */
  commitBeforeDrag?: () => void,
) {
  const dragRef = useRef<DragState | null>(null)

  const onWidgetPointerDown = useCallback((e: React.PointerEvent, widgetId: string) => {
    e.preventDefault()
    const widget = widgetsRef.current.find(w => w.id === widgetId)
    if (!widget) return
    dragRef.current = {
      widgetId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startWidgetX: widget.x,
      startWidgetY: widget.y,
      isColliding: false,
      historyCommitted: false,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [widgetsRef])

  const dragOnPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    const drag = dragRef.current
    const { widgetId, startMouseX, startMouseY, startWidgetX, startWidgetY } = drag
    const dx = e.clientX - startMouseX
    const dy = e.clientY - startMouseY
    const newX = startWidgetX + Math.round(dx / (cellSize * scale))
    const newY = startWidgetY + Math.round(dy / (cellSize * scale))

    const current = widgetsRef.current
    const dragging = current.find(w => w.id === widgetId)
    if (!dragging) return

    const colliding = current.some(w =>
      w.id !== widgetId &&
      !(newX + dragging.w <= w.x || newX >= w.x + w.w || newY + dragging.h <= w.y || newY >= w.y + w.h)
    )
    drag.isColliding = colliding
    setDraggingCollidingId(colliding ? widgetId : null)

    // 그리드 위치가 드래그 시작과 달라지는 첫 프레임에만 히스토리(이동 전 스냅샷) 기록
    if (!drag.historyCommitted && (newX !== drag.startWidgetX || newY !== drag.startWidgetY)) {
      commitBeforeDrag?.()
      drag.historyCommitted = true
    }

    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, x: newX, y: newY } : w))
  }, [widgetsRef, scale, cellSize, setWidgets, setDraggingCollidingId, commitBeforeDrag])

  const dragOnPointerUp = useCallback(() => {
    if (dragRef.current?.isColliding) {
      const { widgetId, startWidgetX, startWidgetY } = dragRef.current
      setWidgets(prev => prev.map(w =>
        w.id === widgetId ? { ...w, x: startWidgetX, y: startWidgetY } : w
      ))
    }
    dragRef.current = null
  }, [setWidgets])

  return { dragRef, onWidgetPointerDown, dragOnPointerMove, dragOnPointerUp }
}

import { useRef, useCallback } from 'react'
import { WidgetItem, ResizeHandle } from '@/features/editor/types'
import { getWidgetMeta } from '@/app/(main)/editor/_widgets/registry'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResizeState {
  widgetId: string
  handle: ResizeHandle
  startMouseX: number
  startMouseY: number
  startX: number
  startY: number
  startW: number
  startH: number
  isColliding: boolean
  /** true면 이번 제스처에서 이미 히스토리에 스냅샷 1회 기록됨 */
  historyCommitted: boolean
}

// ─── useResizeWidget ──────────────────────────────────────────────────────────
// 위젯 리사이즈 전용 훅.
// - onResizeStart: 핸들 방향과 시작 좌표·크기를 resizeRef에 저장
// - resizeOnPointerMove: 핸들 방향(n/s/e/w/ne 등)에 따라 x/y/w/h 계산 + AABB 충돌 감지
// - resizeOnPointerUp: 충돌 상태이면 원래 크기·위치로 복원
//
// draggingCollidingId setter는 drag·resize가 공유하므로 Editor.tsx에서 주입.

export function useResizeWidget(
  widgetsRef: React.MutableRefObject<WidgetItem[]>,
  scale: number,
  setWidgets: React.Dispatch<React.SetStateAction<WidgetItem[]>>,
  setDraggingCollidingId: React.Dispatch<React.SetStateAction<string | null>>,
  cellSize: number,
  /** 리사이즈 시작 직전 — useWidgetHistory.commitBeforeChange */
  commitBeforeResize?: () => void,
) {
  const resizeRef = useRef<ResizeState | null>(null)

  const onResizeStart = useCallback((e: React.PointerEvent, widgetId: string, handle: ResizeHandle) => {
    e.preventDefault()
    e.stopPropagation()
    const widget = widgetsRef.current.find(w => w.id === widgetId)
    if (!widget) return
    resizeRef.current = {
      widgetId,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: widget.x,
      startY: widget.y,
      startW: widget.w,
      startH: widget.h,
      isColliding: false,
      historyCommitted: false,
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [widgetsRef])

  const resizeOnPointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return
    const resize = resizeRef.current
    const { widgetId, handle, startMouseX, startMouseY, startX, startY, startW, startH } = resize
    const cellPx = cellSize * scale
    const dx = Math.round((e.clientX - startMouseX) / cellPx)
    const dy = Math.round((e.clientY - startMouseY) / cellPx)

    const widget = widgetsRef.current.find(w => w.id === widgetId)
    const meta = widget ? getWidgetMeta(widget.type) : undefined
    const minW = meta?.minW ?? 2
    const minH = meta?.minH ?? 2

    let newX = startX, newY = startY, newW = startW, newH = startH

    // 동(e): 너비 증가 / 서(w): 너비 증가하며 x 이동
    if (handle.includes('e')) newW = Math.max(minW, startW + dx)
    if (handle.includes('w')) { newW = Math.max(minW, startW - dx); newX = startX + (startW - newW) }
    // 남(s): 높이 증가 / 북(n): 높이 증가하며 y 이동
    if (handle.includes('s')) newH = Math.max(minH, startH + dy)
    if (handle.includes('n')) { newH = Math.max(minH, startH - dy); newY = startY + (startH - newH) }

    const current = widgetsRef.current
    const colliding = current.some(w =>
      w.id !== widgetId &&
      !(newX + newW <= w.x || newX >= w.x + w.w || newY + newH <= w.y || newY >= w.y + w.h)
    )
    resize.isColliding = colliding
    setDraggingCollidingId(colliding ? widgetId : null)

    if (
      !resize.historyCommitted &&
      (newX !== startX || newY !== startY || newW !== startW || newH !== startH)
    ) {
      commitBeforeResize?.()
      resize.historyCommitted = true
    }

    setWidgets(prev => prev.map(w =>
      w.id === widgetId ? { ...w, x: newX, y: newY, w: newW, h: newH } : w
    ))
  }, [widgetsRef, scale, cellSize, setWidgets, setDraggingCollidingId, commitBeforeResize])

  const resizeOnPointerUp = useCallback(() => {
    if (resizeRef.current?.isColliding) {
      const { widgetId, startX, startY, startW, startH } = resizeRef.current
      setWidgets(prev => prev.map(w =>
        w.id === widgetId ? { ...w, x: startX, y: startY, w: startW, h: startH } : w
      ))
    }
    resizeRef.current = null
  }, [setWidgets])

  return { resizeRef, onResizeStart, resizeOnPointerMove, resizeOnPointerUp }
}

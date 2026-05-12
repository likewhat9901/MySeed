'use client'

import { useRef, type RefObject, type PointerEvent, type WheelEvent } from 'react'
import { useEditorViewport, type Viewport } from '../canvas/_hooks/useEditorViewport'

// ─── useViewportState ─────────────────────────────────────────────────────────
// 캔버스 ref, 줌·패닝 상태와 핸들러를 관리합니다.
// EditorProvider 내부에서만 호출합니다.

export interface ViewportState {
  canvasRef: RefObject<HTMLDivElement | null>
  viewport: Viewport
  isPanning: boolean
  zoomCursor: 'zoom-in' | 'zoom-out' | null
  onWheel: (e: WheelEvent<HTMLDivElement>) => void
  onCanvasPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onCanvasPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  onCanvasPointerUp: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomTo: (scale: number) => void
}

export function useViewportState(): ViewportState {
  const canvasRef = useRef<HTMLDivElement>(null)

  const {
    viewport,
    isPanning,
    zoomCursor,
    onWheel,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onZoomIn,
    onZoomOut,
    onZoomTo,
  } = useEditorViewport(canvasRef)

  return {
    canvasRef,
    viewport,
    isPanning,
    zoomCursor,
    onWheel,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onZoomIn,
    onZoomOut,
    onZoomTo,
  }
}

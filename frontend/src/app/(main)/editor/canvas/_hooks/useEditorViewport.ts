import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Viewport {
  scale: number
  panX: number
  panY: number
}

// ─── useEditorViewport ────────────────────────────────────────────────────────
// 뷰포트(줌·패닝) 전용 훅.
// - 휠 줌: 마우스 위치 고정 확대/축소
// - 버튼 줌: onZoomIn / onZoomOut / onZoomTo (화면 중앙 기준)
// - 패닝: 휠버튼 드래그 (button=1)
// - 초기 중앙 배치: 마운트 시 canvasRef 크기 기준

export function useEditorViewport(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, panX: 0, panY: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [zoomCursor, setZoomCursor] = useState<'zoom-in' | 'zoom-out' | null>(null)

  // viewport state의 동기 복사본 — 마우스 이벤트 핸들러에서 최신값을 즉시 읽을 때 사용
  const viewportRef = useRef<Viewport>({ scale: 1, panX: 0, panY: 0 })
  // 패닝 시작 좌표 (휠버튼 down 시 저장, up 시 null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)
  // 줌 커서 자동 복원 타이머
  const zoomCursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // setViewport + viewportRef를 항상 함께 갱신하는 헬퍼
  const updateViewport = useCallback((updater: (prev: Viewport) => Viewport) => {
    setViewport(prev => {
      const next = updater(prev)
      viewportRef.current = next
      return next
    })
  }, [])

  // 첫 마운트 시 캔버스 크기 기준으로 그리드를 화면 중앙에 배치
  useEffect(() => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    updateViewport(prev => ({ ...prev, panX: rect.width / 2 - 400, panY: rect.height / 2 - 300 }))
  }, [canvasRef, updateViewport])

  // 언마운트 시 줌 커서 타이머 정리
  useEffect(() => {
    return () => {
      if (zoomCursorTimerRef.current) clearTimeout(zoomCursorTimerRef.current)
    }
  }, [])

  // 일반 휠의 페이지 스크롤 방지 (passive: false 필수)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey) return
      e.preventDefault()
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [canvasRef])

  // 휠 줌: 마우스 위치 기준으로 확대/축소, Ctrl+휠은 브라우저 기본 동작에 위임
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = -e.deltaY * 0.001
    updateViewport(prev => {
      const next = Math.min(3, Math.max(0.1, prev.scale + delta * prev.scale))
      const ratio = next / prev.scale
      return {
        scale: next,
        panX: mouseX - ratio * (mouseX - prev.panX),
        panY: mouseY - ratio * (mouseY - prev.panY),
      }
    })
    setZoomCursor(e.deltaY < 0 ? 'zoom-in' : 'zoom-out')
    if (zoomCursorTimerRef.current) clearTimeout(zoomCursorTimerRef.current)
    zoomCursorTimerRef.current = setTimeout(() => setZoomCursor(null), 100)
  }, [canvasRef, updateViewport])

  // 패닝: 휠버튼(button=1) 드래그로 캔버스 이동
  const onCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 1) return
    e.preventDefault()
    const { panX: px, panY: py } = viewportRef.current
    panStartRef.current = { x: e.clientX - px, y: e.clientY - py }
    ;(e.target as Element).setPointerCapture(e.pointerId)
    setIsPanning(true)
    document.body.style.cursor = 'grabbing'
  }, [])

  const onCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!panStartRef.current) return
    const snap = panStartRef.current
    updateViewport(prev => ({
      ...prev,
      panX: e.clientX - snap.x,
      panY: e.clientY - snap.y,
    }))
  }, [updateViewport])

  const onCanvasPointerUp = useCallback(() => {
    panStartRef.current = null
    setIsPanning(false)
    document.body.style.cursor = ''
  }, [])

  // 버튼 줌: 화면 중앙 기준 25% 단위 확대
  const onZoomIn = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.width / 2
    const cy = rect.height / 2
    updateViewport(prev => {
      const next = Math.min(3, prev.scale * 1.25)
      const ratio = next / prev.scale
      return { scale: next, panX: cx - ratio * (cx - prev.panX), panY: cy - ratio * (cy - prev.panY) }
    })
  }, [canvasRef, updateViewport])

  // 버튼 줌: 화면 중앙 기준 25% 단위 축소
  const onZoomOut = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.width / 2
    const cy = rect.height / 2
    updateViewport(prev => {
      const next = Math.max(0.1, prev.scale / 1.25)
      const ratio = next / prev.scale
      return { scale: next, panX: cx - ratio * (cx - prev.panX), panY: cy - ratio * (cy - prev.panY) }
    })
  }, [canvasRef, updateViewport])

  // 직접 배율 지정 (ZoomControl에서 % 입력 시 호출)
  const onZoomTo = useCallback((next: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.width / 2
    const cy = rect.height / 2
    updateViewport(prev => {
      const ratio = next / prev.scale
      return { scale: next, panX: cx - ratio * (cx - prev.panX), panY: cy - ratio * (cy - prev.panY) }
    })
  }, [canvasRef, updateViewport])

  return {
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

import { useState, useRef, useEffect, useCallback } from 'react'
import { WidgetItem, WidgetType, PendingWidget, DEFAULT_WIDGET_STYLE, WidgetDataBinding } from '@/features/editor/types'
import { getWidgetMeta, getDefaultBinding } from '@/app/(main)/editor/_widgets/registry'
import { Viewport } from './useEditorViewport'

// ─── useWidgets ───────────────────────────────────────────────────────────────
// 위젯 목록·선택·고스트 배치 전용 훅.
// - widgets: 캔버스에 배치된 위젯 목록 (CRUD)
// - widgetsRef: 마우스 이벤트 핸들러에서 리렌더 없이 최신값을 읽기 위한 동기 복사본
// - addWidget: BottomToolbar에서 타입 선택 시 고스트 모드 진입
// - removeWidget / updateWidget: 삭제·속성 수정
// - pendingWidget: 고스트 배치 대기 상태
// - onGhostMove / onGhostPlace: 고스트 이동·확정
// - selectedWidgetId: 더블클릭으로 RightSidebar 열기/닫기

export function useWidgets(
  viewport: Viewport,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  cellSize: number,
  initialWidgets: WidgetItem[] | null = [],
  /** 논리적 변경 직전(삭제/속성 변경/고스트 배치)에 1회 — useWidgetHistory.commitBeforeChange */
  commitBeforeChange?: () => void,
) {
  const [widgets, setWidgets] = useState<WidgetItem[]>(initialWidgets ?? [])
  const [pendingWidget, setPendingWidget] = useState<PendingWidget | null>(null)
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)

  // widgets state의 동기 복사본 — drag/resize 훅에 ref로 전달해 콜백 재생성 최소화
  const widgetsRef = useRef<WidgetItem[]>([])
  useEffect(() => {
    widgetsRef.current = widgets
  }, [widgets])

  // DB에서 위젯이 로드되면 캔버스에 반영.
  // null → 로딩 중 (ledger 전환 포함), [] → 빈 캔버스, [...] → 실제 위젯
  const initializedRef = useRef(false)
  useEffect(() => {
    // null이면 ledger 전환 중 — 초기화 플래그 리셋해서 다음 로드를 받을 준비
    if (initialWidgets === null) {
      initializedRef.current = false
      return
    }
    if (initializedRef.current) return
    initializedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidgets(initialWidgets)
  }, [initialWidgets])

  const { scale, panX, panY } = viewport

  /** 속성 패널 연속 조작(슬라이더 등)을 한 undo 스텝으로 묶기 — 세션 끊김(400ms idle)마다 다시 1회 커밋 */
  const propertyEditSessionEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearPropertySessionTimer = useCallback(() => {
    if (propertyEditSessionEndTimer.current) {
      clearTimeout(propertyEditSessionEndTimer.current)
      propertyEditSessionEndTimer.current = null
    }
  }, [])
  useEffect(() => () => clearPropertySessionTimer(), [clearPropertySessionTimer])

  // 위젯 삭제 (선택 상태도 함께 해제)
  const removeWidget = useCallback((id: string) => {
    commitBeforeChange?.()
    setWidgets(prev => prev.filter(w => w.id !== id))
    setSelectedWidgetId(prev => prev === id ? null : prev)
  }, [commitBeforeChange])

  // data_binding 직접 교체 — undo 스텝 없이 즉시 반영 (위젯 내 타이핑 중 호출)
  // commitBeforeChange는 위젯 컴포넌트가 blur/저장 시 직접 호출해야 함
  const updateWidgetData = useCallback((id: string, binding: WidgetDataBinding) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, data_binding: binding } : w))
  }, [])

  // 위젯 속성 부분 업데이트 (RightSidebar에서 호출) — 400ms 내 연속 호출은 undo 스텝 1회만
  const updateWidget = useCallback((id: string, patch: Partial<WidgetItem>) => {
    if (!propertyEditSessionEndTimer.current) {
      commitBeforeChange?.()
    } else {
      clearTimeout(propertyEditSessionEndTimer.current)
    }
    propertyEditSessionEndTimer.current = setTimeout(() => {
      propertyEditSessionEndTimer.current = null
    }, 400)
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w))
  }, [commitBeforeChange])

  // 위젯 더블클릭 → RightSidebar 열기
  const onWidgetDoubleClick = useCallback((id: string) => {
    setSelectedWidgetId(id)
  }, [])

  // RightSidebar 닫기
  const onCloseInspector = useCallback(() => setSelectedWidgetId(null), [])

  // RightSidebar 속성 업데이트 콜백
  const onUpdateInspector = useCallback(
    (patch: Partial<WidgetItem>) => {
      if (selectedWidgetId) updateWidget(selectedWidgetId, patch)
    },
    [updateWidget, selectedWidgetId]
  )

  // 위젯 추가: BottomToolbar에서 타입 선택 시 고스트 모드 진입
  const addWidget = useCallback((type: WidgetType) => {
    const meta = getWidgetMeta(type)
    setPendingWidget({
      type,
      w: meta?.defaultW ?? 6,
      h: meta?.defaultH ?? 6,
      ghostX: null,
      ghostY: null,
      isColliding: false,
    })
  }, [])

  // 고스트 이동: 마우스 픽셀 좌표 → 그리드 셀 좌표 변환 + 충돌 감지
  const onGhostMove = useCallback((mouseX: number, mouseY: number) => {
    if (!pendingWidget || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const gridX = Math.round((mouseX - rect.left - panX) / (cellSize * scale))
    const gridY = Math.round((mouseY - rect.top - panY) / (cellSize * scale))
    const gw = pendingWidget.w
    const gh = pendingWidget.h
    const isColliding = widgetsRef.current.some(w =>
      !(gridX + gw <= w.x || gridX >= w.x + w.w || gridY + gh <= w.y || gridY >= w.y + w.h)
    )
    setPendingWidget(prev => prev ? { ...prev, ghostX: gridX, ghostY: gridY, isColliding } : null)
  }, [pendingWidget, panX, panY, scale, cellSize, canvasRef])

  // 고스트 클릭 확정: 충돌 없으면 위젯 배치, 충돌 있으면 무시
  const onGhostPlace = useCallback(() => {
    if (!pendingWidget || pendingWidget.ghostX === null || pendingWidget.ghostY === null || pendingWidget.isColliding) return
    const gx = pendingWidget.ghostX
    const gy = pendingWidget.ghostY
    commitBeforeChange?.()
    setWidgets(prev => [...prev, {
      id: crypto.randomUUID(),
      type: pendingWidget.type,
      x: gx,
      y: gy,
      w: pendingWidget.w,
      h: pendingWidget.h,
      style: { ...DEFAULT_WIDGET_STYLE },
      data_binding: getDefaultBinding(pendingWidget.type),
    }])
    setPendingWidget(null)
  }, [pendingWidget, commitBeforeChange])

  // 고스트 모드 중 Escape 키로 취소
  useEffect(() => {
    if (!pendingWidget) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPendingWidget(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingWidget])

  return {
    widgets,
    setWidgets,
    widgetsRef,
    pendingWidget,
    selectedWidgetId,
    addWidget,
    removeWidget,
    updateWidget,
    updateWidgetData,
    onWidgetDoubleClick,
    onCloseInspector,
    onUpdateInspector,
    onGhostMove,
    onGhostPlace,
  }
}

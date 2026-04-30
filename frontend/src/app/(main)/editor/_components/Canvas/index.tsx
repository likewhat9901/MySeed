import { useEditorContext } from '../../_context/EditorContext'
import { CELL_SIZE } from '../../constants'
import { BRAND_COLORS } from '@/features/editor/types'
import { calcGridBackground } from '../../_utils/canvasGrid'
import WidgetWrapper from './WidgetWrapper'
import ZoomControl from './ZoomControl'
import { UndoRedo, GridToggle } from './CanvasOverlay'

// ─── Canvas ───────────────────────────────────────────────────────────────────
// 캔버스 레이아웃. EditorContext에서 상태·핸들러를 직접 읽어 렌더링.

export default function Canvas() {
  const {
    widgets,
    viewport: { scale, panX, panY },
    canvasRef,
    onWheel,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onPointerMove,
    onPointerUp,
    onWidgetPointerDown: onPointerDown,
    undo,
    redo,
    canUndo,
    canRedo,
    onZoomIn,
    onZoomOut,
    onZoomTo,
    removeWidget: onRemoveWidget,
    onWidgetDoubleClick: onDoubleClick,
    onResizeStart,
    isPanning,
    pendingWidget,
    onGhostMove,
    onGhostPlace,
    draggingCollidingId,
    showGrid,
    onToggleGrid,
    zoomCursor,
  } = useEditorContext()

  const cellSize = CELL_SIZE
  const { rpx, rpy, gridCell, bgOffsetX, bgOffsetY } = calcGridBackground(panX, panY, cellSize, scale)

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-hidden relative"
      onWheel={onWheel}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={e => {
        onCanvasPointerMove(e)
        onPointerMove(e)
        if (pendingWidget) onGhostMove(e.clientX, e.clientY)
      }}
      onPointerUp={() => { onCanvasPointerUp(); onPointerUp() }}
      onPointerLeave={() => { onCanvasPointerUp(); onPointerUp() }}
      onClick={() => { if (pendingWidget) onGhostPlace() }}
      style={{
        cursor: isPanning ? 'grabbing' : zoomCursor ?? (pendingWidget ? 'crosshair' : 'default'),
        backgroundColor: '#f3f4f6',
        backgroundImage: showGrid ? `
          linear-gradient(to right, #d1d5db 1px, transparent 1px),
          linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
        ` : 'none',
        backgroundSize: `${gridCell}px ${gridCell}px`,
        backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
      }}
    >
      {/* 위젯 레이어 */}
      <div
        style={{
          transform: `translate(${rpx}px, ${rpy}px) scale(${scale})`,
          transformOrigin: '0 0',
          width: 99999,
          height: 99999,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {widgets.map(widget => (
          <WidgetWrapper
            key={widget.id}
            widget={widget}
            cellSize={cellSize}
            onPointerDown={onPointerDown}
            onRemove={onRemoveWidget}
            onDoubleClick={onDoubleClick}
            onResizeStart={onResizeStart}
            isColliding={draggingCollidingId === widget.id}
          />
        ))}

        {/* 고스트 위젯: 위젯 배치 전 미리보기 */}
        {pendingWidget && pendingWidget.ghostX !== null && pendingWidget.ghostY !== null && (() => {
          const ok = !pendingWidget.isColliding
          return (
            <div
              style={{
                position: 'absolute',
                left: pendingWidget.ghostX * cellSize,
                top: pendingWidget.ghostY * cellSize,
                width: pendingWidget.w * cellSize,
                height: pendingWidget.h * cellSize,
                borderRadius: 12,
                border: `2px dashed ${ok ? BRAND_COLORS.light : '#dc2626'}`,
                backgroundColor: ok ? 'rgba(22, 163, 74, 0.10)' : 'rgba(220, 38, 38, 0.10)',
                pointerEvents: 'none',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: ok ? BRAND_COLORS.light : '#dc2626', fontWeight: 600, opacity: 0.8 }}>
                {ok ? '클릭하여 배치' : '배치 불가'}
              </span>
            </div>
          )
        })()}
      </div>

      {/* 좌상단 오버레이: Undo/Redo + 그리드 토글 */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 pointer-events-auto">
        <UndoRedo onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} />
        <GridToggle showGrid={showGrid} onToggle={onToggleGrid} />
      </div>

      {/* 우상단 오버레이: 줌 컨트롤 */}
      <ZoomControl scale={scale} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onZoomTo={onZoomTo} />
    </div>
  )
}

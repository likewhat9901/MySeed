import { PointerEvent, useState, useRef, useEffect, memo } from 'react'
import { WidgetItem, ResizeHandle, WidgetDataBinding } from '@/features/editor/types'
import { getWidgetMeta } from '../../_widgets/registry'
import { useEditorContext } from '../../../_context/EditorContext'
import { CELL_SIZE } from '../../../constants'

// ─── 8방향 리사이즈 핸들 정의 ────────────────────────────────────────────────

const RESIZE_HANDLES: { handle: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
  { handle: 'n',  cursor: 'n-resize',  style: { top: -4, left: '25%', right: '25%', height: 8 } },
  { handle: 's',  cursor: 's-resize',  style: { bottom: -4, left: '25%', right: '25%', height: 8 } },
  { handle: 'w',  cursor: 'w-resize',  style: { left: -4, top: '25%', bottom: '25%', width: 8 } },
  { handle: 'e',  cursor: 'e-resize',  style: { right: -4, top: '25%', bottom: '25%', width: 8 } },
  { handle: 'nw', cursor: 'nw-resize', style: { top: -4, left: -4, width: 12, height: 12 } },
  { handle: 'ne', cursor: 'ne-resize', style: { top: -4, right: -4, width: 12, height: 12 } },
  { handle: 'sw', cursor: 'sw-resize', style: { bottom: -4, left: -4, width: 12, height: 12 } },
  { handle: 'se', cursor: 'se-resize', style: { bottom: -4, right: -4, width: 12, height: 12 } },
]

// ─── WidgetWrapper ────────────────────────────────────────────────────────────
// 개별 위젯을 그리드 좌표 기준으로 절대 위치에 렌더링.
// memo로 감싸 props가 바뀐 위젯만 리렌더되도록 최적화.

interface WidgetWrapperProps {
  widget: WidgetItem
  onPointerDown: (e: PointerEvent<Element>, id: string) => void
  onRemove: (id: string) => void
  onDoubleClick: (id: string) => void
  onResizeStart: (e: PointerEvent<Element>, id: string, handle: ResizeHandle) => void
  isColliding: boolean
}

const WidgetWrapper = memo(function WidgetWrapper({
  widget,
  onPointerDown,
  onRemove,
  onDoubleClick,
  onResizeStart,
  isColliding,
}: WidgetWrapperProps) {
  const { borderRadius, dropShadow } = widget.style
  const { isEditMode } = useEditorContext()
  const [isDragging, setIsDragging] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    }
  }, [])

  function handlePointerDown(e: PointerEvent<Element>) {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return
    setIsDragging(true)
    onPointerDown(e, widget.id)
  }

  function handlePointerUp() {
    setIsDragging(false)
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation()
    setIsPressed(true)
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)
    pressTimerRef.current = setTimeout(() => setIsPressed(false), 180)
    onDoubleClick(widget.id)
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: (widget.x ?? 0) * CELL_SIZE,
        top: (widget.y ?? 0) * CELL_SIZE,
        width: (widget.w ?? 1) * CELL_SIZE,
        height: (widget.h ?? 1) * CELL_SIZE,
        cursor: !isEditMode ? 'default' : isDragging ? 'grabbing' : 'grab',
        zIndex: isColliding ? 20 : 10,
      }}
      onPointerDown={isEditMode ? handlePointerDown : undefined}
      onPointerUp={isEditMode ? handlePointerUp : undefined}
      onPointerLeave={isEditMode ? handlePointerUp : undefined}
      onDoubleClick={isEditMode ? handleDoubleClick : undefined}
    >
      {/* 투명한 리사이즈 핸들 8개 — 마우스 올리면 방향 커서 표시 */}
      {RESIZE_HANDLES.map(({ handle, style, cursor }) => (
        <div
          key={handle}
          style={{ position: 'absolute', ...style, cursor, zIndex: 20, background: 'transparent' }}
          onPointerDown={e => onResizeStart(e, widget.id, handle)}
        />
      ))}

      {/* 위젯 본체 */}
      <div
        className="relative w-full h-full bg-white overflow-hidden"
        style={{
          borderRadius,
          boxShadow: isColliding
            ? '0 0 0 2px #dc2626'
            : isEditMode
            ? '0 0 0 1.5px rgba(245,158,11,0.5)'
            : dropShadow ? '0 4px 16px rgba(0,0,0,0.10)' : 'none',
          outline: isEditMode ? '1.5px dashed rgba(245,158,11,0.4)' : 'none',
          outlineOffset: '2px',
          opacity: isColliding ? 0.75 : 1,
          transform: isPressed ? 'scale(0.97)' : 'scale(1)',
          transition: 'box-shadow 0.1s, opacity 0.1s, transform 0.12s ease',
        }}
      >
        {isEditMode && (
          <button
            className="absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 text-xs transition-colors"
            onPointerDown={e => e.stopPropagation()}
            onClick={() => onRemove(widget.id)}
            title="위젯 삭제"
          >
            ✕
          </button>
        )}
        <WidgetRenderer widget={widget} />
      </div>
    </div>
  )
})

export default WidgetWrapper

// ─── WidgetRenderer ───────────────────────────────────────────────────────────
// registry에서 컴포넌트를 조회해 렌더링.
// 새 위젯은 registry.ts에만 추가하면 자동으로 여기서 렌더됨.

export interface WidgetComponentProps {
  widgetId: string
  binding: WidgetDataBinding
  onBindingChange: (binding: WidgetDataBinding) => void
  onBeforeChange: () => void
  isEditMode: boolean
}

function WidgetRenderer({ widget }: { widget: WidgetItem }) {
  const { updateWidgetData, commitBeforeWidgetEdit, isEditMode } = useEditorContext()
  const meta = getWidgetMeta(widget.type)
  if (!meta) return null
  const Component = meta.component as React.ComponentType<WidgetComponentProps>
  return (
    <Component
      widgetId={widget.id}
      binding={widget.data_binding}
      onBindingChange={(b) => updateWidgetData(widget.id, b)}
      onBeforeChange={commitBeforeWidgetEdit}
      isEditMode={isEditMode}
    />
  )
}

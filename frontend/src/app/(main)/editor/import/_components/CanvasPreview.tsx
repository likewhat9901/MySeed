'use client'

// ─── ImportMapper/CanvasPreview.tsx ───────────────────────────────────────────
// ImportMapper 좌측 패널. 현재 캔버스 위젯을 미리보기로 표시하고 클릭으로 선택.
// 이미 매핑된 위젯은 초록 테두리로 강조합니다.

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { CELL_SIZE } from '@/constants'
import { getWidgetMeta } from '../../canvas/_widgets/registry'
import { getMappingColor } from './mappingColors'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/editorMessages'
import type { WidgetItem } from '@/features/editor/types'
import type { MappingEntry } from '@/features/import/api'

// ─── CanvasPreview ────────────────────────────────────────────────────────────
// 위젯 배치를 패널 중앙에 표시.
// 휠 클릭 드래그: 패닝 / 휠 스크롤: 줌 (마우스 위치 기준)

interface Props {
  widgets:          WidgetItem[]
  selectedId:       string | null
  mappings:         MappingEntry[]
  widgetNumberMap:  Record<string, number | null>
  onSelect:         (id: string) => void
}

const PADDING_RATIO = 0.10
const ZOOM_FACTOR   = 0.12
const MIN_SCALE     = 0.2
const MAX_SCALE     = 4

export default function CanvasPreview({ widgets, selectedId, mappings, widgetNumberMap, onSelect }: Props) {
  const mappingMap   = new Map(mappings.map((m, idx) => [m.widget_id, { ...m, idx }]))
  const containerRef = useRef<HTMLDivElement>(null)

  // 기준 셀 크기 (패널 fit 시 계산, 이후 scale이 곱해짐)
  const [baseCell, setBaseCell] = useState(CELL_SIZE)
  const [scale,    setScale]    = useState(1)
  const [panX,     setPanX]     = useState(0)
  const [panY,     setPanY]     = useState(0)

  const isPanningRef = useRef(false)
  const lastPosRef   = useRef({ x: 0, y: 0 })

  // 최신 pan/scale 값을 동기적으로 참조하기 위한 ref
  const stateRef = useRef({ panX: 0, panY: 0, scale: 1 })

  // 실제 셀 크기 = baseCell * scale
  const cellSize = baseCell * scale

  // stateRef 동기화
  stateRef.current = { panX, panY, scale }

  // 위젯 bounding box (그리드 셀 단위)
  const bounds = useMemo(() => {
    if (widgets.length === 0) return { minX: 0, minY: 0, cols: 20, rows: 14 }
    const minX = Math.min(...widgets.map(w => w.x))
    const minY = Math.min(...widgets.map(w => w.y))
    const maxX = Math.max(...widgets.map(w => w.x + w.w))
    const maxY = Math.max(...widgets.map(w => w.y + w.h))
    return { minX, minY, cols: maxX - minX, rows: maxY - minY }
  }, [widgets])

  // 패널 크기 변경 시 → fit 계산 (초기 1회만 pan 리셋)
  const recalc = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const availW = width  * (1 - PADDING_RATIO * 2)
    const availH = height * (1 - PADDING_RATIO * 2)
    const fitScale = Math.min(availW / (bounds.cols * CELL_SIZE), availH / (bounds.rows * CELL_SIZE))
    const base = Math.max(4, CELL_SIZE * fitScale)
    setBaseCell(base)
    setScale(1)
    // 위젯 그룹 중앙 정렬
    const contentW = bounds.cols * base
    const contentH = bounds.rows * base
    setPanX((width  - contentW) / 2)
    setPanY((height - contentH) / 2)
  }, [bounds.cols, bounds.rows])

  useEffect(() => {
    recalc()
    const ro = new ResizeObserver(recalc)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [recalc])

  // ── 휠 스크롤: 줌 (마우스 커서 위치 기준) ────────────────────────────────
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect   = el.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // stateRef로 최신값 동기 읽기 → 한 번에 계산
    const { panX: px, panY: py, scale: prevScale } = stateRef.current
    const delta    = e.deltaY < 0 ? 1 + ZOOM_FACTOR : 1 - ZOOM_FACTOR
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * delta))
    const ratio    = nextScale / prevScale

    setScale(nextScale)
    setPanX(mouseX - (mouseX - px) * ratio)
    setPanY(mouseY - (mouseY - py) * ratio)
  }

  // ── 휠 클릭: 패닝 ────────────────────────────────────────────────────────
  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 1) return
    e.preventDefault()
    isPanningRef.current = true
    lastPosRef.current   = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isPanningRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    setPanX(x => x + dx)
    setPanY(y => y + dy)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (e.button !== 1) return
    isPanningRef.current = false
  }

  const { locale } = useLocale()
  const t = editorMessages[locale]
  const selectedWidget = widgets.find(w => w.id === selectedId)
  const selectedMeta   = selectedWidget ? getWidgetMeta(selectedWidget.type) : null

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 shrink-0">
        <p className="text-xs font-semibold text-gray-500 tracking-widest shrink-0">CANVAS</p>
        <p className="text-[11px] text-gray-400">
          {selectedId
            ? `${selectedMeta?.label ?? t.importWidgetLabel} ${t.importCanvasSelected}`
            : t.importCanvasHint}
        </p>
      </div>

      {/* 캔버스 영역 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{
          backgroundColor:    '#f3f4f6',
          cursor:             isPanningRef.current ? 'grabbing' : 'default',
          backgroundImage:    `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize:     `${cellSize}px ${cellSize}px`,
          backgroundPosition: `${panX}px ${panY}px`,
        }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { isPanningRef.current = false }}
      >
        {widgets.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-300">캔버스에 위젯이 없습니다</p>
          </div>
        ) : (
          <div style={{ position: 'absolute', top: panY, left: panX }}>
            {widgets.map(widget => {
              const meta     = getWidgetMeta(widget.type)
              const Icon     = meta?.icon
              const selected    = selectedId === widget.id
              const mappingEntry = mappingMap.get(widget.id)
              const mapped       = !!mappingEntry
              const mapColor     = mappingEntry ? getMappingColor(mappingEntry.idx) : null
              const num          = widgetNumberMap[widget.id]
              const scaledRadius = Math.round(widget.style.borderRadius * cellSize / CELL_SIZE)
              const iconSize     = Math.max(8, Math.min(widget.w, widget.h) * cellSize * 0.18)
              const fontSize     = Math.max(6, cellSize * 0.52)

              return (
                <button
                  key={widget.id}
                  onPointerDown={e => e.button === 1 && e.stopPropagation()}
                  onClick={() => onSelect(widget.id)}
                  style={{
                    position:      'absolute',
                    left:          (widget.x - bounds.minX) * cellSize,
                    top:           (widget.y - bounds.minY) * cellSize,
                    width:         widget.w * cellSize,
                    height:        widget.h * cellSize,
                    borderRadius:  scaledRadius,
                    outline:       selected ? `2px solid #16a34a` : mapColor ? `2px solid ${mapColor.outline}` : 'none',
                    outlineOffset: '1px',
                    backgroundColor: selected ? '#f0fdf4' : mapColor ? mapColor.bg : '#ffffff',
                    boxShadow:     widget.style.dropShadow && !selected ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                    zIndex:        selected ? 10 : 1,
                  }}
                  className="overflow-hidden text-left transition-[outline] hover:brightness-95"
                >
                  {num !== null && (
                    <div
                      style={selected
                        ? { backgroundColor: '#16a34a', color: '#fff' }
                        : mapColor
                        ? { backgroundColor: mapColor.outline, color: '#fff' }
                        : { backgroundColor: '#e5e7eb', color: '#6b7280' }
                      }
                      className="absolute top-1 left-1 text-[9px] font-bold leading-none px-1 py-0.5 rounded"
                    >
                      #{num}
                    </div>
                  )}
                  <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 pointer-events-none">
                    {Icon && (
                      <Icon
                        size={iconSize}
                        style={{ color: selected ? '#16a34a' : mapColor ? mapColor.outline : '#9ca3af' }}
                      />
                    )}
                    <span
                      style={{ fontSize, color: selected ? '#14532d' : mapColor ? mapColor.text : '#6b7280' }}
                      className="font-medium leading-tight text-center px-1 w-full truncate"
                    >
                      {meta?.label ?? widget.type}{num !== null ? ` #${num}` : ''}
                    </span>
                  </div>
                  {mappingEntry && mapColor && (
                    <div className="absolute bottom-1 left-0 right-0 flex justify-center px-1">
                      <div
                        style={{ backgroundColor: mapColor.outline, color: '#fff' }}
                        className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium leading-none whitespace-nowrap shadow-sm max-w-full truncate"
                      >
                        <span className="truncate">{mappingEntry.sheet} · {mappingEntry.address}</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 줌 레벨 표시 */}
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded">
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  )
}

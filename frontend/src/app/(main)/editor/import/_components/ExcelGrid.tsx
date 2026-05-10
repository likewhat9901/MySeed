'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { utils } from 'xlsx'
import type { WorkBook } from 'xlsx'
import { getMappingColor } from './mappingColors'
import type { MappingEntry } from '@/features/import/api'

// ─── ExcelGrid ────────────────────────────────────────────────────────────────
// Import Mapper 오른쪽 패널. 파싱된 엑셀을 그리드로 표시하고 셀/범위 선택.

interface Props {
  workbook:       WorkBook
  selectedSheet:  string
  selectedAddr:   string | null          // "B5" 또는 "A2:D10"
  mappings:       MappingEntry[]
  onSheetChange:  (sheet: string) => void
  onAddrSelect:   (addr: string) => void // 선택 확정 시 호출
}

interface CellPos { row: number; col: number }

function colName(idx: number): string {
  let name = ''
  let n = idx + 1
  while (n > 0) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function posToAddr(pos: CellPos): string {
  return `${colName(pos.col)}${pos.row + 1}`
}

function rangeToAddr(start: CellPos, end: CellPos): string {
  const r0 = Math.min(start.row, end.row)
  const r1 = Math.max(start.row, end.row)
  const c0 = Math.min(start.col, end.col)
  const c1 = Math.max(start.col, end.col)
  if (r0 === r1 && c0 === c1) return posToAddr({ row: r0, col: c0 })
  return `${colName(c0)}${r0 + 1}:${colName(c1)}${r1 + 1}`
}

function parseAddr(addr: string): { r0: number; r1: number; c0: number; c1: number } | null {
  const single = addr.match(/^([A-Z]+)(\d+)$/)
  if (single) {
    const col = single[1].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
    const row = parseInt(single[2]) - 1
    return { r0: row, r1: row, c0: col, c1: col }
  }
  const range = addr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (range) {
    const c0 = range[1].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
    const r0 = parseInt(range[2]) - 1
    const c1 = range[3].split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
    const r1 = parseInt(range[4]) - 1
    return { r0, r1, c0, c1 }
  }
  return null
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 200]

export default function ExcelGrid({ workbook, selectedSheet, selectedAddr, mappings, onSheetChange, onAddrSelect }: Props) {
  const [dragStart,  setDragStart]  = useState<CellPos | null>(null)
  const [dragEnd,    setDragEnd]    = useState<CellPos | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [zoomIdx,    setZoomIdx]    = useState(2) // 기본 100%
  const zoom = ZOOM_STEPS[zoomIdx]

  const sheet  = workbook.Sheets[selectedSheet]
  const data: (string | number | null)[][] = sheet
    ? utils.sheet_to_json(sheet, { header: 1, defval: null })
    : []

  const maxCols = Math.max(0, ...data.map((r: unknown[]) => r.length))
  const COLS = Math.min(maxCols + 2, 26)
  const ROWS = Math.min(data.length + 2, 100)

  const selectedParsed = selectedAddr ? parseAddr(selectedAddr) : null

  // 현재 시트에 해당하는 매핑 → 셀 키("r,c") → 색상 인덱스
  const mappingCellMap = useMemo(() => {
    const map = new Map<string, number>()
    mappings.forEach((m, idx) => {
      if (m.sheet !== selectedSheet) return
      const parsed = parseAddr(m.address)
      if (!parsed) return
      for (let r = parsed.r0; r <= parsed.r1; r++) {
        for (let c = parsed.c0; c <= parsed.c1; c++) {
          map.set(`${r},${c}`, idx)
        }
      }
    })
    return map
  }, [mappings, selectedSheet])

  const isInSelection = useCallback((row: number, col: number): boolean => {
    const base = isDragging && dragStart && dragEnd
      ? { r0: Math.min(dragStart.row, dragEnd.row), r1: Math.max(dragStart.row, dragEnd.row),
          c0: Math.min(dragStart.col, dragEnd.col), c1: Math.max(dragStart.col, dragEnd.col) }
      : selectedParsed
    if (!base) return false
    return row >= base.r0 && row <= base.r1 && col >= base.c0 && col <= base.c1
  }, [isDragging, dragStart, dragEnd, selectedParsed])

  function onMouseDown(row: number, col: number) {
    setDragStart({ row, col })
    setDragEnd({ row, col })
    setIsDragging(true)
  }

  function onMouseEnter(row: number, col: number) {
    if (!isDragging) return
    setDragEnd({ row, col })
  }

  function onMouseUp(row: number, col: number) {
    if (!isDragging || !dragStart) return
    setIsDragging(false)
    const addr = rangeToAddr(dragStart, { row, col })
    onAddrSelect(addr)
  }

  const cellVal = (row: number, col: number): string => {
    const v = data[row]?.[col]
    return v == null ? '' : String(v)
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* 시트 탭 */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-gray-100 overflow-x-auto">
        {workbook.SheetNames.map(name => (
          <button
            key={name}
            onClick={() => onSheetChange(name)}
            className={`px-3 py-1.5 text-xs rounded-t-md whitespace-nowrap transition-colors ${
              name === selectedSheet
                ? 'bg-white border border-b-white border-gray-200 text-gray-800 font-medium -mb-px'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 선택된 주소 표시 + 줌 UI */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] text-gray-400 font-medium w-16 shrink-0">선택 범위</span>
        <span className="text-xs font-mono text-green-700 font-semibold">
          {(isDragging && dragStart && dragEnd)
            ? rangeToAddr(dragStart, dragEnd)
            : selectedAddr ?? '—'}
        </span>
        {selectedAddr && !isDragging && (
          <button
            onClick={() => onAddrSelect('')}
            className="text-[10px] text-gray-400 hover:text-red-400"
          >
            해제
          </button>
        )}
        <div className="ml-auto flex items-center gap-0.5 bg-brand text-white rounded-lg px-1 py-0.5">
          <button
            onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
            disabled={zoomIdx === 0}
            className="w-5 h-5 flex items-center justify-center hover:bg-brand-dark rounded disabled:opacity-30 text-sm font-medium transition-colors"
          >−</button>
          <span className="text-[10px] w-8 text-center font-medium">{zoom}%</span>
          <button
            onClick={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={zoomIdx === ZOOM_STEPS.length - 1}
            className="w-5 h-5 flex items-center justify-center hover:bg-brand-dark rounded disabled:opacity-30 text-sm font-medium transition-colors"
          >+</button>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 overflow-auto">
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%` }}>
        <table className="border-collapse text-xs" onMouseLeave={() => { if (isDragging && dragStart && dragEnd) { setIsDragging(false); onAddrSelect(rangeToAddr(dragStart, dragEnd)) } }}>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 w-8 min-w-[2rem] bg-gray-50 border border-gray-200 text-gray-400 text-center text-[10px]" />
              {Array.from({ length: COLS }, (_, ci) => (
                <th key={ci} className="sticky top-0 z-10 bg-gray-50 border border-gray-200 px-2 py-1 text-gray-400 text-center font-medium min-w-[64px] text-[10px]">
                  {colName(ci)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, ri) => (
              <tr key={ri}>
                <td className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-1.5 text-gray-400 text-center text-[10px] font-medium min-w-[2rem]">
                  {ri + 1}
                </td>
                {Array.from({ length: COLS }, (_, ci) => {
                  const inSel      = isInSelection(ri, ci)
                  const mapIdx     = mappingCellMap.get(`${ri},${ci}`)
                  const mapColor   = mapIdx !== undefined ? getMappingColor(mapIdx) : null
                  const style = inSel
                    ? {}
                    : mapColor
                    ? { backgroundColor: mapColor.bg, color: mapColor.text }
                    : {}
                  return (
                    <td
                      key={ci}
                      style={style}
                      className={`border border-gray-200 px-2 py-1 cursor-cell whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis transition-colors ${
                        inSel ? 'bg-green-100 text-green-900' : mapColor ? '' : 'hover:bg-blue-50 text-gray-700'
                      }`}
                      onMouseDown={() => onMouseDown(ri, ci)}
                      onMouseEnter={() => onMouseEnter(ri, ci)}
                      onMouseUp={() => onMouseUp(ri, ci)}
                    >
                      {cellVal(ri, ci)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

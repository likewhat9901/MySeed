'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { utils } from 'xlsx'
import type { WorkBook } from 'xlsx'
import { getMappingColor } from '../_utils/mappingColors'
import { RECORD_COLUMN_LABELS } from '@/features/ledger/record/types'
import type { MappingEntry } from '@/features/ledger/record/rpc'
import type { RecordColumn, ColumnMappingEntry } from '@/features/ledger/record/types'

// ─── ExcelGrid ────────────────────────────────────────────────────────────────
// Import Mapper 오른쪽 패널. 파싱된 엑셀을 그리드로 표시하고 범위 선택 후 컬럼 매핑 팝업 표시.

interface Props {
  workbook:      WorkBook
  selectedSheet: string
  selectedAddr:  string | null
  mappings:      MappingEntry[]
  onSheetChange: (sheet: string) => void
  onMappingsAdd: (entries: ColumnMappingEntry[]) => void
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

const ROW_H  = 25  // 셀 높이(px) — 팝업 Y 위치 계산용
const COL_W  = 80  // 셀 너비(px) — 팝업 X 위치 계산용
const HEAD_W = 32  // 행 번호 열 너비(px)
const HEAD_H = 25  // 열 헤더 행 높이(px)

const ALL_COLUMNS: RecordColumn[] = ['date', 'time', 'type', 'category', 'subcategory', 'description', 'amount', 'currency', 'paymentMethod', 'memo']
const ZOOM_STEPS = [50, 75, 100, 125, 150, 200]

export default function ExcelGrid({ workbook, selectedSheet, selectedAddr, mappings, onSheetChange, onMappingsAdd }: Props) {
  const [dragStart,  setDragStart]  = useState<CellPos | null>(null)
  const [dragEnd,    setDragEnd]    = useState<CellPos | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [zoomIdx,    setZoomIdx]    = useState(2)
  const zoom = ZOOM_STEPS[zoomIdx]

  const [pendingAddr,     setPendingAddr]     = useState<string | null>(null)
  const [pendingStart,    setPendingStart]    = useState<CellPos | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<RecordColumn[]>([])
  const [anchorRect,      setAnchorRect]      = useState<{ right: number; top: number } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef  = useRef<HTMLTableElement>(null)

  // 팝업이 열린 상태에서 스크롤하면 닫기
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !pendingAddr) return
    const close = () => {
      setPendingAddr(null)
      setPendingStart(null)
      setSelectedColumns([])
      setAnchorRect(null)
    }
    el.addEventListener('scroll', close, { passive: true })
    return () => el.removeEventListener('scroll', close)
  }, [pendingAddr])

  const sheet = workbook.Sheets[selectedSheet]
  const data: (string | number | null)[][] = sheet
    ? utils.sheet_to_json(sheet, { header: 1, defval: null })
    : []

  const maxCols = Math.max(0, ...data.map((r: unknown[]) => r.length))
  const COLS = Math.min(maxCols + 2, 26)
  const ROWS = Math.min(data.length + 2, 100)

  const selectedParsed = selectedAddr ? parseAddr(selectedAddr) : null
  const pendingParsed  = pendingAddr  ? parseAddr(pendingAddr)  : null
  const pendingColCount = pendingParsed ? pendingParsed.c1 - pendingParsed.c0 + 1 : 0

  const mappingCellMap = useMemo(() => {
    const map = new Map<string, number>()
    mappings.forEach((m, idx) => {
      if (m.sheet !== selectedSheet) return
      const parsed = parseAddr(m.address)
      if (!parsed) return
      for (let r = parsed.r0; r <= parsed.r1; r++)
        for (let c = parsed.c0; c <= parsed.c1; c++)
          map.set(`${r},${c}`, idx)
    })
    return map
  }, [mappings, selectedSheet])

  const activeRange = useMemo(() => {
    if (isDragging && dragStart && dragEnd) {
      return {
        r0: Math.min(dragStart.row, dragEnd.row), r1: Math.max(dragStart.row, dragEnd.row),
        c0: Math.min(dragStart.col, dragEnd.col), c1: Math.max(dragStart.col, dragEnd.col),
      }
    }
    return pendingParsed ?? selectedParsed ?? null
  }, [isDragging, dragStart, dragEnd, pendingParsed, selectedParsed])

  const isInSelection = useCallback((row: number, col: number): boolean => {
    if (!activeRange) return false
    return row >= activeRange.r0 && row <= activeRange.r1 && col >= activeRange.c0 && col <= activeRange.c1
  }, [activeRange])

  // 팝업 위치: getBoundingClientRect로 읽은 실제 셀 위치 기준.
  // anchorRect는 컨테이너 기준 뷰포트 좌표 → position:fixed 로 붙임.
  const popupStyle = useMemo(() => {
    if (!anchorRect) return null
    const container = scrollRef.current
    if (!container) return null

    const POPUP_W = 288  // w-72
    const POPUP_H = 160
    const GAP     = 8
    const viewW   = container.clientWidth
    const viewH   = container.clientHeight

    const enoughRight  = anchorRect.right + GAP + POPUP_W <= viewW
    const enoughBottom = anchorRect.top   + POPUP_H       <= viewH

    const containerRect = container.getBoundingClientRect()
    const left = enoughRight
      ? containerRect.left + anchorRect.right + GAP
      : containerRect.left + anchorRect.right - POPUP_W - GAP
    const top = enoughBottom
      ? containerRect.top + anchorRect.top
      : containerRect.top + anchorRect.top - POPUP_H + ROW_H

    return { position: 'fixed' as const, left: left + 'px', top: top + 'px' }
  }, [anchorRect])

  function onMouseDown(row: number, col: number) {
    setDragStart({ row, col })
    setDragEnd({ row, col })
    setIsDragging(true)
    setPendingAddr(null)
    setPendingStart(null)
    setSelectedColumns([])
  }

  function onMouseEnter(row: number, col: number) {
    if (!isDragging) return
    setDragEnd({ row, col })
  }

  function onMouseUp(row: number, col: number) {
    if (!isDragging || !dragStart) return
    setIsDragging(false)
    const normStart = {
      row: Math.min(dragStart.row, row),
      col: Math.min(dragStart.col, col),
    }
    const addr = rangeToAddr(dragStart, { row, col })
    setPendingAddr(addr)
    setPendingStart(normStart)
    setSelectedColumns([])

    // 선택 범위 오른쪽 끝 셀의 실제 DOM 위치를 저장
    const endCol  = Math.max(dragStart.col, col)
    const endRow  = Math.min(dragStart.row, row)
    const container = scrollRef.current
    const table     = tableRef.current
    if (container && table) {
      // thead(1행) + tbody의 endRow번째 tr → endCol+1번째 td (+1은 행번호 열)
      const tr = table.tBodies[0]?.rows[endRow]
      const td = tr?.cells[endCol + 1]
      if (td) {
        const tdRect        = td.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        setAnchorRect({
          right: tdRect.right - containerRect.left,
          top:   tdRect.top   - containerRect.top,
        })
      }
    }
  }

  function toggleColumn(col: RecordColumn) {
    setSelectedColumns(prev => {
      if (prev.includes(col)) return prev.filter(c => c !== col)
      if (prev.length >= pendingColCount) return prev
      return [...prev, col]
    })
  }

  function confirmMapping() {
    if (!pendingAddr || !pendingParsed || selectedColumns.length !== pendingColCount) return
    const entries: ColumnMappingEntry[] = selectedColumns.map((col, i) => {
      const c = pendingParsed.c0 + i
      const colAddr = `${colName(c)}${pendingParsed.r0 + 1}:${colName(c)}${pendingParsed.r1 + 1}`
      return { column: col, sheet: selectedSheet, address: colAddr }
    })
    onMappingsAdd(entries)
    setPendingAddr(null)
    setPendingStart(null)
    setSelectedColumns([])
    setAnchorRect(null)
  }

  function cancelMapping() {
    setPendingAddr(null)
    setPendingStart(null)
    setSelectedColumns([])
    setAnchorRect(null)
  }

  const cellVal = (row: number, col: number): string => {
    const v = data[row]?.[col]
    return v == null ? '' : String(v)
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* 시트 탭 */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-gray-100 overflow-x-auto shrink-0">
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0">
        <span className="text-[10px] text-gray-400 font-medium w-16 shrink-0">선택 범위</span>
        <span className="text-xs font-mono text-green-700 font-semibold">
          {(isDragging && dragStart && dragEnd)
            ? rangeToAddr(dragStart, dragEnd)
            : pendingAddr ?? selectedAddr ?? '—'}
        </span>
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

      {/* 그리드 + 팝업 (relative 컨테이너) */}
      <div className="flex-1 overflow-auto relative" ref={scrollRef}>
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', width: `${10000 / zoom}%` }}>
          <table
            ref={tableRef}
            className="border-collapse text-xs"
            onMouseLeave={() => {
              if (isDragging && dragStart && dragEnd) {
                const normStart = { row: Math.min(dragStart.row, dragEnd.row), col: Math.min(dragStart.col, dragEnd.col) }
                setIsDragging(false)
                setPendingAddr(rangeToAddr(dragStart, dragEnd))
                setPendingStart(normStart)
                setSelectedColumns([])
              }
            }}
          >
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
                    const inSel    = isInSelection(ri, ci)
                    const mapIdx   = mappingCellMap.get(`${ri},${ci}`)
                    const mapColor = mapIdx !== undefined ? getMappingColor(mapIdx) : null
                    const style = inSel ? {} : mapColor ? { backgroundColor: mapColor.bg, color: mapColor.text } : {}
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

        {/* 컬럼 매핑 팝업 — 선택 셀 오른쪽에 fixed로 */}
        {pendingAddr && popupStyle && (
          <div
            className="z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 w-72"
            style={popupStyle}
          >
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[10px] text-gray-400">{pendingAddr}</span>
              <span className="text-[10px] text-gray-300 mx-1">·</span>
              <span className="text-[10px] text-gray-400">{selectedColumns.length}/{pendingColCount}열 선택</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2.5">
              {ALL_COLUMNS.map(col => {
                const idx = selectedColumns.indexOf(col)
                const isSelected = idx !== -1
                const disabled = !isSelected && selectedColumns.length >= pendingColCount
                return (
                  <button
                    key={col}
                    onClick={() => toggleColumn(col)}
                    disabled={disabled}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-brand text-white border-brand'
                        : disabled
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-brand hover:text-brand'
                    }`}
                  >
                    {isSelected && <span className="mr-0.5 text-[9px] opacity-70">{idx + 1}</span>}
                    {RECORD_COLUMN_LABELS[col]}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-300">
                {selectedColumns.length < pendingColCount
                  ? `${pendingColCount - selectedColumns.length}개 더 선택`
                  : '순서대로 각 열에 매핑'}
              </span>
              <div className="flex gap-1.5">
                <button onClick={cancelMapping} className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1">
                  취소
                </button>
                <button
                  onClick={confirmMapping}
                  disabled={selectedColumns.length !== pendingColCount}
                  className={`text-[11px] font-medium px-3 py-1 rounded-md transition-colors ${
                    selectedColumns.length === pendingColCount
                      ? 'bg-brand text-white hover:bg-brand-dark'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  연결
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

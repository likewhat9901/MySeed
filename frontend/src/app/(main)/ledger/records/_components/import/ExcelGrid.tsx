'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { utils } from 'xlsx'
import type { WorkBook } from 'xlsx'
import { getMappingColor } from '../../_utils/mappingColors'
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
const HEAD_W = 32  // 행 번호 열 너비(px)
const HEAD_H = 25  // 열 헤더 행 높이(px)

const ALL_COLUMNS: RecordColumn[] = ['date', 'time', 'type', 'category', 'subcategory', 'description', 'amount', 'currency', 'paymentMethod', 'memo', 'review']
const ZOOM_STEPS = [50, 75, 100, 125, 150, 200]

// 헤더 텍스트 → 컬럼 자동 매칭용 별칭 (RECORD_COLUMN_LABELS 외 흔한 표기 포함)
const HEADER_ALIASES: Record<RecordColumn, string[]> = {
  date:          ['날짜', '일자', 'date'],
  time:          ['시간', 'time'],
  type:          ['타입', '구분', 'type'],
  category:      ['대분류', '분류', '카테고리', 'category'],
  subcategory:   ['소분류', 'subcategory'],
  description:   ['내용', '내역', '상호', '상호명', 'description'],
  amount:        ['금액', 'amount'],
  currency:      ['화폐', '통화', 'currency'],
  paymentMethod: ['결제수단', '결제 수단', '카드', 'payment'],
  memo:          ['메모', 'memo', '비고'],
  review:        ['후회', 'review'],
}

function matchColumnByHeader(headerText: string): RecordColumn | null {
  const norm = headerText.trim().toLowerCase()
  if (!norm) return null
  for (const col of ALL_COLUMNS) {
    if (HEADER_ALIASES[col].some(alias => alias.toLowerCase() === norm)) return col
  }
  return null
}

export default function ExcelGrid({ workbook, selectedSheet, selectedAddr, mappings, onSheetChange, onMappingsAdd }: Props) {
  const [dragStart,  setDragStart]  = useState<CellPos | null>(null)
  const [dragEnd,    setDragEnd]    = useState<CellPos | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [zoomIdx,    setZoomIdx]    = useState(2)
  const zoom = ZOOM_STEPS[zoomIdx]

  const [pendingAddr,     setPendingAddr]     = useState<string | null>(null)
  const [pendingStart,    setPendingStart]    = useState<CellPos | null>(null)
  const [selectedColumns, setSelectedColumns] = useState<RecordColumn[]>([])
  const [hasHeaderRow,    setHasHeaderRow]    = useState(false)   // 자동 매칭으로 1행을 헤더로 처리했는지
  const [shiftAnchor,     setShiftAnchor]     = useState<RecordColumn | null>(null)  // 순서 다중선택 시작 컬럼
  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef  = useRef<HTMLDivElement>(null)

  const sheet = workbook.Sheets[selectedSheet]
  const data: (string | number | null)[][] = useMemo(
    () => sheet ? utils.sheet_to_json(sheet, { header: 1, defval: null }) : [],
    [sheet],
  )

  const maxCols = Math.max(0, ...data.map((r: unknown[]) => r.length))
  const COLS = Math.min(maxCols + 2, 26)
  const ROWS = data.length + 1

  // 행 가상화 — 보이는 행만 렌더링해 대용량 시트에서도 드래그/전체선택 시 렉 방지
  const rowVirtualizer = useVirtualizer({
    count: ROWS,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H * (zoom / 100),
    overscan: 10,
  })

  // 줌 변경 시 행 높이를 다시 측정
  useEffect(() => {
    rowVirtualizer.measure()
  }, [zoom])

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

  function finishSelection(start: CellPos, end: CellPos) {
    const addr = rangeToAddr(start, end)
    setPendingAddr(addr)
    setPendingStart({ row: Math.min(start.row, end.row), col: Math.min(start.col, end.col) })
    setSelectedColumns([])
    setHasHeaderRow(false)
    setShiftAnchor(null)
  }

  function onMouseDown(row: number, col: number, e: React.MouseEvent) {
    if (e.shiftKey && dragStart) {
      // Shift+클릭: 기존 시작점 유지, 끝점만 갱신
      setDragEnd({ row, col })
      finishSelection(dragStart, { row, col })
      return
    }
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
    setDragEnd({ row, col })
    finishSelection(dragStart, { row, col })
  }

  function toggleColumn(col: RecordColumn, e?: React.MouseEvent) {
    // Shift+클릭: 마지막으로 선택한 컬럼부터 이번 컬럼까지 ALL_COLUMNS 순서대로 일괄 선택
    if (e?.shiftKey && shiftAnchor) {
      const startIdx = ALL_COLUMNS.indexOf(shiftAnchor)
      const endIdx   = ALL_COLUMNS.indexOf(col)
      if (startIdx !== -1 && endIdx !== -1) {
        const [lo, hi] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const range = ALL_COLUMNS.slice(lo, hi + 1).slice(0, pendingColCount)
        setSelectedColumns(range)
        setShiftAnchor(col)
        return
      }
    }

    setSelectedColumns(prev => {
      if (prev.includes(col)) return prev.filter(c => c !== col)
      if (prev.length >= pendingColCount) return prev
      return [...prev, col]
    })
    setShiftAnchor(col)
  }

  // 1행을 헤더 텍스트로 보고 ALL_COLUMNS와 매칭되는 열만 자동 선택
  function autoMatchByHeader() {
    if (!pendingParsed || pendingParsed.r1 <= pendingParsed.r0) return
    const matched: RecordColumn[] = []
    for (let c = pendingParsed.c0; c <= pendingParsed.c1; c++) {
      const headerText = String(data[pendingParsed.r0]?.[c] ?? '')
      const col = matchColumnByHeader(headerText)
      if (col && !matched.includes(col)) matched.push(col)
    }
    setSelectedColumns(matched)
    setHasHeaderRow(true)
    setShiftAnchor(null)
  }

  function confirmMapping() {
    if (!pendingAddr || !pendingParsed || selectedColumns.length !== pendingColCount) return
    const dataR0 = hasHeaderRow ? pendingParsed.r0 + 1 : pendingParsed.r0
    const entries: ColumnMappingEntry[] = selectedColumns.map((col, i) => {
      const c = pendingParsed.c0 + i
      const colAddr = `${colName(c)}${dataR0 + 1}:${colName(c)}${pendingParsed.r1 + 1}`
      return { column: col, sheet: selectedSheet, address: colAddr }
    })
    onMappingsAdd(entries)
    setPendingAddr(null)
    setPendingStart(null)
    setSelectedColumns([])
    setHasHeaderRow(false)
    setShiftAnchor(null)
  }

  function cancelMapping() {
    setPendingAddr(null)
    setPendingStart(null)
    setSelectedColumns([])
    setHasHeaderRow(false)
    setShiftAnchor(null)
  }

  // 열 헤더 클릭 → 해당 열 전체 선택 (Shift: 기존 시작점~열 끝까지 확장)
  function onColHeaderClick(ci: number, e: React.MouseEvent) {
    const lastRow = Math.max(0, data.length - 1)
    if (e.shiftKey && dragStart) {
      finishSelection(dragStart, { row: lastRow, col: ci })
    } else {
      setDragStart({ row: 0, col: ci })
      finishSelection({ row: 0, col: ci }, { row: lastRow, col: ci })
    }
  }

  // 행 번호 클릭 → 해당 행 전체 선택 (Shift: 기존 시작점~행 끝까지 확장)
  function onRowHeaderClick(ri: number, e: React.MouseEvent) {
    const lastCol = Math.max(0, maxCols - 1)
    if (e.shiftKey && dragStart) {
      finishSelection(dragStart, { row: ri, col: lastCol })
    } else {
      setDragStart({ row: ri, col: 0 })
      finishSelection({ row: ri, col: 0 }, { row: ri, col: lastCol })
    }
  }

  const cellVal = (row: number, col: number): string => {
    const v = data[row]?.[col]
    if (v == null) return ''
    if (typeof v === 'number') {
      const intPart  = Math.floor(v)
      const fracPart = v - intPart
      // Excel 날짜 시리얼 (2000~2100년 범위: 36526~73050)
      if (intPart >= 36526 && intPart <= 73050) {
        const ms = (intPart - 25569) * 86400 * 1000
        const d  = new Date(ms)
        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
        if (fracPart > 0.0001) {
          const totalMin = Math.round(fracPart * 1440)
          const h = Math.floor(totalMin / 60), m = totalMin % 60
          return `${dateStr} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }
        return dateStr
      }
      // Excel 시간 소수 (0 < v < 1)
      if (v > 0 && v < 1) {
        const totalMin = Math.round(v * 1440)
        const h = Math.floor(totalMin / 60), m = totalMin % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }
    return String(v)
  }

  // 열별 너비 — 내용 길이에 맞춰 자동 계산 (성능을 위해 앞쪽 200행만 샘플링)
  const colWidths = useMemo(() => {
    const SAMPLE_ROWS = Math.min(data.length, 200)
    const widths: number[] = []
    for (let c = 0; c < COLS; c++) {
      let maxLen = 4 // 빈 열도 최소 너비 보장
      for (let r = 0; r < SAMPLE_ROWS; r++) {
        const text = cellVal(r, c)
        // 한글/전각 문자는 영문보다 시각적으로 넓으므로 가중치 부여
        let len = 0
        for (const ch of text) len += /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch) ? 1.8 : 1
        if (len > maxLen) maxLen = len
      }
      widths.push(Math.min(Math.max(maxLen * 8 + 24, 64), 240))
    }
    return widths
  }, [data, COLS])

  const totalColWidth = colWidths.reduce((s, w) => s + w, 0)

  return (
    <div className="flex flex-col h-full select-none">
      {/* 시트 탭 */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-gray-200 overflow-x-auto shrink-0">
        {workbook.SheetNames.map(name => (
          <button
            key={name}
            onClick={() => onSheetChange(name)}
            className={`px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
              name === selectedSheet
                ? 'bg-white border border-b-white border-gray-200 text-gray-800 font-semibold -mb-px'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* 선택된 주소 표시 + 줌 UI */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0">
        <span className="text-[10px] text-gray-400 font-medium w-16 shrink-0">선택 범위</span>
        <span className="text-xs font-mono text-green-700 font-semibold">
          {(isDragging && dragStart && dragEnd)
            ? rangeToAddr(dragStart, dragEnd)
            : pendingAddr ?? selectedAddr ?? '—'}
        </span>
        <button
          onClick={() => {
            const lastRow = Math.max(0, data.length - 1)
            const lastCol = Math.max(0, maxCols - 1)
            setDragStart({ row: 0, col: 0 })
            finishSelection({ row: 0, col: 0 }, { row: lastRow, col: lastCol })
          }}
          disabled={data.length === 0}
          className="text-[10px] font-semibold text-gray-500 border border-gray-300 px-2 py-0.5 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          전체 데이터 선택
        </button>
        <div className="ml-auto flex items-center gap-0.5 bg-gray-800 text-white px-1 py-0.5">
          <button
            onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
            disabled={zoomIdx === 0}
            className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 text-sm font-medium transition-colors"
          >−</button>
          <span className="text-[10px] w-8 text-center font-medium">{zoom}%</span>
          <button
            onClick={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            disabled={zoomIdx === ZOOM_STEPS.length - 1}
            className="w-5 h-5 flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 text-sm font-medium transition-colors"
          >+</button>
        </div>
      </div>

      {/* 그리드 + 팝업 (relative 컨테이너) — 행 가상화로 보이는 행만 렌더링 */}
      <div
        className="flex-1 overflow-auto relative"
        ref={scrollRef}
        onMouseLeave={() => {
          if (isDragging && dragStart && dragEnd) {
            setIsDragging(false)
            finishSelection(dragStart, dragEnd)
          }
        }}
      >
        <div
          ref={tableRef}
          style={{
            width: totalColWidth * (zoom / 100) + HEAD_W * (zoom / 100),
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
            fontSize: 12 * (zoom / 100),
          }}
        >
          {/* 열 헤더 — 가로 스크롤과 함께 움직이되 세로로는 sticky */}
          <div
            className="sticky top-0 z-20 flex bg-gray-50"
            style={{ height: HEAD_H * (zoom / 100) }}
          >
            <div
              className="sticky left-0 z-10 shrink-0 bg-gray-50 border border-gray-200"
              style={{ width: HEAD_W * (zoom / 100) }}
            />
            {Array.from({ length: COLS }, (_, ci) => (
              <div
                key={ci}
                onClick={e => onColHeaderClick(ci, e)}
                className="shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors select-none"
                style={{ width: colWidths[ci] * (zoom / 100), fontSize: 10 * (zoom / 100) }}
              >
                {colName(ci)}
              </div>
            ))}
          </div>

          {/* 가상화된 행 */}
          {rowVirtualizer.getVirtualItems().map(vRow => {
            const ri = vRow.index
            return (
              <div
                key={ri}
                className="flex absolute left-0"
                style={{ top: vRow.start + HEAD_H * (zoom / 100), height: vRow.size }}
              >
                <div
                  onClick={e => onRowHeaderClick(ri, e)}
                  className="sticky left-0 z-10 shrink-0 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 font-medium cursor-pointer hover:bg-gray-100 hover:text-gray-700 transition-colors select-none"
                  style={{ width: HEAD_W * (zoom / 100), fontSize: 10 * (zoom / 100) }}
                >
                  {ri + 1}
                </div>
                {Array.from({ length: COLS }, (_, ci) => {
                  const inSel    = isInSelection(ri, ci)
                  const mapIdx   = mappingCellMap.get(`${ri},${ci}`)
                  const mapColor = mapIdx !== undefined ? getMappingColor(mapIdx) : null
                  const style = inSel ? {} : mapColor ? { backgroundColor: mapColor.bg, color: mapColor.text } : {}
                  return (
                    <div
                      key={ci}
                      style={{ ...style, width: colWidths[ci] * (zoom / 100) }}
                      className={`shrink-0 flex items-center px-2 border border-gray-200 cursor-cell whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${
                        inSel ? 'bg-green-100 text-green-900' : mapColor ? '' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      onMouseDown={e => onMouseDown(ri, ci, e)}
                      onMouseEnter={() => onMouseEnter(ri, ci)}
                      onMouseUp={() => onMouseUp(ri, ci)}
                    >
                      {cellVal(ri, ci)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

      </div>

      {/* 하단 고정 컬럼 선택 패널 */}
      {pendingAddr && (
        <div className="shrink-0 border-t border-gray-300 bg-gray-50 px-4 py-2.5 flex flex-col gap-1.5">
          {/* 1줄: 범위/상태 + 자동 매칭 버튼 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-green-700 font-semibold">{pendingAddr}</span>
            <span className="text-[10px] text-gray-400">{selectedColumns.length}/{pendingColCount}열</span>
            {pendingParsed && pendingParsed.r1 > pendingParsed.r0 ? (
              hasHeaderRow && (
                <span className="text-[10px] text-gray-600 font-semibold">✓ 첫 행 헤더 기준 {selectedColumns.length}개 자동 매칭됨</span>
              )
            ) : (
              <span className="text-[10px] text-gray-300">헤더 행을 포함해 2행 이상 선택하면 자동 매칭을 쓸 수 있어요</span>
            )}
            <button
              onClick={autoMatchByHeader}
              disabled={!pendingParsed || pendingParsed.r1 <= pendingParsed.r0}
              className={`ml-auto text-[11px] font-semibold px-2.5 py-1 border transition-colors shrink-0 ${
                pendingParsed && pendingParsed.r1 > pendingParsed.r0
                  ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  : 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
              }`}
            >
              ✨ 헤더로 자동 매칭
            </button>
          </div>

          {/* 2줄: 컬럼 태그(Shift+클릭으로 순서 다중선택) + 취소/연결 */}
          <div className="flex items-center gap-3">
            <div className="flex flex-wrap gap-1 flex-1">
              {ALL_COLUMNS.map(col => {
                const idx = selectedColumns.indexOf(col)
                const isSelected = idx !== -1
                const disabled = !isSelected && selectedColumns.length >= pendingColCount
                return (
                  <button
                    key={col}
                    onClick={e => toggleColumn(col, e)}
                    disabled={disabled}
                    title="Shift+클릭으로 이전 선택 컬럼부터 순서대로 한번에 선택"
                    className={`px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-gray-800 text-white border-gray-800'
                        : disabled
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected && <span className="mr-0.5 text-[9px] opacity-70">{idx + 1}</span>}
                    {RECORD_COLUMN_LABELS[col]}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={cancelMapping} className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1">
                취소
              </button>
              <button
                onClick={confirmMapping}
                disabled={selectedColumns.length !== pendingColCount}
                className={`text-[11px] font-bold px-3 py-1 transition-colors ${
                  selectedColumns.length === pendingColCount
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
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
  )
}

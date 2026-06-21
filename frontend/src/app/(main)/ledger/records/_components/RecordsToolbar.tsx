// 내역 탭 — 상단 타이틀 줄 (제목·월 네비 + 점검/규칙/컬럼 + 초기화/행추가/가져오기/저장)
'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarCog, ChevronDown, ChevronLeft, ChevronRight, Columns3, Download, Plus, RotateCcw, Save, ScanSearch, Settings2, Trash2 as TrashIcon } from 'lucide-react'
import { RECORD_COLUMN_LABELS } from '@/features/ledger/record/types'
import type { RecordColumn } from '@/features/ledger/record/types'

interface Props {
  ledgerName:      string | null
  currentRecName:  string | null
  filteredCount:   number          // 현재 월 필터된 건수

  // 월 네비게이션
  availableMonths: string[]
  activeMonth:     string | null
  monthLabel:      string
  formatMonthLabel: (month: string) => string
  canPrev:         boolean
  canNext:         boolean
  shiftMonth:      (dir: 1 | -1) => void
  onSelectMonth:   (month: string) => void
  onOpenMonthManager: () => void

  // 점검 진행도
  reviewRemaining: number
  reviewTotal:     number

  // 컬럼 표시
  allColumns:      RecordColumn[]
  visibleColumns:  RecordColumn[]
  toggleColumn:    (col: RecordColumn) => void

  // 저장 상태
  hasRecords:      boolean
  saving:          boolean
  savedFeedback:   boolean

  // 액션 콜백
  onOpenReview:    () => void
  onOpenRules:     () => void
  onResetReview:   () => void
  onResetRecords:  () => void
  onAddRow:        () => void
  onUpload:        () => void
  uploading:       boolean
  onQuickSave:     () => void
  onSaveAs:        (name: string) => void
}

export function RecordsToolbar({
  ledgerName, currentRecName, filteredCount,
  availableMonths, activeMonth, monthLabel, formatMonthLabel,
  canPrev, canNext, shiftMonth, onSelectMonth, onOpenMonthManager,
  reviewRemaining, reviewTotal,
  allColumns, visibleColumns, toggleColumn,
  hasRecords, saving, savedFeedback,
  onOpenReview, onOpenRules, onResetReview, onResetRecords,
  onAddRow, onUpload, uploading, onQuickSave, onSaveAs,
}: Props) {
  const [columnsOpen, setColumnsOpen] = useState(false)
  const columnsRef = useRef<HTMLDivElement>(null)

  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false)
  const monthDropdownRef = useRef<HTMLDivElement>(null)

  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const saveAsInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef    = useRef<HTMLDivElement>(null)

  // 컬럼 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!columnsOpen) return
    function handler(e: MouseEvent) {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [columnsOpen])

  // 월 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!monthDropdownOpen) return
    function handler(e: MouseEvent) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) setMonthDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [monthDropdownOpen])

  function openSaveAs() {
    setSaveAsName(currentRecName ?? '')
    setSaveAsOpen(true)
    setTimeout(() => saveAsInputRef.current?.focus(), 0)
  }

  function confirmSaveAs() {
    const name = saveAsName.trim()
    if (!name) return
    onSaveAs(name)
    setSaveAsOpen(false)
  }

  return (
    <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
      {/* 좌: 제목 + 월 네비게이션 + 점검/규칙/컬럼 */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-semibold text-gray-800 shrink-0">{ledgerName ?? '내역'}</h1>
        <p className="text-[11px] text-gray-400 truncate">
          {currentRecName
            ? `${currentRecName}${filteredCount > 0 ? ` · ${filteredCount}건` : ''}`
            : filteredCount > 0
            ? `${filteredCount}건`
            : '내역을 선택하거나 새로 만들어보세요.'}
        </p>
        {availableMonths.length > 0 && (
          <div className="flex items-center gap-1 shrink-0 ml-1">
            <button onClick={() => shiftMonth(-1)} disabled={!canPrev}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <div className="relative" ref={monthDropdownRef}>
              <button
                onClick={() => setMonthDropdownOpen(o => !o)}
                className="text-xs font-semibold text-gray-700 min-w-[88px] text-center px-2 py-1 border border-gray-200 hover:border-gray-400 transition-colors"
              >
                {monthLabel}
              </button>
              {monthDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md py-0.5 w-[88px]">
                  {[...availableMonths].reverse().map(m => (
                    <button key={m}
                      onClick={() => { onSelectMonth(m); setMonthDropdownOpen(false) }}
                      className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${
                        m === activeMonth ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {formatMonthLabel(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => shiftMonth(1)} disabled={!canNext}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
            <button
              onClick={onOpenMonthManager}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors ml-1"
            >
              <CalendarCog size={12} />
              월 관리
            </button>
          </div>
        )}
        <button
          onClick={onOpenReview}
          className={`relative flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 transition-colors shrink-0 ml-1 border ${
            reviewRemaining > 0
              ? 'text-gray-800 border-gray-400 bg-gray-50 hover:bg-gray-100'
              : 'text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <ScanSearch size={12} />
          점검
          {reviewRemaining > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[15px] h-[15px] px-1 bg-red-500 text-white text-[9px] font-bold tabular-nums">
              {reviewRemaining}
            </span>
          )}
          {reviewTotal > 0 && reviewRemaining === 0 && (
            <span className="ml-0.5 text-[10px] font-bold text-gray-400">완료</span>
          )}
        </button>
        <button
          onClick={onOpenRules}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors shrink-0"
        >
          <Settings2 size={12} />
          규칙
        </button>
        <div className="relative shrink-0" ref={columnsRef}>
          <button
            onClick={() => setColumnsOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors"
          >
            <Columns3 size={12} />
            컬럼 표시
          </button>
          {columnsOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md py-1 min-w-[120px]">
              {allColumns.map(col => (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[11px] hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-3 shrink-0 ${visibleColumns.includes(col) ? 'text-gray-800' : 'text-transparent'}`}>✓</span>
                  <span className={visibleColumns.includes(col) ? 'text-gray-800' : 'text-gray-400'}>
                    {RECORD_COLUMN_LABELS[col]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우: 액션 */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onResetReview}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 border border-red-300 px-2.5 py-1 hover:bg-red-50 transition-colors"
        >
          <RotateCcw size={12} />
          리뷰 초기화
        </button>
        <button
          onClick={onResetRecords}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 border border-red-300 px-2.5 py-1 hover:bg-red-50 transition-colors"
        >
          <TrashIcon size={12} />
          내역 초기화
        </button>
        <button
          onClick={onAddRow}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors"
        >
          <Plus size={12} />
          행 추가
        </button>
        <button
          onClick={onUpload}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-300 px-2.5 py-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Download size={12} />
          {uploading ? '업로드 중...' : '가져오기'}
        </button>
        {hasRecords && (
          <div className="relative flex items-center" ref={dropdownRef}>
            <button
              onClick={onQuickSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              <Save size={11} />
              {savedFeedback ? '저장됨' : saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={openSaveAs}
              disabled={saving}
              className="self-stretch flex items-center justify-center px-1.5 bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors border-l border-white/20"
            >
              <ChevronDown size={11} />
            </button>
            {saveAsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md p-2" style={{ width: 180 }}>
                <p className="text-[10px] text-gray-400 mb-1.5">다른 이름으로 저장</p>
                <div className="flex items-center gap-1">
                  <input
                    ref={saveAsInputRef}
                    value={saveAsName}
                    onChange={e => setSaveAsName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmSaveAs()
                      if (e.key === 'Escape') setSaveAsOpen(false)
                    }}
                    onBlur={() => setSaveAsOpen(false)}
                    placeholder="내역 이름…"
                    className="w-0 flex-1 text-xs px-2 py-1 border border-gray-300 outline-none focus:border-gray-500"
                  />
                  <button
                    onMouseDown={e => { e.preventDefault(); confirmSaveAs() }}
                    className="shrink-0 text-xs font-bold px-2 py-1 bg-gray-800 text-white hover:bg-gray-700"
                  >
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

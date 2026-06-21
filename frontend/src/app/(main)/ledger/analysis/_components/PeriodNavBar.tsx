// 분석 탭 — 상단 타이틀 줄 (가계부명 + MTH/YR 토글 + 월/연 좌우 네비게이션·드롭다운)

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ViewMode } from '../_hooks/usePeriodNav'

interface Props {
  ledgerName:      string | null
  currentRecName:  string | null
  viewMode:        ViewMode
  setViewMode:     (m: ViewMode) => void
  navLabel:        string
  canPrev:         boolean
  canNext:         boolean
  shiftNav:        (dir: 1 | -1) => void
  activeMonth:     string | null
  availableMonths: string[]
  formatMonthLabel: (month: string) => string
  setRefMonth:     (m: string) => void
  dropdownOpen:    boolean
  setDropdown:     (v: boolean | ((v: boolean) => boolean)) => void
  dropdownRef:     React.RefObject<HTMLDivElement | null>
}

export function PeriodNavBar({
  ledgerName, currentRecName, viewMode, setViewMode, navLabel,
  canPrev, canNext, shiftNav, activeMonth, availableMonths, formatMonthLabel, setRefMonth,
  dropdownOpen, setDropdown, dropdownRef,
}: Props) {
  return (
    <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '분석'}</h1>
          {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
        </div>
        <div className="flex border border-gray-300 text-[10px] font-semibold overflow-hidden">
          {(['month', 'year'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 transition-colors ${
                viewMode === mode ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {mode === 'month' ? 'MTH' : 'YR'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftNav(-1)} disabled={!canPrev}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => viewMode === 'month' ? setDropdown(v => !v) : undefined}
              className={`text-xs font-semibold text-gray-700 min-w-[88px] text-center px-2 py-1 border border-gray-200 ${
                viewMode === 'month' ? 'hover:border-gray-400 cursor-pointer' : 'cursor-default'
              }`}
            >
              {navLabel}
            </button>
            {dropdownOpen && viewMode === 'month' && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md py-0.5 w-[88px]">
                {[...availableMonths].reverse().map(m => (
                  <button key={m}
                    onClick={() => { setRefMonth(m); setDropdown(false) }}
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
          <button onClick={() => shiftNav(1)} disabled={!canNext}
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

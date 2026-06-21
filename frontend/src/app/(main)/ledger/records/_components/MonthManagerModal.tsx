// 내역 탭 — 월 관리 모달: 여러 월을 체크해 한번에 삭제, 최신순/건수순 정렬 지원
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface MonthSummary {
  income:   number
  expense:  number
  transfer: number
}

interface Props {
  availableMonths:  string[]
  monthCounts:      Record<string, number>
  monthSummary:     Record<string, MonthSummary>
  activeMonth:       string | null
  formatMonthLabel: (month: string) => string
  onDelete:         (months: string[]) => void
  onClose:          () => void
}

function formatAmount(n: number): string {
  if (n === 0) return '0'
  return n >= 10000 ? `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}만` : n.toLocaleString()
}

type SortKey = 'recent' | 'oldest' | 'countDesc' | 'countAsc'

const SORT_LABELS: Record<SortKey, string> = {
  recent:    '최신순',
  oldest:    '오래된순',
  countDesc: '건수 많은순',
  countAsc:  '건수 적은순',
}

export function MonthManagerModal({ availableMonths, monthCounts, monthSummary, activeMonth, formatMonthLabel, onDelete, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sortOpen) return
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortOpen])

  const maxCount = Math.max(1, ...availableMonths.map(m => monthCounts[m] ?? 0))

  const sortedMonths = useMemo(() => {
    const months = [...availableMonths]
    if (sortKey === 'countDesc') return months.sort((a, b) => (monthCounts[b] ?? 0) - (monthCounts[a] ?? 0))
    if (sortKey === 'countAsc') return months.sort((a, b) => (monthCounts[a] ?? 0) - (monthCounts[b] ?? 0))
    if (sortKey === 'oldest') return months
    return months.reverse()
  }, [availableMonths, monthCounts, sortKey])

  function toggle(month: string) {
    if (month === activeMonth) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  const selectableMonths = availableMonths.filter(m => m !== activeMonth)
  const allSelected = selectableMonths.length > 0 && selectableMonths.every(m => selected.has(m))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableMonths))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="bg-white w-[400px] max-h-[70vh] border border-gray-300 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <p className="text-[13px] font-bold text-gray-800">월 관리</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={15} /></button>
        </div>

        <div ref={sortRef} className="relative flex items-center justify-between px-5 py-1.5 border-b border-gray-100">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="accent-gray-800"
            />
            전체 선택
          </label>
          <button
            onClick={() => setSortOpen(o => !o)}
            className="text-[10px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          >
            {SORT_LABELS[sortKey]} ▾
          </button>
          {sortOpen && (
            <div className="absolute right-5 top-full mt-1 z-10 bg-white border border-gray-300 shadow-md py-1 min-w-[100px]">
              {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => { setSortKey(key); setSortOpen(false) }}
                  className={`block w-full text-left px-3 py-1.5 text-[11px] hover:bg-gray-50 transition-colors ${
                    sortKey === key ? 'text-gray-900 font-semibold' : 'text-gray-500'
                  }`}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {sortedMonths.map(m => {
            const isCurrent = m === activeMonth
            const isChecked = selected.has(m)
            const count = monthCounts[m] ?? 0
            const barWidth = `${Math.max(4, (count / maxCount) * 100)}%`
            const summary = monthSummary[m] ?? { income: 0, expense: 0, transfer: 0 }
            return (
              <label
                key={m}
                className={`flex items-center gap-2.5 px-5 py-2 transition-colors ${
                  isCurrent ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isCurrent}
                  onChange={() => toggle(m)}
                  className="accent-gray-800 disabled:cursor-not-allowed"
                />
                <span className="shrink-0 w-9 text-xs text-gray-400 tabular-nums text-right">{count}건</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between text-xs text-gray-700">
                    <span>{formatMonthLabel(m)}</span>
                    {isCurrent && <span className="text-[10px] text-gray-400 shrink-0">현재 보는 중</span>}
                  </span>
                  <span className="block mt-1 h-1 bg-gray-100">
                    <span className="block h-full bg-gray-400" style={{ width: barWidth }} />
                  </span>
                  <span className="flex items-center gap-2 mt-1 text-[10px] tabular-nums">
                    <span className="text-blue-500">수입 {formatAmount(summary.income)}</span>
                    <span className="text-red-500">지출 {formatAmount(summary.expense)}</span>
                    <span className="text-gray-400">이체 {formatAmount(summary.transfer)}</span>
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <span className="text-[11px] text-gray-400">
            {selected.size > 0 ? `${selected.size}개 선택됨` : ''}
          </span>
          <button
            onClick={() => onDelete(Array.from(selected))}
            disabled={selected.size === 0}
            className="text-xs font-bold text-white bg-gray-900 px-3 py-1.5 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            선택 삭제
          </button>
        </div>
      </div>
    </div>
  )
}

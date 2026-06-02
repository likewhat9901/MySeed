// 일기 캘린더 — 월별 그리드, 무드 아이콘, 월 네비게이션
'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react'
import type { DiaryEntry } from '@/features/ledger/diary/types'

interface Props {
  year:          number
  month:         number           // 1~12
  entries:       DiaryEntry[]     // 해당 월 엔트리
  todayStr:      string           // YYYY-MM-DD
  onMonthChange: (year: number, month: number) => void
  onDayClick:    (dateStr: string) => void
  onTodayClick:  () => void
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const MOOD_EMOJI: Record<string, string> = {
  good: '😊', neutral: '😐', bad: '😞',
}

export default function DiaryCalendar({
  year, month, entries, todayStr, onMonthChange, onDayClick, onTodayClick,
}: Props) {
  const todayYear  = Number(todayStr.slice(0, 4))
  const todayMonth = Number(todayStr.slice(5, 7))
  const isCurrentMonth = year === todayYear && month === todayMonth
  const canNext = !isCurrentMonth

  function shiftMonth(delta: 1 | -1) {
    const d = new Date(year, month - 1 + delta, 1)
    onMonthChange(d.getFullYear(), d.getMonth() + 1)
  }

  // 엔트리 인덱스 (date → entry)
  const entryMap = useMemo(() => {
    const m = new Map<string, DiaryEntry>()
    for (const e of entries) m.set(e.date, e)
    return m
  }, [entries])

  // 캘린더 셀 빌드
  const cells = useMemo(() => {
    const firstDow  = new Date(year, month - 1, 1).getDay() // 0=Sun
    const lastDay   = new Date(year, month, 0).getDate()
    const prefix    = `${year}-${String(month).padStart(2, '0')}-`
    const result: Array<null | { day: number; dateStr: string }> = []

    for (let i = 0; i < firstDow; i++) result.push(null)
    for (let d = 1; d <= lastDay; d++) {
      result.push({ day: d, dateStr: `${prefix}${String(d).padStart(2, '0')}` })
    }
    return result
  }, [year, month])

  const monthLabel = `${year}년 ${month}월`

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1 rounded text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[90px] text-center">
            {monthLabel} 일기
          </span>
          <button
            onClick={() => shiftMonth(1)}
            disabled={!canNext}
            className="p-1 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          onClick={onTodayClick}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand transition-colors px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-brand"
        >
          <PenLine size={12} /> 오늘 일기 쓰기
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-300 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} />

          const { day, dateStr } = cell
          const isToday  = dateStr === todayStr
          const isFuture = dateStr > todayStr
          const entry    = entryMap.get(dateStr)

          return (
            <div key={dateStr} className="flex flex-col items-center gap-0.5 py-0.5">
              {/* 날짜 숫자 */}
              <span className={`text-[10px] leading-none ${
                isToday ? 'font-bold text-brand' : 'text-gray-400'
              }`}>
                {day}{isToday && <span className="ml-0.5 text-[8px] text-brand">◀</span>}
              </span>

              {/* 셀 내용 */}
              <button
                onClick={() => !isFuture && onDayClick(dateStr)}
                disabled={isFuture}
                className={`w-8 h-7 flex items-center justify-center rounded-lg text-sm transition-colors ${
                  isFuture
                    ? 'cursor-default'
                    : 'hover:bg-gray-100 cursor-pointer'
                } ${isToday && !entry ? 'border border-dashed border-gray-300' : ''}`}
              >
                {isFuture ? (
                  <span className="text-gray-200 text-[10px]">·</span>
                ) : entry ? (
                  <span>{MOOD_EMOJI[entry.mood]}</span>
                ) : (
                  <span className="text-gray-300 text-[10px] tracking-tighter">
                    {isToday ? '+' : '─'}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="mt-4 border border-gray-100 rounded-lg px-3 py-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
          <span>😊 만족</span>
          <span>😐 보통</span>
          <span>😞 후회 있음</span>
          <span className="text-gray-300">─ 작성 안 함</span>
          <span className="text-gray-200">· 미래</span>
        </div>
      </div>
    </div>
  )
}

// /ledger/diary — 일기 탭 (캘린더 + 이번달 요약)
'use client'

import { useMemo, useState } from 'react'
import { useLedgerContext } from '../_context/LedgerContext'
import { useDiaryEntries } from '@/features/ledger/diary/storage'
import type { DiaryMood } from '@/features/ledger/diary/types'
import DiaryCalendar from './_components/DiaryCalendar'
import DiaryMonthlySummary from './_components/DiaryMonthlySummary'
import DiaryEntryModal from './_components/DiaryEntryModal'
import RecentDiaryCard from './_components/RecentDiaryCard'

export default function DiaryPage() {
  const { ledgerName, currentRecName, canvasId, refMonth } = useLedgerContext()
  const { entries, upsert, remove } = useDiaryEntries()

  const todayStr = new Date().toISOString().slice(0, 10)
  const initMonth = refMonth ?? todayStr.slice(0, 7)

  const [displayYear,  setDisplayYear]  = useState(() => Number(initMonth.slice(0, 4)))
  const [displayMonth, setDisplayMonth] = useState(() => Number(initMonth.slice(5, 7)))
  const [modalDate, setModalDate] = useState<string | null>(null)

  const monthKey = `${displayYear}-${String(displayMonth).padStart(2, '0')}`

  // 이 가계부의 이번 표시월 엔트리
  const monthEntries = useMemo(
    () => entries.filter(e => e.date.startsWith(monthKey) && (e.ledId === canvasId || e.ledId === null)),
    [entries, monthKey, canvasId],
  )

  // streak 계산용 전체 엔트리 (가계부 필터만)
  const ledgerEntries = useMemo(
    () => entries.filter(e => e.ledId === canvasId || e.ledId === null),
    [entries, canvasId],
  )

  const modalEntry = useMemo(
    () => modalDate
      ? entries.find(e => e.date === modalDate && (e.ledId === canvasId || e.ledId === null))
      : undefined,
    [entries, modalDate, canvasId],
  )

  function handleSave(mood: DiaryMood, text: string) {
    if (!modalDate) return
    upsert(modalDate, canvasId, mood, text)
    setModalDate(null)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* 페이지 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '일기'}</h1>
          {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
        </div>
      </div>

      <div className="px-5 py-4 max-w-5xl mx-auto flex flex-col gap-4">
        <div className="grid grid-cols-[2fr_1fr] gap-4">
          <DiaryCalendar
            year={displayYear}
            month={displayMonth}
            entries={monthEntries}
            todayStr={todayStr}
            onMonthChange={(y, m) => { setDisplayYear(y); setDisplayMonth(m) }}
            onDayClick={setModalDate}
            onTodayClick={() => setModalDate(todayStr)}
          />
          <DiaryMonthlySummary
            monthEntries={monthEntries}
            allEntries={ledgerEntries}
            displayMonth={monthKey}
            todayStr={todayStr}
          />
        </div>
        <RecentDiaryCard ledId={canvasId} />
      </div>

      {modalDate && (
        <DiaryEntryModal
          date={modalDate}
          existingEntry={modalEntry}
          onSave={handleSave}
          onDelete={modalEntry ? () => { remove(modalEntry.id); setModalDate(null) } : undefined}
          onClose={() => setModalDate(null)}
        />
      )}
    </div>
  )
}

// 일기 — 이번달 요약 패널 (작성일수·후회·연속·키워드)
'use client'

import { useMemo } from 'react'
import type { DiaryEntry } from '@/features/ledger/diary/types'

interface Props {
  monthEntries: DiaryEntry[]   // 현재 표시 월 + ledId 필터된 엔트리
  allEntries:   DiaryEntry[]   // streak 계산용 전체 엔트리 (ledId 필터만)
  displayMonth: string         // 'YYYY-MM'
  todayStr:     string         // 'YYYY-MM-DD'
}

const STOPWORDS = new Set([
  '이', '가', '은', '는', '을', '를', '에', '에서', '의', '도', '와', '과',
  '로', '으로', '그', '저', '나', '오늘', '어제', '내일', '좀', '더', '또',
  '다', '있', '없', '하', '됐', '했', '일', '것', '수', '때', '그냥', '너무',
])

function extractKeywords(entries: DiaryEntry[]) {
  const freq = new Map<string, number>()
  for (const e of entries) {
    const tokens = e.text.split(/[\s,.!?]+/).filter(t => t.length >= 2 && !STOPWORDS.has(t))
    for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
  }
  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

function calcStreak(entries: DiaryEntry[], todayStr: string): number {
  const dateSet = new Set(entries.map(e => e.date))
  let streak = 0
  const d = new Date(todayStr)
  // 오늘 미작성이면 어제부터
  if (!dateSet.has(todayStr)) d.setDate(d.getDate() - 1)
  while (true) {
    const ds = d.toISOString().slice(0, 10)
    if (!dateSet.has(ds)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function DiaryMonthlySummary({ monthEntries, allEntries, displayMonth, todayStr }: Props) {
  const isCurrentMonth = todayStr.startsWith(displayMonth)
  const todayDay = Number(todayStr.slice(8, 10))
  const [y, m] = displayMonth.split('-').map(Number)
  const totalDays = new Date(y, m, 0).getDate()
  const daysElapsed = isCurrentMonth ? todayDay : totalDays

  const writtenDays = useMemo(() => {
    const dates = new Set(monthEntries.map(e => e.date))
    return dates.size
  }, [monthEntries])

  const badCount = useMemo(
    () => monthEntries.filter(e => e.mood === 'bad').length,
    [monthEntries],
  )

  const streak = useMemo(
    () => calcStreak(allEntries, todayStr),
    [allEntries, todayStr],
  )

  const keywords = useMemo(() => extractKeywords(monthEntries), [monthEntries])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex flex-col gap-5 h-full">
      <p className="text-sm font-semibold text-gray-800">이번달 요약</p>

      {/* 작성한 날 */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1">작성한 날</p>
        <p className="text-2xl font-extrabold text-gray-800 tabular-nums leading-tight">
          {writtenDays}
          <span className="text-sm font-medium text-gray-400 ml-1">/ {daysElapsed}일</span>
        </p>
      </div>

      {/* 후회 표시 */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1">후회 표시</p>
        <p className="text-2xl font-extrabold text-red-400 tabular-nums leading-tight">
          {badCount}
          <span className="text-sm font-medium text-gray-400 ml-1">건</span>
        </p>
      </div>

      {/* 연속 작성 */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-1">연속 작성</p>
        <p className="text-2xl font-extrabold text-gray-800 tabular-nums leading-tight">
          {streak > 0 ? (
            <>🔥 {streak}<span className="text-sm font-medium text-gray-400 ml-1">일</span></>
          ) : (
            <span className="text-gray-300 text-sm font-medium">없음</span>
          )}
        </p>
      </div>

      {/* 자주 나온 단어 */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">자주 나온 단어</p>
        {keywords.length === 0 ? (
          <p className="text-[11px] text-gray-300">일기를 쓰면 키워드가 분석돼요.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {keywords.map(k => (
              <div key={k.word} className="flex items-center justify-between text-[11px]">
                <span className="text-gray-600">• {k.word}</span>
                <span className="text-gray-400 tabular-nums">({k.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

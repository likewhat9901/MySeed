// 목표 탭 하단 — 최근 일기 3건 미리보기 카드
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useDiaryEntries } from '@/features/ledger/diary/storage'

interface Props {
  ledId:  string | null
}

const MOOD_EMOJI: Record<string, string> = {
  good: '😊', neutral: '😐', bad: '😞',
}

function fmtDate(dateStr: string) {
  const [, m, d] = dateStr.split('-')
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(dateStr).getDay()]
  return `${Number(m)}/${Number(d)} (${dow})`
}

export default function RecentDiaryCard({ ledId }: Props) {
  const { entries } = useDiaryEntries()
  const diaryHref = ledId ? `/ledger/diary?led=${ledId}` : '/ledger/diary'

  const recent = useMemo(() =>
    entries
      .filter(e => e.ledId === ledId || e.ledId === null)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5),
    [entries, ledId],
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 min-h-[200px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-800">최근 일기</p>
        <Link
          href={diaryHref}
          className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-brand transition-colors"
        >
          전체 보기 <ArrowRight size={11} />
        </Link>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-gray-300 py-4 text-center">아직 일기가 없어요.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {recent.map(e => (
            <div key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="text-[11px] text-gray-400 shrink-0 tabular-nums w-16">{fmtDate(e.date)}</span>
              <span className="text-base shrink-0">{MOOD_EMOJI[e.mood]}</span>
              <p className="text-xs text-gray-600 truncate min-w-0">{e.text || '(내용 없음)'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

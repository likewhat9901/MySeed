// 현황 — 후회 요약 카드 (핵심 숫자만, 상세는 아래 RegretSection으로 유도)
'use client'

import { useMemo } from 'react'
import { ArrowDown } from 'lucide-react'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface Props {
  records: LedgerRecord[]      // 이번 기간 필터된 내역
  allRecords: LedgerRecord[]   // 전월 비교용 전체 기간
  refMonth: string             // 'YYYY-MM'
  onDetailClick: () => void
}

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000)}만`
  return `₩${n.toLocaleString()}`
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function RegretSummaryCard({ records, allRecords, refMonth, onDetailClick }: Props) {
  const { regretTotal, expenseTotal, regretCount } = useMemo(() => {
    let expenseTotal = 0, regretTotal = 0, regretCount = 0
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      expenseTotal += r.amount
      if (r.review === 'bad') { regretTotal += r.amount; regretCount++ }
    }
    return { regretTotal, expenseTotal, regretCount }
  }, [records])

  const prevRegret = useMemo(() => {
    if (!refMonth) return 0
    const prev = shiftMonth(refMonth, -1)
    let s = 0
    for (const r of allRecords) {
      if (r.type !== '지출' || r.review !== 'bad') continue
      if (r.date.startsWith(prev)) s += r.amount
    }
    return s
  }, [allRecords, refMonth])

  const ratioPct = expenseTotal > 0 ? Math.round((regretTotal / expenseTotal) * 100) : 0
  const deltaPct = prevRegret > 0 ? Math.round(((regretTotal - prevRegret) / prevRegret) * 100) : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex flex-col">
      <p className="text-sm font-semibold text-gray-800 mb-3">후회 요약</p>

      {regretCount === 0 ? (
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-xs text-gray-300">아직 후회로 표시한 지출이 없어요.</p>
          <p className="text-[11px] text-gray-300 mt-1">내역에서 😞를 체크하면 집계돼요.</p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-red-500 tabular-nums leading-none">{fmtW(regretTotal)}</p>
            {deltaPct !== null && (
              <span className={`text-sm font-semibold tabular-nums ${deltaPct <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {deltaPct <= 0 ? '▼' : '▲'}{Math.abs(deltaPct)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            전체 지출의 <span className="font-semibold text-gray-700">{ratioPct}%</span>
          </p>
          {deltaPct !== null && (
            <p className="text-[11px] text-gray-400 mt-0.5 tabular-nums">지난달 {fmtW(prevRegret)}</p>
          )}
        </>
      )}

      <button
        onClick={onDetailClick}
        className="mt-auto pt-3 flex items-center justify-center gap-1 text-[11px] font-medium text-gray-400 hover:text-brand transition-colors"
      >
        후회 자세히 <ArrowDown size={12} />
      </button>
    </div>
  )
}

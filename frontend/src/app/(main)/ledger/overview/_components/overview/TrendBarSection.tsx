// 현황 — 기간별 지출 바 차트 + 트렌드 인사이트 카드
'use client'

import { useMemo } from 'react'

interface DayData { day: number; amount: number; isToday: boolean }

interface Props {
  dailyExpense: DayData[]
  refMonth: string
}

function fmtK(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

export default function TrendBarSection({ dailyExpense, refMonth }: Props) {
  const max = Math.max(...dailyExpense.map(d => d.amount), 1)
  const hasData = dailyExpense.some(d => d.amount > 0)
  const [, m] = (refMonth || '-').split('-')
  const mid = Math.floor(dailyExpense.length / 2)

  const insights = useMemo(() => {
    const withData = dailyExpense.filter(d => d.amount > 0)
    if (withData.length === 0) return null

    const total = withData.reduce((s, d) => s + d.amount, 0)
    const avg = Math.round(total / withData.length)
    const peak = withData.reduce((best, d) => d.amount > best.amount ? d : best, withData[0])
    const today = dailyExpense.find(d => d.isToday)
    const todayVsAvg = today && avg > 0 ? Math.round(((today.amount - avg) / avg) * 100) : null
    const overAvgDays = withData.filter(d => d.amount > avg).length

    return { avg, peak, todayVsAvg, today, overAvgDays, totalDays: withData.length }
  }, [dailyExpense])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '320px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <p className="text-xs font-semibold text-gray-800">Trend</p>
        <span className="text-[11px] text-gray-400">{dailyExpense.length} items</span>
      </div>

      <div className="px-4 pt-3 pb-2 shrink-0">
        {!hasData ? (
          <p className="text-xs text-gray-300 py-4 text-center">지출 내역이 없어요.</p>
        ) : (
          <>
            <div className="flex items-end gap-px" style={{ height: '72px' }}>
              {dailyExpense.map(d => {
                const heightPct = d.amount > 0 ? Math.max((d.amount / max) * 100, 5) : 0
                return (
                  <div
                    key={d.day}
                    className="flex-1 flex items-end"
                    style={{ height: '72px' }}
                    title={`${m ? Number(m) + '/' : ''}${d.day}: ₩${d.amount.toLocaleString()}`}
                  >
                    {d.amount > 0 ? (
                      <div
                        className={`w-full rounded-sm transition-all ${d.isToday ? 'bg-orange-400' : 'bg-gray-700'}`}
                        style={{ height: `${heightPct}%` }}
                      />
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-gray-200 mx-auto" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="relative h-4 mt-1">
              <span className="absolute left-0 text-[9px] text-gray-400">
                {m ? `${Number(m)}월 1` : '1'}
              </span>
              {dailyExpense.length > 10 && (
                <span
                  className="absolute text-[9px] text-gray-400"
                  style={{ left: `${(mid / Math.max(dailyExpense.length - 1, 1)) * 100}%`, transform: 'translateX(-50%)' }}
                >
                  {m ? `${Number(m)}월 ` : ''}{dailyExpense[mid]?.day}
                </span>
              )}
              <span className="absolute right-0 text-[9px] text-orange-400 font-medium">
                {dailyExpense.some(d => d.isToday) ? 'Today' : String(dailyExpense[dailyExpense.length - 1]?.day ?? '')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 트렌드 인사이트 */}
      <div className="px-4 pt-2 pb-4 border-t border-gray-100 flex-1 flex flex-col justify-center gap-2.5">
        {!insights ? (
          <p className="text-xs text-gray-300 text-center">데이터가 없어요.</p>
        ) : (
          <>
            {/* 평균 지출 */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">평균 지출</span>
              <span className="text-[11px] font-semibold text-gray-700 tabular-nums">{fmtK(insights.avg)}</span>
            </div>

            {/* 최고 지출일 */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">최고 지출</span>
              <span className="text-[11px] font-semibold text-gray-700 tabular-nums">
                {fmtK(insights.peak.amount)}
                <span className="text-gray-400 font-normal ml-1">({m ? `${Number(m)}/` : ''}{insights.peak.day})</span>
              </span>
            </div>

            {/* 오늘 vs 평균 */}
            {insights.todayVsAvg !== null && insights.today && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">오늘 vs 평균</span>
                <span className={`text-[11px] font-semibold tabular-nums ${insights.todayVsAvg > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {insights.todayVsAvg > 0 ? '+' : ''}{insights.todayVsAvg}%
                  <span className="text-gray-400 font-normal ml-1">({fmtK(insights.today.amount)})</span>
                </span>
              </div>
            )}

            {/* 평균 초과일 */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">평균 초과일</span>
              <span className="text-[11px] font-semibold text-gray-700">
                {insights.overAvgDays}일
                <span className="text-gray-400 font-normal ml-1">/ {insights.totalDays}일</span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

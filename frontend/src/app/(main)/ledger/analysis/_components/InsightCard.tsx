// 분석 탭 — 후회 요약 우측 인사이트 패널 (카테고리/시간/결제 주의 제안 + 전월 대비)

import { fmtW } from '../_utils/format'
import type { ViewMode } from '../_hooks/usePeriodNav'
import type { CategoryStat, TimeStat, PaymentStat } from '../_hooks/useRegretAnalysis'

interface Props {
  viewMode:      ViewMode
  regretTotal:   number
  vsRegret:      number | null
  categoryStats: CategoryStat[]
  timeStats:     TimeStat[]
  paymentStats:  PaymentStat[]
}

export function InsightCard({ viewMode, regretTotal, vsRegret, categoryStats, timeStats, paymentStats }: Props) {
  const topCat = categoryStats[0]

  return (
    <div className="w-1/2 min-w-0 px-4 py-3 bg-gray-50 flex flex-col gap-2">
      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">💡 INSIGHT</p>
      {!topCat ? (
        <p className="text-[11px] text-gray-400">분석할 후회 데이터가 부족해요.</p>
      ) : (() => {
        const concentratePct = Math.round((topCat.regretAmt / regretTotal) * 100)
        const topTime = timeStats[0]
        const topPay  = paymentStats[0]
        const payPct  = topPay ? Math.round(topPay.ratio * 100) : 0
        return (
          <>
            {/* 카테고리 제안 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="text-red-400 text-[10px] font-bold">⚠</span>
                <p className="text-[11px] text-gray-700">
                  <span className="font-semibold text-gray-800">{topCat.label}</span> 지출 전에 멈추세요
                </p>
              </div>
              <p className="text-[10px] text-gray-400 tabular-nums pl-3.5">
                후회율 1위 · {fmtW(topCat.regretAmt)} 날렸어요
              </p>
              <div className="flex items-center gap-1.5 pl-3.5">
                <div className="flex-1 h-1 bg-gray-200">
                  <div className="h-full bg-red-400 transition-all" style={{ width: `${concentratePct}%` }} />
                </div>
                <span className="text-[9px] font-bold text-red-400 tabular-nums w-6 text-right shrink-0">{concentratePct}%</span>
              </div>
            </div>

            {/* 시간 제안 */}
            {topTime && (
              <div className="flex flex-col gap-0.5 border-t border-gray-200 pt-2">
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-[10px] font-bold">⚠</span>
                  <p className="text-[11px] text-gray-700">
                    <span className="font-semibold text-gray-800">{topTime.label}</span> 결제를 참으세요
                  </p>
                </div>
                <p className="text-[10px] text-gray-400 tabular-nums pl-3.5">
                  충동 구매가 몰리는 시간대예요
                </p>
              </div>
            )}

            {/* 결제수단 제안 */}
            {topPay && topPay.regret > 0 && (
              <div className="flex flex-col gap-1 border-t border-gray-200 pt-2">
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-[10px] font-bold">⚠</span>
                  <p className="text-[11px] text-gray-700 truncate">
                    <span className="font-semibold text-gray-800">{topPay.label}</span> 쓸 때 한번 더요
                  </p>
                </div>
                <div className="flex items-center gap-1.5 pl-3.5">
                  <div className="flex-1 h-1 bg-gray-200">
                    <div className="h-full bg-orange-400 transition-all" style={{ width: `${payPct}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-orange-400 tabular-nums w-6 text-right shrink-0">{payPct}%</span>
                </div>
              </div>
            )}

            {/* 전월 대비 */}
            {viewMode === 'month' && (
              <p className="text-[10px] text-gray-500 mt-auto pt-2 border-t border-gray-200 tabular-nums">
                {vsRegret != null ? (
                  <>
                    전월보다{' '}
                    <span className={`font-bold ${vsRegret <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {vsRegret <= 0 ? '▼' : '▲'}{Math.abs(vsRegret)}%
                    </span>
                    {'  →  '}
                    <span className="font-semibold text-gray-700">{fmtW(regretTotal)}</span>
                  </>
                ) : (
                  <>줄였으면 순수입 <span className="font-semibold text-gray-700">{fmtW(regretTotal)} ↑</span></>
                )}
              </p>
            )}
          </>
        )
      })()}
    </div>
  )
}

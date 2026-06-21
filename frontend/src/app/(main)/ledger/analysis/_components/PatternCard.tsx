// 분석 탭 — 패턴 카드 (상단: 시간대 히트맵 / 하단: 결제수단 후회율)

import { fmtW } from '../_utils/format'
import { TIME_BANDS } from '../_hooks/useRegretAnalysis'
import type { HeatCell, HeatTotal, PaymentStat } from '../_hooks/useRegretAnalysis'

const TIME_RANGES = ['0~6', '6~12', '12~18', '18~22', '22~24']

interface Props {
  heatmap:      { weekday: HeatCell[]; weekend: HeatCell[] }
  heatMaxCount: number
  weekdayTotal: HeatTotal
  weekendTotal: HeatTotal
  paymentStats: PaymentStat[]
}

export function PatternCard({ heatmap, heatMaxCount, weekdayTotal, weekendTotal, paymentStats }: Props) {
  const block = (count: number) => {
    const r = count / heatMaxCount
    if (r === 0) return <span className="text-gray-200">·</span>
    if (r < 0.34) return <span className="text-red-200">░</span>
    if (r < 0.67) return <span className="text-red-400">▒</span>
    if (r < 1)    return <span className="text-red-500">▓</span>
    return <span className="text-red-600">█</span>
  }
  const rows = [
    { label: '평일', data: heatmap.weekday, total: weekdayTotal },
    { label: '주말', data: heatmap.weekend, total: weekendTotal },
  ]

  return (
    <div className="bg-white border border-gray-300 flex flex-col divide-y divide-gray-100">

      {/* 상단 절반: TIME PATTERN */}
      <div className="flex-1 px-4 py-3 flex flex-col">
        <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-2">🕐 TIME PATTERN</p>
        <div className="text-[11px] w-full flex flex-col justify-center flex-1">
          {/* 시간대 이름 헤더 */}
          <div className="flex items-center mb-0.5">
            <span className="w-7 shrink-0" />
            <div className="flex flex-1">
              {TIME_BANDS.map(b => (
                <span key={b} className="flex-1 text-center text-[8px] text-gray-400 leading-none">{b}</span>
              ))}
            </div>
            <span className="w-20 shrink-0" />
          </div>
          {/* 히트맵 행 */}
          {rows.map(row => (
            <div key={row.label} className="flex items-center leading-5">
              <span className="w-7 shrink-0 text-[10px] text-gray-500">{row.label}</span>
              <div className="flex flex-1">
                {row.data.map((h, i) => (
                  <span key={i} className="flex-1 text-center text-[13px] font-mono">{block(h.count)}</span>
                ))}
              </div>
              <span className="w-20 shrink-0 flex items-center justify-end gap-1.5 text-[11px] tabular-nums whitespace-nowrap">
                {row.total.count > 0 && (
                  <>
                    <span className="text-gray-500">{row.total.count}건</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-700 font-semibold">{fmtW(row.total.amount)}</span>
                  </>
                )}
              </span>
            </div>
          ))}
          {/* 시간 레인지 푸터 */}
          <div className="flex items-center mt-0.5">
            <span className="w-7 shrink-0" />
            <div className="flex flex-1">
              {TIME_RANGES.map(r => (
                <span key={r} className="flex-1 text-center text-[7px] text-gray-300 leading-none">{r}</span>
              ))}
            </div>
            <span className="w-20 shrink-0" />
          </div>
        </div>
      </div>

      {/* 하단 절반: PAYMENT */}
      {paymentStats.length > 0 && (
        <div className="flex-1 px-4 py-3 flex flex-col">
          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-2">💳 PAYMENT</p>
          <div className="flex flex-col gap-2 flex-1 justify-center">
            {paymentStats.map(p => {
              const pct = Math.round(p.ratio * 100)
              return (
                <div key={p.label} className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-gray-700 truncate">{p.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-gray-200">
                      <div className="h-full bg-orange-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="shrink-0 flex items-center gap-1 tabular-nums text-[10px] whitespace-nowrap">
                      <span className="text-red-500 font-semibold">{pct}%</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-500">{p.regret}건</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-700 font-semibold">{fmtW(p.regretAmt)}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

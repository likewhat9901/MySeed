// 분석 탭 — 후회 추이 차트 (일별/월별 막대 + 누적 라인 + 요약 지표 3칸)

import { SectionLabel } from './SectionLabel'
import { fmtW, niceCeil } from '../_utils/format'
import type { ViewMode } from '../_hooks/usePeriodNav'
import type { TrendBucket } from '../_hooks/useRegretAnalysis'

interface Props {
  viewMode:    ViewMode
  regretTrend: TrendBucket[]
  vsRegret:    number | null
  prevRegret:  number
}

export function TrendSection({ viewMode, regretTrend, vsRegret, prevRegret }: Props) {
  const last = regretTrend[regretTrend.length - 1]
  const n = regretTrend.length

  // 좌축(누적 라인) / 우축(일별 막대) — 각자 깔끔한 상한
  const cumMax   = niceCeil(Math.max(...regretTrend.map(t => t.regret), 1))
  const dailyMax = niceCeil(Math.max(...regretTrend.map(t => t.daily), 1))
  const yTicks = [1, 0.5, 0]   // 비율 (상단→하단)

  // x: 양끝에 6% 여백
  const PAD = 6
  const px = (i: number) => n === 1 ? 50 : PAD + (i / (n - 1)) * (100 - PAD * 2)
  const py = (v: number) => 100 - (v / cumMax) * 100   // 누적 라인 (좌축)

  // 누적 라인 — 모노톤 큐빅 패스
  const pts = regretTrend.map((t, i) => [px(i), py(t.regret)] as const)
  const clampY = (y: number) => Math.max(0, Math.min(100, y))
  let linePath = pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : ''
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6 * 0.5, c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6 * 0.5)
    const c2x = p2[0] - (p3[0] - p1[0]) / 6 * 0.5, c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6 * 0.5)
    linePath += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }

  const unitLabel = viewMode === 'month' ? '일별' : '월별'
  const barW = viewMode === 'month' ? 1.6 : 3   // 막대 폭(%)

  // 최고 후회 버킷
  const peak = regretTrend.reduce((a, b) => b.daily > a.daily ? b : a, regretTrend[0])
  const peakLabel = viewMode === 'month' ? `${peak.label}일` : peak.label
  // 건당 평균 후회액
  const avgPerCnt = last.regretCnt > 0 ? Math.round(last.regret / last.regretCnt) : 0

  return (
    <div>
      <SectionLabel label="Regret Trend — 후회 추이" />
      <div className="bg-white border border-gray-300 px-5 py-4">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] font-semibold text-gray-800">후회 금액 {unitLabel} 추이</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-red-200" />{unitLabel} 후회</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />누적</span>
          </div>
        </div>

        {/* 차트 영역 — 좌축(40px) + 플롯 + 우축(40px) */}
        <div className="flex relative">
          {/* y 그리드 — 카드 안쪽 끝부터 끝까지 */}
          {yTicks.map((_, i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-gray-200"
              style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }} />
          ))}

          {/* 좌축 — 누적 */}
          <div className="w-10 shrink-0 relative h-24">
            {yTicks.map((r, i) => (
              <span key={i}
                className="absolute right-1.5 text-[9px] text-red-400 tabular-nums -translate-y-1/2 bg-white px-0.5"
                style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }}>
                {fmtW(Math.round(cumMax * r))}
              </span>
            ))}
          </div>

          {/* 플롯 */}
          <div className="relative flex-1 h-24">
            {/* 일별 막대 (라인 뒤) + 막대 위 금액 라벨 */}
            {regretTrend.map((t, i) => t.daily > 0 && (
              <div key={t.key}
                className="absolute bottom-0 -translate-x-1/2 bg-red-200 rounded-sm"
                style={{ left: `${px(i)}%`, width: `${barW}%`, height: `${(t.daily / dailyMax) * 100}%` }}>
                <span className="absolute left-1/2 -translate-x-1/2 -top-3.5 whitespace-nowrap text-[8px] text-red-400 tabular-nums">
                  {t.daily >= 10_000 ? `${(t.daily / 10_000).toFixed(1)}만` : `${(t.daily / 1000).toFixed(1)}천`}
                </span>
              </div>
            ))}

            {/* 누적 라인 (좌축 기준) */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              <path d={linePath} fill="none" stroke="#f87171" strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* 마지막 점 + 누적 금액 라벨 */}
            {last.regret > 0 && (
              <div className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${px(n - 1)}%`, top: `${py(last.regret)}%` }}>
                <span className="absolute left-1/2 -translate-x-1/2 -top-4 whitespace-nowrap text-[10px] font-bold text-red-500 tabular-nums">
                  {fmtW(last.regret)}
                </span>
                <div className="w-2 h-2 rounded-full bg-white border-[1.5px] border-red-400" />
              </div>
            )}
          </div>
        </div>

        {/* x축 라벨 — 모든 날짜, 주말은 빨강 */}
        <div className="flex mt-1">
          <div className="w-10 shrink-0" />
          <div className="relative flex-1 h-4">
            {regretTrend.map((t, i) => t.showLabel && (
              <span key={t.key}
                className={`absolute -translate-x-1/2 tabular-nums ${viewMode === 'month' ? 'text-[7px]' : 'text-[9px]'} ${
                  t.weekend ? 'text-red-400' : 'text-gray-500'
                } ${i === n - 1 ? 'font-bold' : ''}`}
                style={{ left: `${px(i)}%` }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>

        {/* 요약 지표 3칸 */}
        <div className="grid grid-cols-3 divide-x divide-gray-300 mt-3 pt-3 border-t border-gray-300">
          {/* 누적 후회 */}
          <div className="px-2 flex items-baseline justify-between gap-2">
            <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">누적 후회</span>
            <div className="text-right">
              <span className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtW(last.regret)}</span>
              <span className="text-[9px] text-gray-400 tabular-nums ml-1">{last.regretCnt}건·건당 {fmtW(avgPerCnt)}</span>
            </div>
          </div>
          {/* 최고 후회일/월 */}
          <div className="px-3 flex items-baseline justify-between gap-2">
            <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">최고 후회{viewMode === 'month' ? '일' : '월'}</span>
            <div className="text-right">
              <span className="text-[13px] font-bold text-red-500 tabular-nums">{peak.daily > 0 ? fmtW(peak.daily) : '—'}</span>
              <span className="text-[9px] text-gray-400 tabular-nums ml-1">{peak.daily > 0 ? peakLabel : '후회 없음'}</span>
            </div>
          </div>
          {/* 전월 대비 */}
          <div className="px-3 flex items-baseline justify-between gap-2">
            <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">전월 대비</span>
            <div className="text-right">
              {vsRegret != null ? (
                <span className={`text-[13px] font-bold tabular-nums ${vsRegret <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {vsRegret <= 0 ? '▼' : '▲'}{Math.abs(vsRegret)}%
                </span>
              ) : (
                <span className="text-[13px] font-bold text-gray-300">—</span>
              )}
              <span className="text-[9px] text-gray-400 tabular-nums ml-1">{prevRegret > 0 ? `전월 ${fmtW(prevRegret)}` : '없음'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

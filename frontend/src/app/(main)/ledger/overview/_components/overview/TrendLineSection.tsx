// 현황 — 추세 라인 차트 (Month: 일별 / Year: 월별) — 전체/후회/고정
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface Props {
  records:    LedgerRecord[]
  refMonth:   string
  viewMode:   'month' | 'year'
  activeYear?: string
  compact?:   boolean   // overview2 등 작은 버전용
}

function fmtY(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`
  return n.toLocaleString()
}

export default function TrendLineSection({ records, refMonth, viewMode, activeYear, compact = false }: Props) {
  // x축 키 목록 — month: 일자(YYYY-MM-DD), year: 월(YYYY-MM)
  const buckets = useMemo(() => {
    if (viewMode === 'month') {
      if (!refMonth) return [] as string[]
      const [y, m] = refMonth.split('-').map(Number)
      const totalDays = new Date(y, m, 0).getDate()
      return Array.from({ length: totalDays }, (_, i) =>
        `${refMonth}-${String(i + 1).padStart(2, '0')}`,
      )
    }
    // year: 1~12월
    const yr = activeYear ?? String(new Date().getFullYear())
    return Array.from({ length: 12 }, (_, i) => `${yr}-${String(i + 1).padStart(2, '0')}`)
  }, [viewMode, refMonth, activeYear])

  const series = useMemo(() => {
    const total = new Map<string, number>()
    const regret = new Map<string, number>()
    const fixed = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const key = viewMode === 'month' ? r.date : r.date.slice(0, 7)
      total.set(key, (total.get(key) ?? 0) + r.amount)
      if (r.review === 'bad') regret.set(key, (regret.get(key) ?? 0) + r.amount)
      if (r.isFixed) fixed.set(key, (fixed.get(key) ?? 0) + r.amount)
    }
    return {
      total: buckets.map(k => total.get(k) ?? 0),
      regret: buckets.map(k => regret.get(k) ?? 0),
      fixed: buckets.map(k => fixed.get(k) ?? 0),
    }
  }, [records, buckets, viewMode])

  const maxVal = Math.max(...series.total, ...series.regret, ...series.fixed, 1)
  const hasData = series.total.some(v => v > 0)

  const W = 560
  const H = compact ? 110 : 180
  const PAD_L = compact ? 36 : 44
  const PAD_R = 16
  const PAD_T = compact ? 10 : 16
  const PAD_B = compact ? 20 : 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const x = (i: number) => buckets.length === 1 ? PAD_L + innerW / 2 : PAD_L + (innerW * i) / (buckets.length - 1)
  const y = (v: number) => PAD_T + innerH - (innerH * v) / maxVal

  // y 값 차트 영역 안으로 클램프 (베이스라인 아래로 빠지는 곡선 방지)
  const yMin = PAD_T
  const yMax = PAD_T + innerH
  const clampY = (v: number) => Math.max(yMin, Math.min(yMax, v))

  // 모노톤 큐빅 — 점들을 부드럽게 연결, 베이스라인 안 넘김
  function buildPath(values: number[]) {
    if (values.length === 0) return ''
    if (values.length === 1) return `M ${x(0)} ${y(values[0])}`
    const pts = values.map((v, i) => [x(i), y(v)] as const)
    const tension = 0.5
    let d = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] ?? p2
      const cp1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension
      const cp1y = clampY(p1[1] + ((p2[1] - p0[1]) / 6) * tension)
      const cp2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension
      const cp2y = clampY(p2[1] - ((p3[1] - p1[1]) / 6) * tension)
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`
    }
    return d
  }

  // 라인 아래 면적 (그라데이션용)
  function buildArea(values: number[]) {
    const linePath = buildPath(values)
    if (!linePath) return ''
    const lastX = x(values.length - 1)
    const firstX = x(0)
    const baseY = PAD_T + innerH
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`
  }

  const yTicks = [0, 0.5, 1].map(p => Math.round(maxVal * p))

  // x축 라벨 — month: 5/10/15/20/25/말일, year: 1~12월
  const xLabels = useMemo(() => {
    if (viewMode === 'month') {
      const totalDays = buckets.length
      if (totalDays === 0) return [] as { idx: number; text: string }[]
      const targets = [1, 5, 10, 15, 20, 25, totalDays]
      return targets
        .filter((d, i, arr) => arr.indexOf(d) === i && d <= totalDays)
        .map(d => ({ idx: d - 1, text: `${d}일` }))
    }
    return buckets.map((b, i) => ({ idx: i, text: `${Number(b.slice(5, 7))}월` }))
  }, [viewMode, buckets])

  const headerLabel = viewMode === 'month'
    ? `Trend · ${refMonth ? `${Number(refMonth.slice(5, 7))}월` : ''} 일별`
    : `Trend · ${activeYear ?? ''}년 월별`

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-3'}`}>
        <p className={`font-semibold text-gray-800 ${compact ? 'text-[10px]' : 'text-xs'}`}>{headerLabel}</p>
        <div className={`flex items-center gap-3 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-700" />전체</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />후회</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />고정</span>
        </div>
      </div>

      {!hasData ? (
        <p className="text-xs text-gray-300 py-8 text-center">지출 데이터가 없어요.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <defs>
            <linearGradient id="trend-total-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#374151" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="trend-regret-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f87171" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* y 그리드 */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD_L - 6} y={y(v) + 3} fontSize={compact ? 8 : 9} fill="#9ca3af" textAnchor="end">₩{fmtY(v)}</text>
            </g>
          ))}
          {/* x 라벨 */}
          {xLabels.map(({ idx, text }) => (
            <text key={`xl-${idx}`} x={x(idx)} y={H - 6} fontSize={compact ? 8 : 9} fill="#9ca3af" textAnchor="middle">
              {text}
            </text>
          ))}

          {/* 전체 — 면적 + 라인 */}
          <path d={buildArea(series.total)} fill="url(#trend-total-fill)" />
          <path
            d={buildPath(series.total)}
            fill="none"
            stroke="#374151"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {viewMode === 'year' && series.total.map((v, i) => (
            <circle key={`t-${i}`} cx={x(i)} cy={y(v)} r={3} fill="#fff" stroke="#374151" strokeWidth={1.5} />
          ))}

          {/* 후회 — 면적 + 라인 */}
          <path d={buildArea(series.regret)} fill="url(#trend-regret-fill)" />
          <path
            d={buildPath(series.regret)}
            fill="none"
            stroke="#f87171"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {viewMode === 'year' && series.regret.map((v, i) => v > 0 && (
            <circle key={`r-${i}`} cx={x(i)} cy={y(v)} r={3} fill="#fff" stroke="#f87171" strokeWidth={1.5} />
          ))}

          {/* 고정 — 점선 라인만 (면적 없음) */}
          <path
            d={buildPath(series.fixed)}
            fill="none"
            stroke="#d1d5db"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  )
}

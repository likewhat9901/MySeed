// 현황 — 카테고리 도넛 차트 + 리스트 카드
'use client'

import { useMemo } from 'react'

interface CategoryItem { label: string; amount: number; color: string }

interface Props {
  expense: number
  categoryItems: CategoryItem[]
}

function fmtM(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`
  return n.toLocaleString()
}

export default function CategoryDonutSection({ expense, categoryItems }: Props) {
  const top = categoryItems.slice(0, 6)

  // SVG 도넛 세그먼트 계산
  const segments = useMemo(() => {
    if (expense === 0) return []
    const r = 56
    const cx = 72, cy = 72
    let angle = -Math.PI / 2
    return top.map(item => {
      const ratio = item.amount / expense
      const sweep = ratio * Math.PI * 2
      const x1 = cx + r * Math.cos(angle)
      const y1 = cy + r * Math.sin(angle)
      angle += sweep
      const x2 = cx + r * Math.cos(angle)
      const y2 = cy + r * Math.sin(angle)
      const largeArc = sweep > Math.PI ? 1 : 0
      return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`, color: item.color }
    })
  }, [top, expense])

  return (
    <div className="bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: '320px' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <p className="text-xs font-semibold text-gray-800">By category</p>
      </div>

      {expense === 0 ? (
        <p className="text-xs text-gray-300 text-center py-8">지출 내역이 없어요.</p>
      ) : (
        <>
          {/* 도넛 차트 */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <svg width="144" height="144" viewBox="0 0 144 144">
                {/* 배경 원 */}
                <circle cx="72" cy="72" r="56" fill="#f3f4f6" />
                {segments.map((seg, i) => (
                  <path key={i} d={seg.path} fill={seg.color} opacity={0.85} />
                ))}
                {/* 가운데 흰 원 (도넛 구멍) */}
                <circle cx="72" cy="72" r="36" fill="white" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <p className="text-[9px] font-semibold text-gray-400 tracking-wider">THIS MONTH</p>
                <p className="text-sm font-extrabold text-gray-800 leading-tight">₩{fmtM(expense)}</p>
              </div>
            </div>
          </div>

          {/* 리스트 */}
          <div className="px-4 pb-4 flex flex-col gap-2 overflow-y-auto">
            {top.map(item => {
              const pct = Math.round((item.amount / expense) * 100)
              return (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-gray-600">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{pct}%</span>
                    <span className="text-xs font-medium text-gray-700 tabular-nums">₩{fmtM(item.amount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

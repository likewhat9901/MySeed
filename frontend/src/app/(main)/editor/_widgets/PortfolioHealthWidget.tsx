'use client'

import { BRAND_COLORS } from '@/features/editor/types'
import { PORTFOLIO_HEALTH_DATA } from './widgetData'

// ─── Portfolio Health Widget ──────────────────────────────────────────────────
// 순자산(Net Worth) + 도넛 게이지 + Assets / Liabilities 요약 (Card B)

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PortfolioHealthWidget(_props: import('../_components/Canvas/WidgetWrapper').WidgetComponentProps) {
  const DATA = PORTFOLIO_HEALTH_DATA
  const assetsPct = DATA.assets / (DATA.assets + DATA.liabilities)
  const strokeDashoffset = CIRCUMFERENCE * (1 - assetsPct)

  return (
    <div className="flex flex-col h-full p-4 border-2 border-brand rounded-[inherit]">
      {/* 헤더 */}
      <div className="mb-3">
        <h3 className="text-sm font-bold text-gray-900">Portfolio Health</h3>
      </div>

      {/* 순자산 + 도넛 게이지 */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Net Worth</p>
          <p className="text-2xl font-bold text-gray-900">
            ${DATA.netWorth.toLocaleString()}
          </p>
        </div>

        {/* 도넛 게이지 */}
        <div className="relative inline-flex items-center justify-center ml-auto">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="44" cy="44" r={RADIUS}
              fill="none"
              stroke={BRAND_COLORS.light}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-brand">+{DATA.growthPct}%</span>
          </div>
        </div>
      </div>

      {/* Assets / Liabilities 요약 */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="border border-brand rounded-lg px-3 py-2">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Assets</p>
          <p className="text-sm font-bold text-brand-dark mt-0.5">
            ${(DATA.assets / 1000).toFixed(0)}K
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg px-3 py-2">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Liabilities</p>
          <p className="text-sm font-bold text-red-600 mt-0.5">
            ${(DATA.liabilities / 1000).toFixed(0)}K
          </p>
        </div>
      </div>
    </div>
  )
}

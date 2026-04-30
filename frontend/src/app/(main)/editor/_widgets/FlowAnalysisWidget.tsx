'use client'

import { FLOW_ANALYSIS_DATA } from './widgetData'

// ─── Flow Analysis Widget ─────────────────────────────────────────────────────
// 월 수입 vs 지출 바 차트 위젯 (Card A: Income vs Expense)

export default function FlowAnalysisWidget(_props: import('../_components/Canvas/WidgetWrapper').WidgetComponentProps) {
  const DATA = FLOW_ANALYSIS_DATA
  const max = DATA.income.value
  const retainedPct = (((DATA.income.value - DATA.expenses.value) / DATA.income.value) * 100).toFixed(1)

  return (
    <div className="flex flex-col h-full p-4">
      {/* 헤더 */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">Flow Analysis</h3>
      </div>

      {/* 바 차트 */}
      <div className="flex flex-col gap-4 flex-1">
        {Object.values(DATA).map(({ label, amount, value, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
              <span className="text-xs font-bold text-gray-900">{amount}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 요약 문구 */}
      <p className="mt-4 text-[11px] text-gray-500">
        You have retained{' '}
        <span className="font-bold text-brand">{retainedPct}%</span>
        {' '}of your total earnings this cycle.
      </p>
    </div>
  )
}

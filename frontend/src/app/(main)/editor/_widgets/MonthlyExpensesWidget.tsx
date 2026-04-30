'use client'

import { MONTHLY_EXPENSES_DATA } from './widgetData'
import type { ExpenseRow } from './widgetData'

// ─── Monthly Expenses Widget ──────────────────────────────────────────────────

export default function MonthlyExpensesWidget(_props: import('../_components/Canvas/WidgetWrapper').WidgetComponentProps) {
  const EXPENSES: ExpenseRow[] = MONTHLY_EXPENSES_DATA
  return (
    <div className="flex flex-col h-full p-4">
      {/* Header */}
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Monthly Expenses</h3>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-gray-400 font-medium pb-2 pr-3">CATEGORY</th>
              <th className="text-right text-gray-400 font-medium pb-2 pr-3">AMOUNT</th>
              <th className="text-right text-gray-400 font-medium pb-2 pr-3">DATE</th>
              <th className="text-right text-gray-400 font-medium pb-2">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {EXPENSES.map((row, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="text-gray-800 font-medium">{row.category}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-700">{row.amount}</td>
                <td className="py-2.5 pr-3 text-right text-gray-500">{row.date}</td>
                <td className="py-2.5 text-right">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'Pending' | 'Paid' }) {
  if (status === 'Paid') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        Paid
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      Pending
    </span>
  )
}

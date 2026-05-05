'use client'

// ─── _widgets/TableWidget.tsx ─────────────────────────────────────────────────
// 테이블 위젯. 열 추가/삭제, 행 추가/삭제, 셀 인라인 편집.
// data_binding: TableBinding { columns: string[], rows: string[][] }

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { TableBinding } from '@/features/editor/types'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { widgetMessages } from '@/lib/i18n/widgetMessages'

// ─── Table Widget ─────────────────────────────────────────────────────────────

export default function TableWidget({ binding, onBindingChange, onBeforeChange }: WidgetComponentProps) {
  const { locale } = useLocale()
  const t = widgetMessages[locale]

  const data = binding as TableBinding | null
  const columns: string[] = data?.columns ?? ['항목', '값', '비고']
  const rows: string[][] = data?.rows ?? [['', '', '']]

  const [editingHeader, setEditingHeader] = useState<number | null>(null)

  function updateColumns(next: string[]) {
    onBeforeChange()
    onBindingChange({ columns: next, rows } as TableBinding)
  }

  function updateCell(rowIdx: number, colIdx: number, value: string) {
    const next = rows.map((r, ri) =>
      ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? value : c)) : r
    )
    onBeforeChange()
    onBindingChange({ columns, rows: next } as TableBinding)
  }

  function addRow() {
    onBeforeChange()
    onBindingChange({ columns, rows: [...rows, columns.map(() => '')] } as TableBinding)
  }

  function deleteRow(rowIdx: number) {
    if (rows.length <= 1) return
    onBeforeChange()
    onBindingChange({ columns, rows: rows.filter((_, i) => i !== rowIdx) } as TableBinding)
  }

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.tableTitle}</h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
        >
          <Plus size={12} /> {t.addRow}
        </button>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {columns.map((col, ci) => (
                <th
                  key={ci}
                  className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold text-gray-600 min-w-[60px]"
                >
                  {editingHeader === ci ? (
                    <input
                      autoFocus
                      className="w-full bg-transparent outline-none font-semibold text-gray-800"
                      value={col}
                      onChange={e => {
                        const next = columns.map((c, i) => (i === ci ? e.target.value : c))
                        onBindingChange({ columns: next, rows } as TableBinding)
                      }}
                      onBlur={() => setEditingHeader(null)}
                    />
                  ) : (
                    <span
                      className="cursor-text select-none"
                      onDoubleClick={() => setEditingHeader(ci)}
                    >
                      {col || ' '}
                    </span>
                  )}
                </th>
              ))}
              {/* 삭제 버튼 열 여백 */}
              <th className="w-6 border-0" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group hover:bg-gray-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-200 px-2 py-1">
                    <input
                      className="w-full bg-transparent outline-none text-gray-700 placeholder:text-gray-300"
                      value={cell}
                      placeholder="—"
                      onChange={e => updateCell(ri, ci, e.target.value)}
                      onFocus={onBeforeChange}
                    />
                  </td>
                ))}
                <td className="border-0 pl-1">
                  <button
                    onClick={() => deleteRow(ri)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-300 text-right">{t.editColHint}</p>
    </div>
  )
}

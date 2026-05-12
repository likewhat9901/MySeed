'use client'

// ─── _widgets/TableWidget.tsx ─────────────────────────────────────────────────
// 테이블 위젯. 열 추가/삭제, 행 추가/삭제, 셀 인라인 편집.
// data_binding: TableBinding { columns: string[], rows: string[][] }

import { useState, useRef, useEffect } from 'react'
import { Trash2, ChevronDown, Plus } from 'lucide-react'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { TableBinding } from '@/features/editor/types'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { widgetMessages } from '@/lib/i18n/messages/widgetMessages'

export default function TableWidget({ binding, onBindingChange, onBeforeChange, isEditMode }: WidgetComponentProps) {
  const { locale } = useLocale()
  const t = widgetMessages[locale]

  const data = binding as TableBinding | null
  const columns: string[] = data?.columns ?? ['헤더1', '헤더2', '헤더3']
  const rows: string[][] = data?.rows ?? [['', '', '']]

  // 열 메뉴: 열 인덱스 (null = 닫힘)
  const [colMenu, setColMenu]         = useState<number | null>(null)
  const [renamingCol, setRenamingCol] = useState<number | null>(null)
  const colMenuRef = useRef<HTMLTableCellElement | null>(null)

  // 열 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (colMenu === null) return
    function handleClick(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node))
        setColMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [colMenu])

  // ── 열 조작 ────────────────────────────────────────────────────────────────

  function insertCol(at: number) {
    onBeforeChange()
    const nextCols = [...columns.slice(0, at), `열${columns.length + 1}`, ...columns.slice(at)]
    const nextRows = rows.map(r => [...r.slice(0, at), '', ...r.slice(at)])
    onBindingChange({ columns: nextCols, rows: nextRows } as TableBinding)
    setColMenu(null)
  }

  function deleteCol(ci: number) {
    if (columns.length <= 1) return
    onBeforeChange()
    const nextCols = columns.filter((_, i) => i !== ci)
    const nextRows = rows.map(r => r.filter((_, i) => i !== ci))
    onBindingChange({ columns: nextCols, rows: nextRows } as TableBinding)
    setColMenu(null)
  }

  function renameCol(ci: number, value: string) {
    const next = columns.map((c, i) => (i === ci ? value : c))
    onBindingChange({ columns: next, rows } as TableBinding)
  }

  // ── 행 조작 ────────────────────────────────────────────────────────────────

  function addRow() {
    onBeforeChange()
    onBindingChange({ columns, rows: [...rows, columns.map(() => '')] } as TableBinding)
  }

  function deleteRow(ri: number) {
    if (rows.length <= 1) return
    onBeforeChange()
    onBindingChange({ columns, rows: rows.filter((_, i) => i !== ri) } as TableBinding)
  }

  function updateCell(ri: number, ci: number, value: string) {
    const next = rows.map((r, rIdx) =>
      rIdx === ri ? r.map((c, cIdx) => (cIdx === ci ? value : c)) : r
    )
    onBeforeChange()
    onBindingChange({ columns, rows: next } as TableBinding)
  }

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.tableTitle}</h3>
        {isEditMode && (
          <button onClick={addRow} className="text-xs text-green-600 hover:text-green-700 font-medium">
            {t.addRow}
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="group">
              {columns.map((col, ci) => (
                <th
                  key={ci}
                  ref={colMenu === ci ? colMenuRef : undefined}
                  className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold text-gray-600 min-w-[60px] relative"
                >
                  {renamingCol === ci ? (
                    <input
                      autoFocus
                      className="w-full bg-amber-50 outline-none font-semibold text-gray-800 border-b-2 border-amber-300"
                      value={col}
                      onChange={e => renameCol(ci, e.target.value)}
                      onBlur={() => { setRenamingCol(null); onBeforeChange() }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { setRenamingCol(null); onBeforeChange() } }}
                    />
                  ) : (
                    <button
                      className={`flex items-center gap-0.5 w-full text-left ${isEditMode ? 'hover:text-gray-800' : 'cursor-default'}`}
                      onClick={() => isEditMode && setColMenu(colMenu === ci ? null : ci)}
                    >
                      <span className="truncate">{col || ' '}</span>
                      {isEditMode && <ChevronDown size={9} className="shrink-0 text-gray-400" />}
                    </button>
                  )}

                  {/* 열 메뉴 드롭다운 */}
                  {colMenu === ci && (
                    <div className="absolute left-0 top-full mt-0.5 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                      <button
                        onClick={() => { setColMenu(null); setRenamingCol(ci) }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {t.colRename}
                      </button>
                      <div className="my-0.5 border-t border-gray-100" />
                      <button
                        onClick={() => insertCol(ci)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {t.colAddLeft}
                      </button>
                      <button
                        onClick={() => insertCol(ci + 1)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {t.colAddRight}
                      </button>
                      {columns.length > 1 && (
                        <>
                          <div className="my-0.5 border-t border-gray-100" />
                          <button
                            onClick={() => deleteCol(ci)}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                          >
                            {t.colDelete}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </th>
              ))}
              <th className="w-6 border-0 pl-1 align-middle">
                {isEditMode && (
                  <button
                    onClick={() => insertCol(columns.length)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-green-500 transition-opacity flex items-center justify-center"
                    title={t.colAddRight}
                  >
                    <Plus size={11} />
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group hover:bg-gray-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="border border-gray-200 px-2 py-1">
                    <input
                      className={`w-full outline-none text-gray-700 placeholder:text-gray-300 transition-colors ${
                        isEditMode ? 'bg-amber-50 border-b-2 border-amber-300' : 'bg-transparent'
                      }`}
                      value={cell}
                      placeholder="—"
                      readOnly={!isEditMode}
                      onChange={e => updateCell(ri, ci, e.target.value)}
                      onFocus={onBeforeChange}
                    />
                  </td>
                ))}
                <td className="border-0 pl-1 bg-white">
                  {isEditMode && (
                    <button
                      onClick={() => deleteRow(ri)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  )
}

// 내역 탭 — 거래 내역 테이블 (헤더 액션은 RecordsLayout 타이틀 줄에서 담당)
'use client'

import { Trash2 } from 'lucide-react'
import { RECORD_COLUMN_LABELS } from '@/features/ledger/record/types'
import type { LedgerRecord, ReviewRating, RecordColumn, Currency } from '@/features/ledger/record/types'

interface RecordTableProps {
  records:        LedgerRecord[]
  selectedColumn: RecordColumn | null
  onChange:       (records: LedgerRecord[]) => void
  onColumnSelect: (col: RecordColumn) => void
  visibleColumns: RecordColumn[]
}

const CURRENCIES: Currency[] = ['KRW', 'USD', 'EUR', 'JPY', 'CNY']

function RegretToggle({ value, onChange }: { value: ReviewRating; onChange: (v: ReviewRating) => void }) {
  const active = value === 'bad'
  return (
    <button
      onClick={() => onChange(active ? null : 'bad')}
      className={`text-[10px] font-semibold px-1.5 py-0.5 border transition-all select-none ${
        active
          ? 'border-red-400 text-red-500 bg-red-50'
          : 'border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-400'
      }`}
    >
      후회
    </button>
  )
}

const COLUMNS: RecordColumn[] = ['date', 'time', 'type', 'category', 'subcategory', 'description', 'amount', 'currency', 'paymentMethod', 'memo']

// 고정성 컬럼은 min-width로 최소폭만 보장, 텍스트 컬럼(내용/메모/결제수단)은 남는 공간 분배
const COL_MIN_WIDTH: Partial<Record<RecordColumn, number>> = {
  date: 92, time: 48, type: 66, category: 78, subcategory: 74,
  amount: 76, currency: 66,
  description: 170, paymentMethod: 150, memo: 120,
}
// 남는 공간을 받아 늘어나는 텍스트 컬럼 (나머지는 콘텐츠 폭 고정)
const FLEX_COLUMNS = new Set<RecordColumn>(['description', 'paymentMethod', 'memo'])


export default function RecordTable({ records = [], selectedColumn, onChange, onColumnSelect, visibleColumns }: RecordTableProps) {
  const cols = COLUMNS.filter(c => visibleColumns.includes(c))
  function updateRow(id: string, patch: Partial<LedgerRecord>) {
    onChange(records.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function removeRow(id: string) {
    onChange(records.filter(r => r.id !== id))
  }

  const cellCls   = 'px-1.5 py-1.5 text-[11px] text-gray-700 border-b border-gray-100 whitespace-nowrap text-center'
  const inputCls  = 'w-full bg-transparent outline-none text-[11px] text-gray-700 placeholder:text-gray-300 text-center overflow-hidden text-ellipsis'
  const selectCls = `${inputCls} cursor-pointer`

  function typeColor(type: LedgerRecord['type']) {
    if (type === '지출') return 'text-red-500'
    if (type === '수입') return 'text-green-600'
    if (type === '투자') return 'text-blue-500'
    return 'text-gray-500' // 이체
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="border-collapse w-full" style={{ minWidth: '640px' }}>
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-200">
            <th className="" />
            <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-400 tracking-wider whitespace-nowrap w-10">후회</th>
            {cols.map(col => {
              const isSelected = selectedColumn === col
              return (
                <th
                  key={col}
                  onClick={() => onColumnSelect(col)}
                  style={{
                    minWidth: COL_MIN_WIDTH[col] ?? 100,
                    width: FLEX_COLUMNS.has(col)
                      ? (col === 'description' ? '40%' : col === 'paymentMethod' ? '32%' : '28%')
                      : 1,
                  }}
                  className={`px-1.5 py-1.5 text-center text-[10px] font-semibold tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors ${
                    isSelected
                      ? 'text-brand bg-brand/5 border-b-2 border-brand'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {RECORD_COLUMN_LABELS[col]}
                  {isSelected && <span className="ml-1 text-[9px] text-brand">●</span>}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan={cols.length + 2} className="px-3 py-12 text-center text-sm text-gray-300">
                내역을 직접 입력하거나 가져오기로 엑셀을 업로드하세요.
              </td>
            </tr>
          )}
          {records.map((r, i) => (
            <tr key={r.id} className={`group transition-colors hover:bg-blue-50/40 ${i % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'}`}>
              <td className="px-2 py-1.5 border-b border-gray-100">
                <button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
              </td>
              <td className={`${cellCls} w-10`}>
                <RegretToggle value={r.review} onChange={v => updateRow(r.id, { review: v })} />
              </td>
              {cols.includes('date') && <td className={cellCls}><input type="date" value={r.date} onChange={e => updateRow(r.id, { date: e.target.value })} className="bg-transparent outline-none text-[11px] text-gray-700 inline-block w-auto" /></td>}
              {cols.includes('time') && <td className={cellCls}><input type="text" value={r.time ?? ''} onChange={e => updateRow(r.id, { time: e.target.value || null })} placeholder="--:--" className={inputCls} /></td>}
              {cols.includes('type') && (
                <td className={cellCls}>
                  <select
                    value={r.type}
                    onChange={e => updateRow(r.id, { type: e.target.value as LedgerRecord['type'] })}
                    className={`${selectCls} font-semibold ${typeColor(r.type)}`}
                    style={{ colorScheme: 'light' }}
                  >
                    <option value="지출" className="text-gray-800 font-normal">지출</option>
                    <option value="수입" className="text-gray-800 font-normal">수입</option>
                    <option value="이체" className="text-gray-800 font-normal">이체</option>
                  </select>
                </td>
              )}
              {cols.includes('category') && <td className={cellCls}><input value={r.category} onChange={e => updateRow(r.id, { category: e.target.value })} placeholder="대분류" className={inputCls} /></td>}
              {cols.includes('subcategory') && <td className={cellCls}><input value={r.subcategory ?? ''} onChange={e => updateRow(r.id, { subcategory: e.target.value || null })} placeholder="소분류" className={inputCls} /></td>}
              {cols.includes('description') && <td className={cellCls}><input value={r.description} onChange={e => updateRow(r.id, { description: e.target.value })} placeholder="내용" title={r.description} className={inputCls} /></td>}
              {cols.includes('amount') && <td className={cellCls}><input type="number" value={r.amount || ''} onChange={e => updateRow(r.id, { amount: Number(e.target.value) })} placeholder="0" className={`${inputCls} text-right ${r.amount < 0 ? 'text-red-500' : ''}`} /></td>}
              {cols.includes('currency') && <td className={cellCls}><select value={r.currency} onChange={e => updateRow(r.id, { currency: e.target.value as Currency })} className={selectCls}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>}
              {cols.includes('paymentMethod') && <td className={cellCls}><input value={r.paymentMethod ?? ''} onChange={e => updateRow(r.id, { paymentMethod: e.target.value || null })} placeholder="결제수단" title={r.paymentMethod ?? ''} className={inputCls} /></td>}
              {cols.includes('memo') && <td className={cellCls}><input value={r.memo ?? ''} onChange={e => updateRow(r.id, { memo: e.target.value || null })} placeholder="메모" className={inputCls} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 내역 탭 — 거래 내역 테이블 (헤더 액션은 RecordsLayout 타이틀 줄에서 담당)
'use client'

import { X } from 'lucide-react'
import { RECORD_COLUMN_LABELS } from '@/features/ledger/record/types'
import type { LedgerRecord, ReviewRating, RecordColumn, Currency } from '@/features/ledger/record/types'

interface RecordTableProps {
  records:        LedgerRecord[]
  selectedColumn: RecordColumn | null
  onChange:       (records: LedgerRecord[]) => void
  onColumnSelect: (col: RecordColumn) => void
}

const CURRENCIES: Currency[] = ['KRW', 'USD', 'EUR', 'JPY', 'CNY']

const REVIEW_OPTIONS: { value: ReviewRating; label: string }[] = [
  { value: 'good', label: '😊' },
  { value: 'soso', label: '😐' },
  { value: 'bad',  label: '😞' },
]

const COLUMNS: RecordColumn[] = ['date', 'time', 'type', 'category', 'subcategory', 'description', 'amount', 'currency', 'paymentMethod', 'memo']

// table-layout: fixed 에서 width 고정. description/memo/paymentMethod 는 null → 남는 공간 자동 흡수
const COL_WIDTH: Partial<Record<RecordColumn, number>> = {
  date: 96, time: 52, type: 60, category: 68, subcategory: 58,
  amount: 76, currency: 64,
}

function ReviewCell({ value, onChange }: { value: ReviewRating; onChange: (v: ReviewRating) => void }) {
  return (
    <div className="flex items-center gap-1">
      {REVIEW_OPTIONS.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={`text-base transition-opacity ${value === opt.value ? 'opacity-100' : 'opacity-20 hover:opacity-50'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function RecordTable({ records = [], selectedColumn, onChange, onColumnSelect }: RecordTableProps) {
  function updateRow(id: string, patch: Partial<LedgerRecord>) {
    onChange(records.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function removeRow(id: string) {
    onChange(records.filter(r => r.id !== id))
  }

  const cellCls   = 'px-1.5 py-1 text-[11px] text-gray-700 border-b border-gray-100 whitespace-nowrap text-center'
  const inputCls  = 'w-full bg-transparent outline-none text-[11px] text-gray-700 placeholder:text-gray-300 text-center overflow-hidden text-ellipsis'
  const selectCls = `${inputCls} cursor-pointer`

  return (
    <div className="flex-1 overflow-auto">
      <table className="border-collapse w-full" style={{ minWidth: '860px' }}>
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-gray-200">
            <th className="" />
            {COLUMNS.map(col => {
              const isSelected = selectedColumn === col
              return (
                <th
                  key={col}
                  onClick={() => onColumnSelect(col)}
                  style={COL_WIDTH[col] ? { width: COL_WIDTH[col] } : undefined}
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
            <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-400 tracking-wider whitespace-nowrap">고정</th>
            <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-400 tracking-wider whitespace-nowrap">리뷰</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 3} className="px-3 py-12 text-center text-sm text-gray-300">
                내역을 직접 입력하거나 가져오기로 엑셀을 업로드하세요.
              </td>
            </tr>
          )}
          {records.map(r => (
            <tr key={r.id} className="group hover:bg-gray-50 transition-colors">
              <td className="px-1 py-1.5 border-b border-gray-100">
                <button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={11} /></button>
              </td>
              <td className={cellCls}>
                <input type="date" value={r.date} onChange={e => updateRow(r.id, { date: e.target.value })} className={inputCls} />
              </td>
              <td className={cellCls}>
                <input type="text" value={r.time ?? ''} onChange={e => updateRow(r.id, { time: e.target.value || null })} placeholder="--:--" className={inputCls} />
              </td>
              <td className={cellCls}>
                <select value={r.type} onChange={e => updateRow(r.id, { type: e.target.value as LedgerRecord['type'] })} className={`${selectCls} ${r.type === '수입' ? 'text-green-600' : 'text-gray-700'}`}>
                  <option value="지출">지출</option>
                  <option value="수입">수입</option>
                  <option value="이체">이체</option>
                  <option value="투자">투자</option>
                </select>
              </td>
              <td className={cellCls}>
                <input value={r.category} onChange={e => updateRow(r.id, { category: e.target.value })} placeholder="대분류" className={inputCls} />
              </td>
              <td className={cellCls}>
                <input value={r.subcategory ?? ''} onChange={e => updateRow(r.id, { subcategory: e.target.value || null })} placeholder="소분류" className={inputCls} />
              </td>
              <td className={cellCls}>
                <input value={r.description} onChange={e => updateRow(r.id, { description: e.target.value })} placeholder="내용" title={r.description} className={inputCls} />
              </td>
              <td className={cellCls}>
                <input type="number" value={r.amount || ''} onChange={e => updateRow(r.id, { amount: Number(e.target.value) })} placeholder="0" className={`${inputCls} text-right ${r.amount < 0 ? 'text-red-500' : ''}`} />
              </td>
              <td className={cellCls}>
                <select value={r.currency} onChange={e => updateRow(r.id, { currency: e.target.value as Currency })} className={selectCls}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </td>
              <td className={cellCls}>
                <input value={r.paymentMethod ?? ''} onChange={e => updateRow(r.id, { paymentMethod: e.target.value || null })} placeholder="결제수단" title={r.paymentMethod ?? ''} className={inputCls} />
              </td>
              <td className={cellCls}>
                <input value={r.memo ?? ''} onChange={e => updateRow(r.id, { memo: e.target.value || null })} placeholder="메모" className={inputCls} />
              </td>
              <td className={cellCls}>
                {r.type === '지출' && (
                  <button
                    onClick={() => updateRow(r.id, { isFixed: !r.isFixed })}
                    title={r.isFixed ? '고정 지출 해제' : '고정 지출로 표시'}
                    className={`text-sm transition-opacity ${r.isFixed ? 'opacity-100' : 'opacity-20 hover:opacity-50'}`}
                  >
                    📌
                  </button>
                )}
              </td>
              <td className={cellCls}>
                <ReviewCell value={r.review} onChange={v => updateRow(r.id, { review: v })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

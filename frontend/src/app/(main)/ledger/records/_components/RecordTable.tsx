// 내역 탭 — 거래 내역 테이블 (헤더 액션은 RecordsLayout 타이틀 줄에서 담당)
'use client'

import { useEffect, useRef, useState } from 'react'
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

const REVIEW_OPTIONS: { value: Exclude<ReviewRating, null>; label: string; activeColor: string }[] = [
  { value: 'good', label: '만족', activeColor: 'text-green-600' },
  { value: 'soso', label: '보통', activeColor: 'text-gray-500' },
  { value: 'bad',  label: '후회', activeColor: 'text-red-500'  },
]

const REVIEW_LABEL: Record<Exclude<ReviewRating, null>, { label: string; cls: string }> = {
  good: { label: '만족', cls: 'text-green-600' },
  soso: { label: '보통', cls: 'text-gray-400'  },
  bad:  { label: '후회', cls: 'text-red-500'   },
}

const COLUMNS: RecordColumn[] = ['date', 'time', 'type', 'category', 'subcategory', 'description', 'amount', 'currency', 'paymentMethod', 'memo']

// 고정성 컬럼은 min-width로 최소폭만 보장, 텍스트 컬럼(내용/메모/결제수단)은 남는 공간 분배
const COL_MIN_WIDTH: Partial<Record<RecordColumn, number>> = {
  date: 96, time: 52, type: 60, category: 68, subcategory: 58,
  amount: 76, currency: 64,
  description: 140, paymentMethod: 96, memo: 120,
}

function ReviewCell({ value, onChange }: { value: ReviewRating; onChange: (v: ReviewRating) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const OPTIONS: { value: ReviewRating; label: string; cls: string }[] = [
    ...REVIEW_OPTIONS.map(o => ({ value: o.value as ReviewRating, label: o.label, cls: o.activeColor })),
    { value: null, label: '—', cls: 'text-gray-400' },
  ]

  return (
    <div ref={ref} className="relative flex items-center justify-center h-full">
      {/* 클릭 트리거 */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-0.5 select-none"
      >
        {value
          ? <span className={`text-[11px] font-semibold ${REVIEW_LABEL[value].cls}`}>{REVIEW_LABEL[value].label}</span>
          : <span className="text-[11px] text-gray-200">—</span>
        }
        <span className="text-[9px] text-gray-300">▾</span>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 z-30 bg-white border border-gray-300 shadow-md min-w-[56px]">
          {OPTIONS.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`flex items-center gap-1.5 w-full px-3 py-1.5 text-[11px] font-semibold hover:bg-gray-50 transition-colors ${opt.cls}`}
            >
              <span className="w-2.5 shrink-0">{value === opt.value ? '✓' : ''}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
            <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-400 tracking-wider whitespace-nowrap">리뷰</th>
            {cols.map(col => {
              const isSelected = selectedColumn === col
              return (
                <th
                  key={col}
                  onClick={() => onColumnSelect(col)}
                  style={{ minWidth: COL_MIN_WIDTH[col] ?? 100 }}
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
              <td className="px-1 py-1.5 border-b border-gray-100">
                <button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
              </td>
              <td className={cellCls}>
                <ReviewCell value={r.review} onChange={v => updateRow(r.id, { review: v })} />
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

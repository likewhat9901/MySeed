// 내역 탭 왼쪽 — 거래 내역 테이블 + 저장 버튼
'use client'

import { useState, useRef } from 'react'
import { Plus, Save, X, ChevronDown } from 'lucide-react'
import { CATEGORIES } from '@/constants/categories'
import { RECORD_COLUMN_LABELS } from '@/features/ledger/record/types'
import type { LedgerRecord, ReviewRating, RecordColumn, Currency } from '@/features/ledger/record/types'

interface RecordTableProps {
  records:        LedgerRecord[]
  selectedColumn: RecordColumn | null
  onChange:       (records: LedgerRecord[]) => void
  onColumnSelect: (col: RecordColumn) => void
  currentRecId:   string | null
  currentRecName: string | null
  saving:         boolean
  savedFeedback:  boolean
  onSave:         () => void
  onSaveAs:       (name: string) => void
}

const CURRENCIES: Currency[] = ['KRW', 'USD', 'EUR', 'JPY', 'CNY']

const REVIEW_OPTIONS: { value: ReviewRating; label: string }[] = [
  { value: 'good', label: '😊' },
  { value: 'bad',  label: '😞' },
]

const COLUMNS: RecordColumn[] = ['date', 'time', 'type', 'category', 'subcategory', 'description', 'amount', 'currency', 'paymentMethod', 'memo']

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

export default function RecordTable({
  records = [], selectedColumn, onChange, onColumnSelect,
  currentRecId, currentRecName, saving, savedFeedback, onSave, onSaveAs,
}: RecordTableProps) {
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const saveAsInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  function updateRow(id: string, patch: Partial<LedgerRecord>) {
    onChange(records.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function addRow() {
    onChange([...records, {
      id:            crypto.randomUUID(),
      date:          new Date().toISOString().slice(0, 10),
      time:          null,
      type:          '지출',
      category:      '기타',
      subcategory:   null,
      description:   '',
      amount:        0,
      currency:      'KRW',
      paymentMethod: null,
      memo:          null,
      review:        null,
    }])
  }

  function removeRow(id: string) {
    onChange(records.filter(r => r.id !== id))
  }

  function openSaveAs() {
    setSaveAsName(currentRecName ?? '')
    setSaveAsOpen(true)
    setTimeout(() => saveAsInputRef.current?.focus(), 0)
  }

  function confirmSaveAs() {
    const name = saveAsName.trim()
    if (!name) return
    onSaveAs(name)
    setSaveAsOpen(false)
  }

  const cellCls  = 'px-1.5 py-1 text-[11px] text-gray-700 border-b border-gray-100 whitespace-nowrap text-center'
  const inputCls = 'w-full bg-transparent outline-none text-[11px] text-gray-700 placeholder:text-gray-300 text-center'
  const selectCls = `${inputCls} cursor-pointer`

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-brand">
            {currentRecName ?? '내역'}
            {records.length > 0 && <span className="ml-1.5 text-gray-300 font-normal">{records.length}건</span>}
          </span>
          <button onClick={addRow} className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand transition-colors">
            <Plus className="size-3.5" />
            행 추가
          </button>
        </div>

        {records.length > 0 && (
          <div className="relative flex items-center" ref={dropdownRef}>
            {/* 저장 버튼 */}
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-l-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
            >
              <Save size={11} />
              {savedFeedback ? '저장됨' : saving ? '저장 중...' : currentRecId ? '저장' : '저장'}
            </button>
            {/* 다른 이름으로 저장 드롭다운 토글 */}
            <button
              onClick={openSaveAs}
              disabled={saving}
              className="self-stretch flex items-center justify-center px-1.5 rounded-r-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50 transition-colors border-l border-white/30"
            >
              <ChevronDown size={11} />
            </button>
            {/* 드롭다운 */}
            {saveAsOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-md p-2" style={{ width: 180 }}>
                <p className="text-[10px] text-gray-400 mb-1.5">다른 이름으로 저장</p>
                <div className="flex items-center gap-1">
                  <input
                    ref={saveAsInputRef}
                    value={saveAsName}
                    onChange={e => setSaveAsName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmSaveAs()
                      if (e.key === 'Escape') setSaveAsOpen(false)
                    }}
                    onBlur={() => setSaveAsOpen(false)}
                    placeholder="내역 이름…"
                    className="w-0 flex-1 text-xs px-2 py-1 border border-brand rounded-md outline-none"
                  />
                  <button
                    onMouseDown={e => { e.preventDefault(); confirmSaveAs() }}
                    className="shrink-0 text-xs px-2 py-1 rounded-md bg-brand text-white hover:bg-brand-dark"
                  >
                    저장
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse" style={{ minWidth: 1000 }}>
          <thead className="sticky top-0 bg-white z-10">
            <tr className="border-b border-gray-200">
              <th className="w-6" />
              {COLUMNS.map(col => {
                const isSelected = selectedColumn === col
                return (
                  <th
                    key={col}
                    onClick={() => onColumnSelect(col)}
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
              <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-400 tracking-wider whitespace-nowrap">리뷰</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="px-3 py-12 text-center text-sm text-gray-300">
                  내역을 직접 입력하거나 오른쪽에서 엑셀을 업로드하세요.
                </td>
              </tr>
            )}
            {records.map(r => (
              <tr key={r.id} className="group hover:bg-gray-50 transition-colors">
                <td className="px-1 py-1.5 border-b border-gray-100">
                  <button onClick={() => removeRow(r.id)} className="text-gray-300 hover:text-red-400 transition-colors"><X size={11} /></button>
                </td>
                <td className={cellCls} style={{ width: 100 }}>
                  <input type="date" value={r.date} onChange={e => updateRow(r.id, { date: e.target.value })} className={inputCls} />
                </td>
                <td className={cellCls} style={{ width: 72 }}>
                  <input type="time" value={r.time ?? ''} onChange={e => updateRow(r.id, { time: e.target.value || null })} className={inputCls} />
                </td>
                <td className={cellCls} style={{ width: 88 }}>
                  <select value={r.type} onChange={e => updateRow(r.id, { type: e.target.value as LedgerRecord['type'] })} className={`${selectCls} ${r.type === '수입' ? 'text-green-600' : 'text-gray-700'}`}>
                    <option value="지출">지출</option>
                    <option value="수입">수입</option>
                    <option value="이체">이체</option>
                    <option value="투자">투자</option>
                  </select>
                </td>
                <td className={cellCls} style={{ width: 120 }}>
                  <select value={r.category} onChange={e => updateRow(r.id, { category: e.target.value as LedgerRecord['category'] })} className={selectCls}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className={cellCls} style={{ width: 72 }}>
                  <input value={r.subcategory ?? ''} onChange={e => updateRow(r.id, { subcategory: e.target.value || null })} placeholder="소분류" className={inputCls} />
                </td>
                <td className={cellCls} style={{ width: 140 }}>
                  <input value={r.description} onChange={e => updateRow(r.id, { description: e.target.value })} placeholder="내용" className={inputCls} />
                </td>
                <td className={cellCls} style={{ width: 90 }}>
                  <input type="number" value={r.amount || ''} onChange={e => updateRow(r.id, { amount: Number(e.target.value) })} placeholder="0" className={`${inputCls} text-right`} style={{ textAlign: 'right' }} />
                </td>
                <td className={cellCls} style={{ width: 80 }}>
                  <select value={r.currency} onChange={e => updateRow(r.id, { currency: e.target.value as Currency })} className={selectCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className={cellCls} style={{ width: 110 }}>
                  <input value={r.paymentMethod ?? ''} onChange={e => updateRow(r.id, { paymentMethod: e.target.value || null })} placeholder="결제수단" className={inputCls} />
                </td>
                <td className={cellCls} style={{ width: 120 }}>
                  <input value={r.memo ?? ''} onChange={e => updateRow(r.id, { memo: e.target.value || null })} placeholder="메모" className={inputCls} />
                </td>
                <td className={cellCls}>
                  <ReviewCell value={r.review} onChange={v => updateRow(r.id, { review: v })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

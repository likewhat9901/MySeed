'use client'

import { useState, useRef } from 'react'
import { BRAND_COLORS } from '@/features/editor/types'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { SavingsGoalBinding } from '@/features/editor/types'

// ─── Savings Goal Widget ──────────────────────────────────────────────────────
// 원형 차트 중앙에 목표 이름 + 퍼센트 배치.
// 하단에 current/target 인라인 편집 + 선형 진행 바.

const RADIUS = 48
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const DEFAULT: SavingsGoalBinding = { label: '목표 이름', current: 0, target: 1000000 }

function formatKRW(n: number) {
  if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '억'
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만'
  return n.toLocaleString('ko-KR')
}

// ─── EditableAmount ───────────────────────────────────────────────────────────
// 렌더마다 재정의하면 autoFocus가 즉시 blur되므로 최상위 컴포넌트로 분리.

interface EditableAmountProps {
  value: number
  isEditing: boolean
  draft: string
  onDraftChange: (v: string) => void
  onStartEdit: () => void
  onCommit: () => void
}

function EditableAmount({ value, isEditing, draft, onDraftChange, onStartEdit, onCommit }: EditableAmountProps) {
  if (isEditing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => onDraftChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={e => e.key === 'Enter' && onCommit()}
        onPointerDown={e => e.stopPropagation()}
        className="text-sm font-bold text-gray-900 w-20 border-b-2 border-brand outline-none bg-transparent text-center tabular-nums"
      />
    )
  }
  return (
    <button
      type="button"
      onClick={onStartEdit}
      onPointerDown={e => e.stopPropagation()}
      className="text-sm font-bold text-gray-900 hover:text-brand transition-colors cursor-text tabular-nums"
    >
      {formatKRW(value)}
    </button>
  )
}

// ─── SavingsGoalWidget ────────────────────────────────────────────────────────

export default function SavingsGoalWidget({ binding, onBindingChange, onBeforeChange }: WidgetComponentProps) {
  const data = (binding as SavingsGoalBinding | null) ?? DEFAULT
  const percent = data.target > 0 ? Math.min(100, Math.round((data.current / data.target) * 100)) : 0
  const strokeDashoffset = CIRCUMFERENCE * (1 - percent / 100)

  const [editingField, setEditingField] = useState<'label' | 'current' | 'target' | null>(null)
  const [draft, setDraft] = useState('')
  const labelInputRef = useRef<HTMLInputElement>(null)

  function startEdit(field: 'label' | 'current' | 'target') {
    onBeforeChange()
    setEditingField(field)
    setDraft(field === 'label' ? data.label : String(data[field]))
    if (field === 'label') setTimeout(() => labelInputRef.current?.focus(), 0)
  }

  function commitEdit() {
    if (!editingField) return
    if (editingField === 'label') {
      onBindingChange({ ...data, label: draft.trim() || data.label })
    } else {
      const n = Number(draft.replace(/[^0-9]/g, ''))
      onBindingChange({ ...data, [editingField]: isNaN(n) ? data[editingField] : n })
    }
    setEditingField(null)
  }

  return (
    <div className="flex flex-col h-full p-4">

      {/* 위젯 타이틀 */}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Savings Goal</p>

      {/* 원형 차트 */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">

        {/* 목표 이름 — 차트 바로 위 */}
        {editingField === 'label' ? (
          <input
            ref={labelInputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => e.key === 'Enter' && commitEdit()}
            onPointerDown={e => e.stopPropagation()}
            className="text-sm font-semibold text-gray-700 text-center border-b border-brand outline-none bg-transparent w-32"
          />
        ) : (
          <button
            type="button"
            onClick={() => startEdit('label')}
            onPointerDown={e => e.stopPropagation()}
            className="text-sm font-semibold text-gray-700 text-center max-w-[140px] truncate cursor-text hover:text-brand transition-colors"
          >
            {data.label}
          </button>
        )}

        {/* 원형 차트 본체 */}
        <div className="relative inline-flex items-center justify-center">
          <svg width="124" height="124" viewBox="0 0 124 124">
            <circle cx="62" cy="62" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="9" />
            <circle
              cx="62" cy="62" r={RADIUS}
              fill="none"
              stroke={BRAND_COLORS.light}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 62 62)"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          {/* 차트 중앙: 퍼센트만 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-gray-900">{percent}%</span>
            <span className="text-xs text-gray-400">달성</span>
          </div>
        </div>
      </div>

      {/* 하단: Current → Target 진행 바 + 금액 */}
      <div className="mt-3 flex flex-col gap-2">
        {/* 선형 진행 바 */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* 금액 행 */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">현재</span>
            <EditableAmount
              value={data.current}
              isEditing={editingField === 'current'}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit('current')}
              onCommit={commitEdit}
            />
          </div>

          {/* 남은 금액 뱃지 */}
          {data.target > data.current && (
            <span className="text-[10px] text-gray-400 pb-0.5">
              {formatKRW(data.target - data.current)} 남음
            </span>
          )}
          {data.current >= data.target && data.target > 0 && (
            <span className="text-[10px] font-bold text-brand pb-0.5">🎉 달성!</span>
          )}

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">목표</span>
            <EditableAmount
              value={data.target}
              isEditing={editingField === 'target'}
              draft={draft}
              onDraftChange={setDraft}
              onStartEdit={() => startEdit('target')}
              onCommit={commitEdit}
            />
          </div>
        </div>
      </div>

    </div>
  )
}

// 내역 탭 하단 — 현재 설정된 컬럼 매핑 현황 표시
'use client'

import { X } from 'lucide-react'
import { RECORD_COLUMN_LABELS } from '@/features/ledger/record/types'
import type { RecordColumn, ColumnMappingEntry } from '@/features/ledger/record/types'

interface Props {
  columnMappings: ColumnMappingEntry[]
  onRemove:       (col: RecordColumn) => void
}

export default function MappingBar({ columnMappings, onRemove }: Props) {
  if (columnMappings.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-5 py-2 border-t border-gray-200 shrink-0 bg-gray-50/60">
      <span className="text-[10px] text-gray-400 shrink-0">매핑.</span>
      {columnMappings.map(m => (
        <span
          key={m.column}
          className="flex items-center gap-1 text-[11px] border border-brand/30 bg-brand/5 text-brand rounded-full px-2 py-0.5"
        >
          <span className="font-medium">{RECORD_COLUMN_LABELS[m.column]}</span>
          <span className="opacity-50">→</span>
          <span className="font-mono">{m.address}</span>
          <button
            onClick={() => onRemove(m.column)}
            className="opacity-50 hover:opacity-100 leading-none ml-0.5"
          >
            <X size={10} />
          </button>
        </span>
      ))}
    </div>
  )
}

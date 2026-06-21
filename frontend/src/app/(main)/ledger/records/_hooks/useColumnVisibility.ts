// 내역 테이블 컬럼 표시 여부 localStorage 영속화
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RecordColumn } from '@/features/ledger/record/types'

const KEY = 'mm.columnVisibility.v2'

const ALL_COLUMNS: RecordColumn[] = [
  'date', 'time', 'type', 'category', 'subcategory',
  'description', 'amount', 'currency', 'paymentMethod', 'memo',
]

// 기본으로 모든 컬럼 표시
const DEFAULT_VISIBLE: RecordColumn[] = [...ALL_COLUMNS]

function load(): RecordColumn[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_VISIBLE
    const parsed = JSON.parse(raw) as RecordColumn[]
    // 유효한 컬럼만 필터
    return parsed.filter(c => ALL_COLUMNS.includes(c))
  } catch {
    return DEFAULT_VISIBLE
  }
}

export function useColumnVisibility() {
  const [visible, setVisible] = useState<RecordColumn[]>(DEFAULT_VISIBLE)

  useEffect(() => { setVisible(load()) }, [])

  const toggle = useCallback((col: RecordColumn) => {
    setVisible(prev => {
      const next = prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
      try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { visible, toggle, ALL_COLUMNS }
}

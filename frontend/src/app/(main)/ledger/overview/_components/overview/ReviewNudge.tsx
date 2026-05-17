// 현황 — 리뷰 안 한 내역 N건 유도 배너
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LedgerRecord } from '@/features/ledger/record/types'
export default function ReviewNudge({ records, canvasId }: { records: LedgerRecord[]; canvasId: string | null }) {
  const unreviewed = useMemo(() => {
    return records.filter(r => r.type === '지출' && r.review === null).length
  }, [records])

  if (unreviewed === 0) return null

  const href = canvasId ? `/ledger/records?led=${canvasId}` : '/ledger/records'

  return (
    <Link
      href={href}
      className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 hover:bg-amber-100 transition-colors"
    >
      <div>
        <p className="text-sm font-medium text-amber-800">
          이번달 리뷰하지 않은 지출 <span className="font-bold">{unreviewed}건</span>
        </p>
        <p className="text-xs text-amber-600 mt-0.5">내역 탭에서 만족/후회를 체크하면 분석이 더 정확해져요.</p>
      </div>
      <ArrowRight size={16} className="text-amber-500 shrink-0" />
    </Link>
  )
}

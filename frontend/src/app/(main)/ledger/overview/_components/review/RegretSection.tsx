// 현황 — 후회 소비: 핵심 숫자 + 패턴 분석(카테고리/시간대/결제수단) + 내역 리스트
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { LedgerRecord } from '@/features/ledger/record/types'

interface Props {
  records: LedgerRecord[]
  allRecords: LedgerRecord[]   // 전월 비교 + 추세용 (전체 기간)
  refMonth: string             // 현재 기준 'YYYY-MM'
  ledId?: string | null        // 목표 탭 링크용
}

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `₩${Math.round(n / 10_000)}만`
  return `₩${n.toLocaleString()}`
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type SortKey = 'amount' | 'date'

export default function RegretSection({ records, allRecords, refMonth, ledId }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('amount')

  // 이번 기간 — 후회/전체 집계
  const { regretItems, regretTotal, expenseTotal } = useMemo(() => {
    let expenseTotal = 0
    const regretItems: LedgerRecord[] = []
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      expenseTotal += r.amount
      if (r.review === 'bad') regretItems.push(r)
    }
    return {
      regretItems,
      regretTotal: regretItems.reduce((s, r) => s + r.amount, 0),
      expenseTotal,
    }
  }, [records])

  // 정렬된 내역
  const sortedItems = useMemo(() => {
    const arr = [...regretItems]
    if (sortKey === 'amount') arr.sort((a, b) => b.amount - a.amount)
    else arr.sort((a, b) => b.date.localeCompare(a.date))
    return arr
  }, [regretItems, sortKey])

  // 카테고리별 후회율 (이번 기간 기준)
  const categoryStats = useMemo(() => {
    const stat = new Map<string, { total: number; regret: number; regretAmt: number }>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const k = r.category || '기타'
      const cur = stat.get(k) ?? { total: 0, regret: 0, regretAmt: 0 }
      cur.total++
      if (r.review === 'bad') { cur.regret++; cur.regretAmt += r.amount }
      stat.set(k, cur)
    }
    return Array.from(stat.entries())
      .filter(([, v]) => v.regret > 0)
      .map(([label, v]) => ({ label, ratio: v.regret / v.total, regret: v.regret, total: v.total, regretAmt: v.regretAmt }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
  }, [records])

  // 시간대별 후회 (요일+시간대 조합)
  const timeStats = useMemo(() => {
    const DOW = ['일', '월', '화', '수', '목', '금', '토']
    type Bucket = { label: string; count: number; amount: number }
    const buckets = new Map<string, Bucket>()
    for (const r of regretItems) {
      const d = new Date(r.date)
      const dow = DOW[d.getDay()]
      const hh = r.time ? Number(r.time.slice(0, 2)) : -1
      let timeBand = '시간 미상'
      if (hh >= 0) {
        if (hh < 6) timeBand = '새벽'
        else if (hh < 12) timeBand = '오전'
        else if (hh < 18) timeBand = '오후'
        else if (hh < 22) timeBand = '저녁'
        else timeBand = '심야'
      }
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      const key = isWeekend ? `주말 ${timeBand}` : `${dow} ${timeBand}`
      const cur = buckets.get(key) ?? { label: key, count: 0, amount: 0 }
      cur.count++; cur.amount += r.amount
      buckets.set(key, cur)
    }
    return Array.from(buckets.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [regretItems])

  // 결제수단별 후회율
  const paymentStats = useMemo(() => {
    const stat = new Map<string, { total: number; regret: number }>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const k = r.paymentMethod || '미상'
      const cur = stat.get(k) ?? { total: 0, regret: 0 }
      cur.total++
      if (r.review === 'bad') cur.regret++
      stat.set(k, cur)
    }
    return Array.from(stat.entries())
      .filter(([, v]) => v.total >= 2)
      .map(([label, v]) => ({ label, ratio: v.regret / v.total, regret: v.regret, total: v.total }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3)
  }, [records])

  // 전월 후회 + 3개월 추세
  const trend = useMemo(() => {
    if (!refMonth) return { prev: 0, recent: [] as number[], months: [] as string[] }
    const ym = (delta: number) => shiftMonth(refMonth, delta)
    function regretSumOf(month: string) {
      let s = 0
      for (const r of allRecords) {
        if (r.type !== '지출' || r.review !== 'bad') continue
        if (r.date.startsWith(month)) s += r.amount
      }
      return s
    }
    const months = [ym(-2), ym(-1), ym(0)]
    return {
      prev: regretSumOf(ym(-1)),
      recent: months.map(regretSumOf),
      months,
    }
  }, [allRecords, refMonth])

  const ratioPct = expenseTotal > 0 ? Math.round((regretTotal / expenseTotal) * 100) : 0
  const deltaPct = trend.prev > 0 ? Math.round(((regretTotal - trend.prev) / trend.prev) * 100) : null

  if (regretItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold text-gray-800">후회 소비</p>
        </div>
        <p className="text-xs text-gray-300">
          내역에서 😞 후회를 체크하면 패턴이 분석돼요.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-800">후회 소비</p>
      </div>

      {/* 핵심 숫자 박스 — 간결형 */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-2xl font-extrabold text-red-500 tabular-nums leading-none">{fmtW(regretTotal)}</p>
          {deltaPct !== null && (
            <span className={`text-sm font-semibold tabular-nums ${deltaPct <= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {deltaPct <= 0 ? '▼' : '▲'}{Math.abs(deltaPct)}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500 mt-1.5">
          이번달 후회 · 전체 지출의 <span className="font-semibold text-gray-700">{ratioPct}%</span>
          {deltaPct !== null && <> · 지난달 {fmtW(trend.prev)}</>}
        </p>
      </div>

      {/* 패턴 TOP */}
      <p className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2">후회 패턴 TOP</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* 카테고리 */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gray-400 mb-1.5">📍 카테고리</p>
          {categoryStats.length === 0 ? (
            <p className="text-[10px] text-gray-300">—</p>
          ) : (
            <div className="flex flex-col gap-1">
              {categoryStats.map(c => (
                <div key={c.label} className="text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-700 truncate">{c.label}</span>
                    <span className="text-red-500 font-semibold tabular-nums">{Math.round(c.ratio * 100)}%</span>
                  </div>
                  <p className="text-[9px] text-gray-400">{c.total}건 중 {c.regret}건</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 시간대 */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gray-400 mb-1.5">🕐 시간대</p>
          {timeStats.length === 0 ? (
            <p className="text-[10px] text-gray-300">—</p>
          ) : (
            <div className="flex flex-col gap-1">
              {timeStats.map(t => (
                <div key={t.label} className="text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-700 truncate">{t.label}</span>
                    <span className="text-gray-700 font-semibold tabular-nums">{t.count}건</span>
                  </div>
                  <p className="text-[9px] text-gray-400 tabular-nums">{fmtW(t.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 결제수단 */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gray-400 mb-1.5">💳 결제수단</p>
          {paymentStats.length === 0 ? (
            <p className="text-[10px] text-gray-300">—</p>
          ) : (
            <div className="flex flex-col gap-1">
              {paymentStats.map(p => (
                <div key={p.label} className="text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-gray-700 truncate">{p.label}</span>
                    <span className="text-red-500 font-semibold tabular-nums">{Math.round(p.ratio * 100)}%</span>
                  </div>
                  <p className="text-[9px] text-gray-400">{p.total}건 중 {p.regret}건</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 후회 내역 리스트 */}
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-gray-400 tracking-wider">후회 내역</p>
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => setSortKey('amount')}
            className={`px-1.5 py-0.5 rounded ${sortKey === 'amount' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}
          >금액순</button>
          <button
            onClick={() => setSortKey('date')}
            className={`px-1.5 py-0.5 rounded ${sortKey === 'date' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700'}`}
          >날짜순</button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 280 }}>
        {sortedItems.map((r, i) => {
          const meta = [r.date, r.category, r.paymentMethod].filter(Boolean).join(' · ')
          return (
            <div key={r.id ?? i} className="py-2 first:pt-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-xs font-medium text-gray-800 truncate max-w-[40%]">
                  {r.description || r.memo || '(내용 없음)'}
                </p>
                {r.memo && r.memo !== r.description && (
                  <p className="text-[10px] text-gray-400 truncate max-w-[30%]">💬 {r.memo}</p>
                )}
                <p className="text-[10px] text-gray-400 shrink-0">{meta}</p>
                <span className="text-xs font-semibold text-red-400 tabular-nums ml-auto shrink-0">
                  {r.amount.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 다짐으로 만들기 → 목표 탭 */}
      <div className="flex justify-end mt-3">
        <Link
          href={ledId ? `/ledger/goals?led=${ledId}` : '/ledger/goals'}
          className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-brand transition-colors"
        >
          이 패턴을 다짐으로 만들기 <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

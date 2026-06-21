// 분석 탭 — 후회 소비 집계·추이 데이터 가공 (요약/카테고리/시간/결제/히트맵/추이)
'use client'

import { useMemo } from 'react'
import type { LedgerRecord } from '@/features/ledger/record/types'
import { shiftMonth } from '../_utils/format'
import type { ViewMode } from './usePeriodNav'

export interface CategoryStat {
  label:     string
  ratio:     number   // 후회 빈도 = 후회건수 / 전체건수
  amtRatio:  number   // 후회 금액 비중 = 후회금액 / 전체금액
  regret:    number
  total:     number
  regretAmt: number
  totalAmt:  number
}

export interface TimeStat {
  label:  string
  count:  number
  amount: number
}

export interface PaymentStat {
  label:     string
  ratio:     number
  regret:    number
  total:     number
  regretAmt: number
}

export interface HeatCell {
  count:  number
  amount: number
}

export interface HeatTotal {
  count:  number
  amount: number
}

export interface TrendBucket {
  key:       string
  label:     string
  showLabel: boolean
  weekend:   boolean
  regret:    number   // 누적 후회 금액
  daily:     number   // 해당 버킷 후회 금액
  regretCnt: number   // 누적 후회 건수
}

const DOW = ['일', '월', '화', '수', '목', '금', '토']
export const TIME_BANDS = ['새벽', '오전', '오후', '저녁', '심야'] as const

interface Params {
  records:     LedgerRecord[]
  viewMode:    ViewMode
  activeMonth: string | null
  activeYear:  string
}

export function useRegretAnalysis({ records, viewMode, activeMonth, activeYear }: Params) {
  const filteredRecords = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return records
      return records.filter(r => r.date.startsWith(activeMonth))
    }
    return records.filter(r => r.date.startsWith(activeYear))
  }, [records, viewMode, activeMonth, activeYear])

  const expense = useMemo(
    () => filteredRecords.filter(r => r.type === '지출' && r.amount > 0).reduce((s, r) => s + r.amount, 0),
    [filteredRecords],
  )
  const expenseCount = useMemo(
    () => filteredRecords.filter(r => r.type === '지출' && r.amount > 0).length,
    [filteredRecords],
  )

  const summary = useMemo(() => {
    let regretTotal = 0, regretCount = 0
    const regretItems: LedgerRecord[] = []
    const catStat  = new Map<string, { total: number; totalAmt: number; regret: number; regretAmt: number }>()
    const timeStat = new Map<string, { label: string; count: number; amount: number }>()
    // 히트맵용: 'weekday' | 'weekend' × 시간대
    const heatStat = new Map<string, { count: number; amount: number }>()
    const payStat  = new Map<string, { total: number; regret: number; regretAmt: number }>()

    for (const r of filteredRecords) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const k = r.category || '기타'
      const cur = catStat.get(k) ?? { total: 0, totalAmt: 0, regret: 0, regretAmt: 0 }
      cur.total++; cur.totalAmt += r.amount
      const pk = r.paymentMethod || '미상'
      const pc = payStat.get(pk) ?? { total: 0, regret: 0, regretAmt: 0 }
      pc.total++
      if (r.review === 'bad') {
        regretTotal += r.amount; regretCount++; regretItems.push(r)
        cur.regret++; cur.regretAmt += r.amount
        pc.regret++; pc.regretAmt += r.amount
        const d = new Date(r.date)
        const dow = DOW[d.getDay()]
        const hh = r.time ? Number(r.time.slice(0, 2)) : -1
        const band = hh < 0 ? '시간미상' : hh < 6 ? '새벽' : hh < 12 ? '오전' : hh < 18 ? '오후' : hh < 22 ? '저녁' : '심야'
        const isWe = d.getDay() === 0 || d.getDay() === 6
        const tk = isWe ? `주말 ${band}` : `${dow} ${band}`
        const tc = timeStat.get(tk) ?? { label: tk, count: 0, amount: 0 }
        tc.count++; tc.amount += r.amount; timeStat.set(tk, tc)
        if (band !== '시간미상') {
          const hk = `${isWe ? 'weekend' : 'weekday'}:${band}`
          const hc = heatStat.get(hk) ?? { count: 0, amount: 0 }
          hc.count++; hc.amount += r.amount; heatStat.set(hk, hc)
        }
      }
      catStat.set(k, cur); payStat.set(pk, pc)
    }
    const regretPct = expense > 0 ? Math.round((regretTotal / expense) * 100) : 0

    let prevRegret = 0
    if (viewMode === 'month' && activeMonth) {
      const prev = shiftMonth(activeMonth, -1)
      for (const r of records) {
        if (r.type === '지출' && r.review === 'bad' && r.date.startsWith(prev)) prevRegret += r.amount
      }
    }

    const categoryStats: CategoryStat[] = Array.from(catStat.entries())
      .filter(([, v]) => v.regret > 0)
      .map(([label, v]) => ({
        label,
        ratio: v.regret / v.total,
        amtRatio: v.totalAmt > 0 ? v.regretAmt / v.totalAmt : 0,
        regret: v.regret, total: v.total, regretAmt: v.regretAmt, totalAmt: v.totalAmt,
      }))
      .sort((a, b) => b.ratio - a.ratio)

    const timeStats: TimeStat[] = Array.from(timeStat.values())
      .sort((a, b) => b.count - a.count).slice(0, 3)

    const heatmap = {
      weekday: TIME_BANDS.map(b => heatStat.get(`weekday:${b}`) ?? { count: 0, amount: 0 }),
      weekend: TIME_BANDS.map(b => heatStat.get(`weekend:${b}`) ?? { count: 0, amount: 0 }),
    }
    const heatMaxCount = Math.max(1, ...heatmap.weekday.map(h => h.count), ...heatmap.weekend.map(h => h.count))
    const weekdayTotal: HeatTotal = { count: heatmap.weekday.reduce((s, h) => s + h.count, 0), amount: heatmap.weekday.reduce((s, h) => s + h.amount, 0) }
    const weekendTotal: HeatTotal = { count: heatmap.weekend.reduce((s, h) => s + h.count, 0), amount: heatmap.weekend.reduce((s, h) => s + h.amount, 0) }

    const paymentStats: PaymentStat[] = Array.from(payStat.entries())
      .filter(([, v]) => v.total >= 2)
      .map(([label, v]) => ({ label, ratio: v.regret / v.total, regret: v.regret, total: v.total, regretAmt: v.regretAmt }))
      .sort((a, b) => b.ratio - a.ratio).slice(0, 3)

    // 후회 없는 날 계산 (월 모드만)
    let cleanDays = 0, totalDays = 0
    if (viewMode === 'month' && activeMonth) {
      const [y, mo] = activeMonth.split('-').map(Number)
      totalDays = new Date(y, mo, 0).getDate()
      const regretDays = new Set(
        filteredRecords.filter(r => r.type === '지출' && r.review === 'bad').map(r => r.date)
      )
      cleanDays = totalDays - regretDays.size
    }

    return { regretTotal, regretCount, regretPct, prevRegret, regretItems, categoryStats, timeStats, paymentStats, heatmap, heatMaxCount, weekdayTotal, weekendTotal, cleanDays, totalDays }
  }, [filteredRecords, expense, records, activeMonth, viewMode])

  const vsRegret = summary.prevRegret > 0
    ? Math.round(((summary.regretTotal - summary.prevRegret) / summary.prevRegret) * 100)
    : null

  /* 후회 추이 — 월 모드: 일별 누적 / 연 모드: 월별 누적 */
  const regretTrend = useMemo<TrendBucket[]>(() => {
    // 버킷 키 목록 + 각 키의 x라벨 생성
    let buckets: { key: string; label: string; showLabel: boolean; weekend: boolean }[] = []
    if (viewMode === 'month') {
      if (!activeMonth) return []
      const [y, mo] = activeMonth.split('-').map(Number)
      const totalDays = new Date(y, mo, 0).getDate()
      buckets = Array.from({ length: totalDays }, (_, i) => {
        const d = i + 1
        const dow = new Date(y, mo - 1, d).getDay()
        return {
          key: `${activeMonth}-${String(d).padStart(2, '0')}`,
          label: `${d}`,
          showLabel: true,
          weekend: dow === 0 || dow === 6,
        }
      })
    } else {
      buckets = Array.from({ length: 12 }, (_, i) => ({
        key: `${activeYear}-${String(i + 1).padStart(2, '0')}`,
        label: `${i + 1}월`,
        showLabel: true,
        weekend: false,
      }))
    }

    // 버킷별 후회 금액·건수 집계
    const regretAmt = new Map<string, number>()
    const regretCnt = new Map<string, number>()
    for (const r of records) {
      if (r.type !== '지출' || r.amount <= 0 || r.review !== 'bad') continue
      const k = viewMode === 'month' ? r.date : r.date.slice(0, 7)
      regretAmt.set(k, (regretAmt.get(k) ?? 0) + r.amount)
      regretCnt.set(k, (regretCnt.get(k) ?? 0) + 1)
    }

    // 누적
    let cumAmt = 0, cumCnt = 0
    return buckets.map(b => {
      cumAmt += regretAmt.get(b.key) ?? 0
      cumCnt += regretCnt.get(b.key) ?? 0
      const daily = regretAmt.get(b.key) ?? 0
      return { key: b.key, label: b.label, showLabel: b.showLabel, weekend: b.weekend, regret: cumAmt, daily, regretCnt: cumCnt }
    })
  }, [records, activeMonth, activeYear, viewMode])

  return { expense, expenseCount, ...summary, vsRegret, regretTrend }
}

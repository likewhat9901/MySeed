// /ledger/analysis — 후회 소비 패턴 분석 탭
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'

type ViewMode = 'month' | 'year'

function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 차트 y축 상한을 1/2/5 × 10ⁿ 형태의 깔끔한 값으로 올림
function niceCeil(n: number) {
  if (n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const base = Math.pow(10, exp)
  const f = n / base
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * base
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}

export default function AnalysisPage() {
  const {
    records: rawRecords, ledgerName, canvasId,
    currentRecName, setCurrentRecName, currentRecId, setCurrentRecId,
    setRecords, refMonth, setRefMonth,
  } = useLedgerContext()
  const searchParams = useSearchParams()
  const recIdFromUrl = searchParams.get('rec')
  const records = rawRecords ?? []

  const [viewMode, setViewMode]     = useState<ViewMode>('month')
  const [dropdownOpen, setDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const availableMonths = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 7)))
    return Array.from(s).sort()
  }, [records])
  const activeMonth = refMonth ?? availableMonths[availableMonths.length - 1] ?? null

  const availableYears = useMemo(() => {
    const s = new Set(records.map(r => r.date.slice(0, 4)))
    return Array.from(s).sort()
  }, [records])
  const [activeYear, setActiveYear] = useState(() => String(new Date().getFullYear()))

  function shiftNav(dir: 1 | -1) {
    if (viewMode === 'month') {
      const idx = availableMonths.indexOf(activeMonth ?? '')
      const next = availableMonths[idx + dir]
      if (next) setRefMonth(next)
    } else {
      const idx = availableYears.indexOf(activeYear)
      const next = availableYears[idx + dir]
      if (next) setActiveYear(next)
    }
  }
  const canPrev = viewMode === 'month'
    ? availableMonths.indexOf(activeMonth ?? '') > 0
    : availableYears.indexOf(activeYear) > 0
  const canNext = viewMode === 'month'
    ? availableMonths.indexOf(activeMonth ?? '') < availableMonths.length - 1
    : availableYears.indexOf(activeYear) < availableYears.length - 1

  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return ''
      const [y, m] = activeMonth.split('-')
      return `${y}년 ${Number(m)}월`
    }
    return `${activeYear}년`
  }, [viewMode, activeMonth, activeYear])

  useEffect(() => {
    if (!recIdFromUrl || (recIdFromUrl === currentRecId && currentRecName !== null)) return
    getRecord(recIdFromUrl).then(rec => {
      if (!rec) return
      setRecords(rec.data)
      setCurrentRecId(rec.rec_id)
      setCurrentRecName(rec.rec_name)
      const firstDate = rec.data[0]?.date
      if (firstDate) setRefMonth(firstDate.slice(0, 7))
    })
  }, [recIdFromUrl, currentRecId])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

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

  const { regretTotal, regretCount, regretPct, prevRegret, regretItems, categoryStats, timeStats, paymentStats } = useMemo(() => {
    const DOW = ['일', '월', '화', '수', '목', '금', '토']
    let regretTotal = 0, regretCount = 0
    const regretItems: typeof filteredRecords = []
    const catStat  = new Map<string, { total: number; totalAmt: number; regret: number; regretAmt: number }>()
    const timeStat = new Map<string, { label: string; count: number; amount: number }>()
    const payStat  = new Map<string, { total: number; regret: number }>()

    for (const r of filteredRecords) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const k = r.category || '기타'
      const cur = catStat.get(k) ?? { total: 0, totalAmt: 0, regret: 0, regretAmt: 0 }
      cur.total++; cur.totalAmt += r.amount
      const pk = r.paymentMethod || '미상'
      const pc = payStat.get(pk) ?? { total: 0, regret: 0 }
      pc.total++
      if (r.review === 'bad') {
        regretTotal += r.amount; regretCount++; regretItems.push(r)
        cur.regret++; cur.regretAmt += r.amount
        pc.regret++
        const d = new Date(r.date)
        const dow = DOW[d.getDay()]
        const hh = r.time ? Number(r.time.slice(0, 2)) : -1
        const band = hh < 0 ? '시간미상' : hh < 6 ? '새벽' : hh < 12 ? '오전' : hh < 18 ? '오후' : hh < 22 ? '저녁' : '심야'
        const isWe = d.getDay() === 0 || d.getDay() === 6
        const tk = isWe ? `주말 ${band}` : `${dow} ${band}`
        const tc = timeStat.get(tk) ?? { label: tk, count: 0, amount: 0 }
        tc.count++; tc.amount += r.amount; timeStat.set(tk, tc)
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

    const categoryStats = Array.from(catStat.entries())
      .filter(([, v]) => v.regret > 0)
      .map(([label, v]) => ({
        label,
        ratio: v.regret / v.total,
        amtRatio: v.totalAmt > 0 ? v.regretAmt / v.totalAmt : 0,
        regret: v.regret, total: v.total, regretAmt: v.regretAmt, totalAmt: v.totalAmt,
      }))
      .sort((a, b) => b.ratio - a.ratio).slice(0, 5)

    const timeStats = Array.from(timeStat.values())
      .sort((a, b) => b.count - a.count).slice(0, 3)

    const paymentStats = Array.from(payStat.entries())
      .filter(([, v]) => v.total >= 2)
      .map(([label, v]) => ({ label, ratio: v.regret / v.total, regret: v.regret, total: v.total }))
      .sort((a, b) => b.ratio - a.ratio).slice(0, 3)

    return { regretTotal, regretCount, regretPct, prevRegret, regretItems, categoryStats, timeStats, paymentStats }
  }, [filteredRecords, expense, records, activeMonth, viewMode])

  const vsRegret = prevRegret > 0
    ? Math.round(((regretTotal - prevRegret) / prevRegret) * 100)
    : null

  /* 후회 추이 — 월 모드: 일별 누적 / 연 모드: 월별 누적 */
  const regretTrend = useMemo(() => {
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '분석'}</h1>
            {currentRecName && <p className="text-[11px] text-gray-400">{currentRecName}</p>}
          </div>
          <div className="flex border border-gray-300 text-[10px] font-semibold overflow-hidden">
            {(['month', 'year'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1 transition-colors ${
                  viewMode === mode ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {mode === 'month' ? 'MTH' : 'YR'}
              </button>
            ))}
          </div>
          <div className="relative flex items-center gap-1" ref={dropdownRef}>
            <button onClick={() => shiftNav(-1)} disabled={!canPrev}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => viewMode === 'month' ? setDropdown(v => !v) : undefined}
              className={`text-xs font-semibold text-gray-700 min-w-[88px] text-center px-2 py-1 border border-gray-200 ${
                viewMode === 'month' ? 'hover:border-gray-400 cursor-pointer' : 'cursor-default'
              }`}
            >
              {navLabel}
            </button>
            <button onClick={() => shiftNav(1)} disabled={!canNext}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
            {dropdownOpen && viewMode === 'month' && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md py-0.5 min-w-[100px]">
                {availableMonths.map(m => (
                  <button key={m}
                    onClick={() => { setRefMonth(m); setDropdown(false) }}
                    className={`w-full px-4 py-1.5 text-left text-xs transition-colors ${
                      m === activeMonth ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">

          <div>
            <SectionLabel label="Regret Summary — 후회 소비" />
            {regretCount === 0 ? (
              <div className="bg-white border border-gray-300 px-5 py-4 text-xs text-gray-400">
                후회로 표시된 지출이 없습니다. 내역에서 😞를 체크하면 여기서 분석됩니다.
              </div>
            ) : (
              <div className="flex flex-col gap-4">

                {/* 행 1: 요약 카드(2열) + 패턴(1열) */}
                <div className="grid grid-cols-3 gap-4">

                  {/* 요약 카드 — 2열 차지, 좌(핵심 수치) / 우(인사이트) */}
                  <div className="col-span-2 bg-white border border-gray-300 flex">

                    {/* 좌: 총액·건수 가로 → 비중 바 → 전월 한 줄 */}
                    <div className="w-1/2 min-w-0 flex flex-col divide-y divide-gray-100 border-r border-gray-200">
                      {/* 총액 / 건수 가로 */}
                      <div className="px-4 py-3 flex gap-4 flex-1 items-center">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">후회 총액</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-2xl font-extrabold text-red-500 leading-none tabular-nums">{fmtW(regretTotal)}</p>
                            {vsRegret != null && (
                              <span className={`text-[10px] font-bold tabular-nums ${vsRegret <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {vsRegret <= 0 ? '▼' : '▲'}{Math.abs(vsRegret)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">건당 평균 {fmtW(Math.round(regretTotal / regretCount))}</p>
                        </div>
                        <div className="flex-1 border-l border-gray-100 pl-4">
                          <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">건수</p>
                          <p className="text-2xl font-extrabold text-gray-800 leading-none tabular-nums">{regretCount}건</p>
                          <p className="text-[10px] text-gray-400 mt-1 tabular-nums">😞 {regretCount}/{expenseCount}건</p>
                        </div>
                      </div>
                      {/* 비중 바 */}
                      <div className="px-4 py-3 flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">전체 지출 중 후회</span>
                          <span className="text-[10px] font-bold text-gray-700 tabular-nums">{regretPct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100">
                          <div className="h-full bg-red-400 transition-all" style={{ width: `${Math.min(regretPct, 100)}%` }} />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 tabular-nums">{fmtW(regretTotal)} / 전체 {fmtW(expense)}</p>
                      </div>
                      {/* 전월 한 줄 */}
                      {viewMode === 'month' && (
                        <div className="px-4 py-2.5 flex items-center justify-between">
                          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">전월 대비</span>
                          <span className="text-[11px] tabular-nums">
                            <span className="text-gray-400">{prevRegret > 0 ? fmtW(prevRegret) : '₩0'}</span>
                            <span className="text-gray-300 mx-1">→</span>
                            <span className="font-semibold text-gray-800">{fmtW(regretTotal)}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 우: 인사이트 전용 */}
                    <div className="w-1/2 min-w-0 px-4 py-3 bg-gray-50 flex flex-col gap-2">
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">💡 INSIGHT</p>
                      {(() => {
                        const topCat = categoryStats[0]
                        if (!topCat) return <p className="text-[11px] text-gray-400">분석할 후회 데이터가 부족해요.</p>
                        const concentratePct = Math.round((topCat.regretAmt / regretTotal) * 100)
                        const topTime = timeStats[0]
                        const topPay  = paymentStats[0]
                        return (
                          <>
                            <p className="text-[12px] text-gray-700 leading-relaxed">
                              후회의 <span className="font-bold text-red-500 tabular-nums">{concentratePct}%</span>가{' '}
                              <span className="font-semibold text-gray-800">{categoryStats.map(c => c.label).join('·')}</span>에 집중됐어요
                            </p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400">TOP</span>
                              <span className="text-[12px] font-semibold text-gray-800">{topCat.label}</span>
                              <span className="text-[11px] text-red-500 font-semibold tabular-nums">{fmtW(topCat.regretAmt)}</span>
                            </div>
                            {topTime && (
                              <p className="text-[11px] text-gray-600 leading-relaxed">
                                주로 <span className="font-semibold text-gray-800">{topTime.label}</span>에 후회했어요
                                <span className="text-gray-400 tabular-nums"> ({topTime.count}건)</span>
                              </p>
                            )}
                            {topPay && topPay.regret > 0 && (
                              <p className="text-[11px] text-gray-600 leading-relaxed">
                                <span className="font-semibold text-gray-800">{topPay.label}</span> 결제가 후회율 가장 높음
                                <span className="text-red-500 font-semibold tabular-nums"> {Math.round(topPay.ratio * 100)}%</span>
                              </p>
                            )}
                            <p className="text-[11px] text-gray-500 mt-auto pt-1 border-t border-gray-200 tabular-nums">
                              줄였으면 순수입 <span className="font-semibold text-gray-700">{fmtW(regretTotal)} ↑</span>
                            </p>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* 패턴 카드 — 1열 */}
                  <div className="bg-white border border-gray-300 flex flex-col">
                    <div className="px-4 py-3 flex flex-col gap-3 flex-1">
                      {timeStats.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-1.5">🕐 TIME PATTERN</p>
                          <div className="flex flex-col gap-1">
                            {timeStats.map(t => (
                              <div key={t.label} className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-600">{t.label}</span>
                                <span className="tabular-nums shrink-0 ml-2">
                                  <span className="text-gray-500">{t.count}건</span>
                                  <span className="text-gray-300 mx-1">·</span>
                                  <span className="text-gray-800 font-semibold">{fmtW(t.amount)}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {paymentStats.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-1.5">💳 PAYMENT</p>
                          <div className="flex flex-col gap-1">
                            {paymentStats.map(p => (
                              <div key={p.label} className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-600 truncate mr-2">{p.label}</span>
                                <span className="text-gray-500 tabular-nums shrink-0">
                                  {Math.round(p.ratio * 100)}%({p.regret}/{p.total})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ── REGRET BY CATEGORY ── */}
          {regretCount > 0 && (
            <div>
              <SectionLabel label="Regret by Category — 후회 카테고리 / 내역" />
              <div className="grid grid-cols-3 gap-4">

                {/* 카테고리 TOP5 — 2열 차지 (후회율 바 포함) */}
                <div className="col-span-2 bg-white border border-gray-300">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">후회 카테고리 TOP 5</p>
                  </div>
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-[14px_80px_56px_1fr_88px_1fr_26px] gap-x-2 pb-1 border-b border-gray-200 text-[9px] font-bold tracking-widest uppercase text-gray-400">
                      <span>#</span>
                      <span className="truncate">카테고리</span>
                      <span className="text-right">건수</span>
                      <span className="truncate text-center">후회 빈도</span>
                      <span className="text-right">금액</span>
                      <span className="truncate text-center">후회 금액</span>
                      <span className="text-right">점수</span>
                    </div>
                    {(() => {
                      const maxAmt = categoryStats[0]?.regretAmt ?? 1
                      const short = (n: number) => n >= 10_000 ? `${(n / 10_000).toFixed(n % 10_000 === 0 ? 0 : 1)}만` : `${(n / 1000).toFixed(0)}천`
                      return categoryStats.slice(0, 5).map((c, i) => {
                        const score = Math.round(c.ratio * 60 + (c.regretAmt / maxAmt) * 40)
                        const ratioPct = Math.round(c.ratio * 100)
                        const amtPct = Math.round(c.amtRatio * 100)
                        return (
                          <div key={c.label} className="grid grid-cols-[14px_80px_56px_1fr_88px_1fr_26px] gap-x-2 items-center border-b border-gray-100 py-1.5">
                            <span className="text-[10px] text-gray-400 tabular-nums">{i + 1}</span>
                            <span className="text-[11px] text-gray-700 truncate">{c.label}</span>
                            <span className="text-[10px] text-gray-500 tabular-nums text-right">{c.regret}/{c.total}건</span>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-gray-100">
                                <div className="h-full bg-red-400" style={{ width: `${ratioPct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right shrink-0">{ratioPct}%</span>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-800 tabular-nums text-right">{short(c.regretAmt)}/{short(c.totalAmt)}</span>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-gray-100">
                                <div className="h-full bg-orange-400" style={{ width: `${amtPct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-500 tabular-nums w-7 text-right shrink-0">{amtPct}%</span>
                            </div>
                            <span className="text-[11px] font-bold text-red-500 tabular-nums text-right">{score}</span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* 후회 내역 TOP5 — 1열 */}
                <div className="bg-white border border-gray-300">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">후회 내역 TOP 5</p>
                  </div>
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-[14px_1fr_40px_44px_28px] gap-x-1.5 pb-1 border-b border-gray-200 text-[9px] font-bold tracking-widest uppercase text-gray-400">
                      <span>#</span>
                      <span>내역</span>
                      <span className="truncate">카테</span>
                      <span className="text-right">금액</span>
                      <span className="text-right">점수</span>
                    </div>
                    {(() => {
                      const sorted = [...regretItems].sort((a, b) => b.amount - a.amount).slice(0, 5)
                      const maxAmt = sorted[0]?.amount ?? 1
                      return sorted.map((r, i) => {
                        const score = Math.round((r.amount / maxAmt) * 100)
                        return (
                          <div key={r.id ?? i} className="grid grid-cols-[14px_1fr_40px_44px_28px] gap-x-1.5 items-center border-b border-gray-100 py-1.5">
                            <span className="text-[10px] text-gray-400 tabular-nums">{i + 1}</span>
                            <span className="text-[11px] text-gray-700 truncate">{r.description || r.category || '(내용 없음)'}</span>
                            <span className="text-[9px] text-gray-400 truncate">{r.category}</span>
                            <span className="text-[11px] font-semibold text-gray-800 tabular-nums text-right">{fmtW(r.amount)}</span>
                            <span className="text-[11px] font-bold text-red-500 tabular-nums text-right">{score}</span>
                          </div>
                        )
                      })
                    })()}
                    {regretItems.length > 5 && (
                      <p className="text-[10px] text-gray-400 text-right mt-1.5">전체 {regretCount}건 보기 →</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── REGRET TREND ── */}
          {regretTrend.some(t => t.regret > 0) && (
            <div>
              <SectionLabel label="Regret Trend — 후회 추이" />
              <div className="bg-white border border-gray-300 px-5 py-4">
                {(() => {
                  const last = regretTrend[regretTrend.length - 1]
                  const n = regretTrend.length

                  // 좌축(누적 라인) / 우축(일별 막대) — 각자 깔끔한 상한
                  const cumMax   = niceCeil(Math.max(...regretTrend.map(t => t.regret), 1))
                  const dailyMax = niceCeil(Math.max(...regretTrend.map(t => t.daily), 1))
                  const yTicks = [1, 0.5, 0]   // 비율 (상단→하단)

                  // x: 양끝에 6% 여백
                  const PAD = 6
                  const px = (i: number) => n === 1 ? 50 : PAD + (i / (n - 1)) * (100 - PAD * 2)
                  const py = (v: number) => 100 - (v / cumMax) * 100   // 누적 라인 (좌축)

                  // 누적 라인 — 모노톤 큐빅 패스
                  const pts = regretTrend.map((t, i) => [px(i), py(t.regret)] as const)
                  const clampY = (y: number) => Math.max(0, Math.min(100, y))
                  let linePath = pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : ''
                  for (let i = 0; i < pts.length - 1; i++) {
                    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
                    const c1x = p1[0] + (p2[0] - p0[0]) / 6 * 0.5, c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6 * 0.5)
                    const c2x = p2[0] - (p3[0] - p1[0]) / 6 * 0.5, c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6 * 0.5)
                    linePath += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
                  }

                  const unitLabel = viewMode === 'month' ? '일별' : '월별'
                  const barW = viewMode === 'month' ? 1.6 : 3   // 막대 폭(%)

                  return (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-[11px] font-semibold text-gray-800">후회 금액 {unitLabel} 추이</p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-red-200" />{unitLabel} 후회</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />누적</span>
                        </div>
                      </div>

                      {/* 차트 영역 — 좌축(40px) + 플롯 + 우축(40px) */}
                      <div className="flex relative">
                        {/* y 그리드 — 카드 안쪽 끝부터 끝까지 */}
                        {yTicks.map((_, i) => (
                          <div key={i} className="absolute left-0 right-0 border-t border-gray-200"
                            style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }} />
                        ))}

                        {/* 좌축 — 누적 */}
                        <div className="w-10 shrink-0 relative h-24">
                          {yTicks.map((r, i) => (
                            <span key={i}
                              className="absolute right-1.5 text-[9px] text-red-400 tabular-nums -translate-y-1/2 bg-white px-0.5"
                              style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }}>
                              {fmtW(Math.round(cumMax * r))}
                            </span>
                          ))}
                        </div>

                        {/* 플롯 */}
                        <div className="relative flex-1 h-24">
                          {/* 일별 막대 (라인 뒤) + 막대 위 금액 라벨 */}
                          {regretTrend.map((t, i) => t.daily > 0 && (
                            <div key={t.key}
                              className="absolute bottom-0 -translate-x-1/2 bg-red-200 rounded-sm"
                              style={{ left: `${px(i)}%`, width: `${barW}%`, height: `${(t.daily / dailyMax) * 100}%` }}>
                              <span className="absolute left-1/2 -translate-x-1/2 -top-3.5 whitespace-nowrap text-[8px] text-red-400 tabular-nums">
                                {t.daily >= 10_000 ? `${(t.daily / 10_000).toFixed(1)}만` : `${(t.daily / 1000).toFixed(1)}천`}
                              </span>
                            </div>
                          ))}

                          {/* 누적 라인 (좌축 기준) */}
                          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                            <path d={linePath} fill="none" stroke="#f87171" strokeWidth={2}
                              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                          </svg>

                          {/* 마지막 점 + 누적 금액 라벨 */}
                          {last.regret > 0 && (
                            <div className="absolute -translate-x-1/2 -translate-y-1/2"
                              style={{ left: `${px(n - 1)}%`, top: `${py(last.regret)}%` }}>
                              <span className="absolute left-1/2 -translate-x-1/2 -top-4 whitespace-nowrap text-[10px] font-bold text-red-500 tabular-nums">
                                {fmtW(last.regret)}
                              </span>
                              <div className="w-2 h-2 rounded-full bg-white border-[1.5px] border-red-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* x축 라벨 — 모든 날짜, 주말은 빨강 */}
                      <div className="flex mt-1">
                        <div className="w-10 shrink-0" />
                        <div className="relative flex-1 h-4">
                          {regretTrend.map((t, i) => t.showLabel && (
                            <span key={t.key}
                              className={`absolute -translate-x-1/2 tabular-nums ${viewMode === 'month' ? 'text-[7px]' : 'text-[9px]'} ${
                                t.weekend ? 'text-red-400' : 'text-gray-500'
                              } ${i === n - 1 ? 'font-bold' : ''}`}
                              style={{ left: `${px(i)}%` }}>
                              {t.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 요약 지표 3칸 */}
                      {(() => {
                        // 최고 후회 버킷
                        const peak = regretTrend.reduce((a, b) => b.daily > a.daily ? b : a, regretTrend[0])
                        const peakLabel = viewMode === 'month' ? `${peak.label}일` : peak.label
                        // 건당 평균 후회액
                        const avgPerCnt = last.regretCnt > 0 ? Math.round(last.regret / last.regretCnt) : 0
                        return (
                          <div className="grid grid-cols-3 divide-x divide-gray-300 mt-3 pt-3 border-t border-gray-300">
                            {/* 누적 후회 */}
                            <div className="px-2 flex items-baseline justify-between gap-2">
                              <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">누적 후회</span>
                              <div className="text-right">
                                <span className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtW(last.regret)}</span>
                                <span className="text-[9px] text-gray-400 tabular-nums ml-1">{last.regretCnt}건·건당 {fmtW(avgPerCnt)}</span>
                              </div>
                            </div>
                            {/* 최고 후회일/월 */}
                            <div className="px-3 flex items-baseline justify-between gap-2">
                              <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">최고 후회{viewMode === 'month' ? '일' : '월'}</span>
                              <div className="text-right">
                                <span className="text-[13px] font-bold text-red-500 tabular-nums">{peak.daily > 0 ? fmtW(peak.daily) : '—'}</span>
                                <span className="text-[9px] text-gray-400 tabular-nums ml-1">{peak.daily > 0 ? peakLabel : '후회 없음'}</span>
                              </div>
                            </div>
                            {/* 전월 대비 */}
                            <div className="px-3 flex items-baseline justify-between gap-2">
                              <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">전월 대비</span>
                              <div className="text-right">
                                {vsRegret != null ? (
                                  <span className={`text-[13px] font-bold tabular-nums ${vsRegret <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {vsRegret <= 0 ? '▼' : '▲'}{Math.abs(vsRegret)}%
                                  </span>
                                ) : (
                                  <span className="text-[13px] font-bold text-gray-300">—</span>
                                )}
                                <span className="text-[9px] text-gray-400 tabular-nums ml-1">{prevRegret > 0 ? `전월 ${fmtW(prevRegret)}` : '없음'}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )
                })()}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

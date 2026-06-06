// /ledger/overview2 — 현황 (사무적 디자인 비교용)
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'
import TrendLineSection from '../overview/_components/overview/TrendLineSection'

type ViewMode = 'month' | 'year'

const CATEGORY_COLORS = [
  '#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899',
  '#14b8a6','#f43f5e','#64748b','#84cc16',
]

/* ── 예산 패널 (overview2 전용 사무 스타일) ── */
interface CategoryItem { label: string; amount: number; color: string }

function BudgetPanel({ expense, categoryItems, daysLeft, viewMode }: {
  expense: number; categoryItems: CategoryItem[]; daysLeft: number; viewMode: 'month' | 'year'
}) {
  const [budget, setBudget] = useState<{ total: number; cats: Record<string, number> }>(() => {
    try {
      const saved = localStorage.getItem('overview2_budget')
      return saved ? JSON.parse(saved) : { total: 0, cats: {} }
    } catch { return { total: 0, cats: {} } }
  })
  const [open, setOpen] = useState(false)
  const [draftCats, setDraftCats] = useState<Record<string, string>>({})

  const hasBudget = budget.total > 0
  const pct       = hasBudget ? Math.min(Math.round((expense / budget.total) * 100), 100) : 0
  const remaining = budget.total - expense
  const status    = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
  const barColor  = status === 'over' ? 'bg-red-500' : status === 'warn' ? 'bg-orange-400' : 'bg-gray-700'
  const textColor = status === 'over' ? 'text-red-500' : status === 'warn' ? 'text-orange-500' : 'text-green-600'

  function fmtK(n: number) {
    if (n >= 10_000) return `₩${Math.round(n / 10_000)}만`
    return `₩${n.toLocaleString()}`
  }
  function parseAmt(s: string) {
    const n = Number(s.replace(/,/g, ''))
    return isNaN(n) || n < 0 ? 0 : n
  }
  function openModal() {
    const init: Record<string, string> = {}
    for (const it of categoryItems) init[it.label] = budget.cats[it.label] ? String(budget.cats[it.label]) : ''
    setDraftCats(init)
    setOpen(true)
  }
  function confirm() {
    const cats: Record<string, number> = {}
    for (const [k, v] of Object.entries(draftCats)) { const n = parseAmt(v); if (n > 0) cats[k] = n }
    const total = Object.values(cats).reduce((s, n) => s + n, 0)
    const next = { total, cats }
    setBudget(next)
    try { localStorage.setItem('overview2_budget', JSON.stringify(next)) } catch {}
    setOpen(false)
  }

  return (
    <>
      <div className="bg-white border border-gray-300 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">Budget Status</p>
          {hasBudget && (
            <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>
              {pct}%{status !== 'ok' ? ' ⚠' : ''}
            </span>
          )}
        </div>

        <div className="px-4 py-3 flex flex-col gap-3 flex-1">
          {!hasBudget ? (
            <p className="text-[11px] text-gray-400">예산을 설정하면 소진율이 표시돼요.</p>
          ) : (
            <>
              {/* 진행 바 */}
              <div className="h-2 bg-gray-100">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] tabular-nums">
                <span className="text-gray-500">{fmtK(expense)} / {fmtK(budget.total)}</span>
                <span className={`font-semibold ${remaining < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                  {remaining >= 0 ? `${fmtK(remaining)} 남음` : `${fmtK(-remaining)} 초과`}
                </span>
              </div>
              {viewMode === 'month' && daysLeft > 0 && (
                <p className="text-[10px] text-gray-400 tabular-nums">{daysLeft}일 남음</p>
              )}

              {/* 카테고리별 */}
              {categoryItems.some(it => (budget.cats[it.label] ?? 0) > 0) && (
                <div className="border-t border-gray-200 pt-2 flex flex-col gap-1.5">
                  {categoryItems.filter(it => (budget.cats[it.label] ?? 0) > 0).map(it => {
                    const catBudget = budget.cats[it.label]
                    const catPct = Math.min(Math.round((it.amount / catBudget) * 100), 100)
                    const isOver = catPct >= 100
                    return (
                      <div key={it.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-16 truncate shrink-0">{it.label}</span>
                        <div className="flex-1 h-1 bg-gray-100">
                          <div className={`h-full ${isOver ? 'bg-red-400' : 'bg-gray-500'}`}
                            style={{ width: `${catPct}%`, backgroundColor: isOver ? undefined : it.color }} />
                        </div>
                        <span className={`text-[10px] tabular-nums w-8 text-right shrink-0 ${isOver ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                          {catPct}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* 설정 버튼 */}
          <button
            onClick={openModal}
            className="mt-auto w-full bg-gray-900 text-white text-[10px] font-bold tracking-widest uppercase py-2 hover:bg-gray-700 transition-colors"
          >
            {hasBudget ? 'Adjust Budget' : 'Set Budget'}
          </button>
        </div>
      </div>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white w-[380px] p-5 flex flex-col gap-3 shadow-xl border border-gray-300">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-600">Budget Settings</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400 block mb-1">총 예산</label>
              <div className="flex items-center border border-gray-300 bg-gray-50">
                <span className="px-2.5 text-xs text-gray-400 bg-gray-100 border-r border-gray-300 py-2">₩</span>
                <span className="flex-1 px-2.5 py-2 text-sm text-gray-700 tabular-nums">
                  {Object.values(draftCats).reduce((s, v) => s + (parseAmt(v) || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
            {categoryItems.length > 0 && (
              <div>
                <label className="text-[9px] font-bold tracking-widest uppercase text-gray-400 block mb-2">카테고리별 예산</label>
                <div className="flex flex-col gap-1.5">
                  {categoryItems.map(it => (
                    <div key={it.label} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-600 w-20 shrink-0 truncate">{it.label}</span>
                      <div className="flex-1 flex items-center border border-gray-200">
                        <span className="px-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5">₩</span>
                        <input type="number" value={draftCats[it.label] ?? ''}
                          onChange={e => setDraftCats(p => ({ ...p, [it.label]: e.target.value }))}
                          placeholder="0" className="flex-1 px-2 py-1.5 text-xs text-gray-800 focus:outline-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1 border-t border-gray-200">
              <button onClick={() => setOpen(false)} className="text-xs px-4 py-2 text-gray-500 hover:bg-gray-100">취소</button>
              <button onClick={confirm} className="text-xs px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 font-semibold">저장</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── 헬퍼 ── */
function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}
function fmtShort(n: number) {
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`
  return n.toLocaleString()
}
function pctDelta(curr: number, prev: number) {
  if (prev <= 0) return null
  return Math.round(((curr - prev) / prev) * 100)
}
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ── 섹션 라벨 — 회색 라인+텍스트 ── */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}

/* ── 지표 셀 ── */
function MetricCell({
  label, value, sub, badge, badgeGood, mono = true,
}: {
  label: string; value: string; sub?: string
  badge?: string | null; badgeGood?: boolean; mono?: boolean
}) {
  return (
    <div className="px-5 py-3">
      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-extrabold text-gray-900 leading-none ${mono ? 'tabular-nums' : ''}`}>{value}</p>
      {badge != null && (
        <span className={`inline-block mt-1 text-[10px] font-semibold tabular-nums ${
          badgeGood ? 'text-green-600' : 'text-red-500'
        }`}>{badge}</span>
      )}
      {sub && <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">{sub}</p>}
    </div>
  )
}

export default function Overview2Page() {
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

  /* ── 기간 네비 ── */
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

  /* ── 필터링 ── */
  const filteredRecords = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return records
      return records.filter(r => r.date.startsWith(activeMonth))
    }
    return records.filter(r => r.date.startsWith(activeYear))
  }, [records, viewMode, activeMonth, activeYear])

  /* ── 집계 ── */
  const { expense, income, categoryItems } = useMemo(() => {
    let expense = 0, income = 0
    const catMap = new Map<string, number>()
    for (const r of filteredRecords) {
      if (r.type === '지출' && r.amount > 0) {
        expense += r.amount
        const k = r.category ?? '기타'
        catMap.set(k, (catMap.get(k) ?? 0) + r.amount)
      } else if (r.type === '수입' && r.amount > 0) {
        income += r.amount
      }
    }
    const categoryItems = Array.from(catMap.entries())
      .map(([label, amount], i) => ({ label, amount, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.amount - a.amount)
    return { expense, income, categoryItems }
  }, [filteredRecords])

  const net = income - expense

  const { prevMonthExpense, prevMonthIncome } = useMemo(() => {
    if (viewMode !== 'month' || !activeMonth) return { prevMonthExpense: 0, prevMonthIncome: 0 }
    const prevPrefix = shiftMonth(activeMonth, -1)
    const prevRecs = records.filter(r => r.date.startsWith(prevPrefix))
    return {
      prevMonthExpense: prevRecs.filter(r => r.type === '지출').reduce((s, r) => s + r.amount, 0),
      prevMonthIncome:  prevRecs.filter(r => r.type === '수입').reduce((s, r) => s + r.amount, 0),
    }
  }, [records, activeMonth, viewMode])

  /* 일평균 / 예측 */
  const { avgPerDay, projected, elapsedDays, daysLeft, totalDays, isCurrent } = useMemo(() => {
    const now = new Date()
    if (viewMode !== 'month' || !activeMonth) return { avgPerDay: 0, projected: null, elapsedDays: 0, daysLeft: 0, totalDays: 30, isCurrent: false }
    const [y, m] = activeMonth.split('-').map(Number)
    const totalDays   = new Date(y, m, 0).getDate()
    const isCurrent   = now.getFullYear() === y && now.getMonth() + 1 === m
    const elapsedDays = isCurrent ? now.getDate() : totalDays
    const avgPerDay   = elapsedDays > 0 ? Math.round(expense / elapsedDays) : 0
    const projected   = isCurrent && avgPerDay > 0 ? avgPerDay * totalDays : null
    const daysLeft    = isCurrent ? totalDays - now.getDate() : 0
    return { avgPerDay, projected, elapsedDays, daysLeft, totalDays, isCurrent }
  }, [expense, activeMonth, viewMode])

  /* 후회 집계 + 패턴 분석 */
  const { regretTotal, regretCount, regretPct, prevRegret, regretItems, categoryStats, timeStats, paymentStats } = useMemo(() => {
    const DOW = ['일', '월', '화', '수', '목', '금', '토']
    let regretTotal = 0, regretCount = 0
    const regretItems: typeof filteredRecords = []
    const catStat  = new Map<string, { total: number; regret: number; regretAmt: number }>()
    const timeStat = new Map<string, { label: string; count: number; amount: number }>()
    const payStat  = new Map<string, { total: number; regret: number }>()

    for (const r of filteredRecords) {
      if (r.type !== '지출' || r.amount <= 0) continue
      const k = r.category || '기타'
      const cur = catStat.get(k) ?? { total: 0, regret: 0, regretAmt: 0 }
      cur.total++
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
      .map(([label, v]) => ({ label, ratio: v.regret / v.total, regret: v.regret, total: v.total, regretAmt: v.regretAmt }))
      .sort((a, b) => b.ratio - a.ratio).slice(0, 3)

    const timeStats = Array.from(timeStat.values())
      .sort((a, b) => b.count - a.count).slice(0, 3)

    const paymentStats = Array.from(payStat.entries())
      .filter(([, v]) => v.total >= 2)
      .map(([label, v]) => ({ label, ratio: v.regret / v.total, regret: v.regret, total: v.total }))
      .sort((a, b) => b.ratio - a.ratio).slice(0, 3)

    return { regretTotal, regretCount, regretPct, prevRegret, regretItems, categoryStats, timeStats, paymentStats }
  }, [filteredRecords, expense, records, activeMonth, viewMode])

  /* 고정 vs 변동 */
  const { fixedTotal, varTotal, fixedCount, varCount, fixedTop, varTop } = useMemo(() => {
    const fixed: typeof filteredRecords = []
    const variable: typeof filteredRecords = []
    for (const r of filteredRecords) {
      if (r.type !== '지출' || r.amount <= 0) continue
      if (r.isFixed) fixed.push(r); else variable.push(r)
    }
    const grp = (arr: typeof filteredRecords, key: (r: typeof arr[0]) => string) => {
      const m = new Map<string, number>()
      for (const r of arr) m.set(key(r), (m.get(key(r)) ?? 0) + r.amount)
      return Array.from(m.entries()).map(([label, amount]) => ({ label, amount }))
        .sort((a, b) => b.amount - a.amount).slice(0, 4)
    }
    return {
      fixedTotal: fixed.reduce((s, r) => s + r.amount, 0),
      varTotal:   variable.reduce((s, r) => s + r.amount, 0),
      fixedCount: fixed.length,
      varCount:   variable.length,
      fixedTop:   grp(fixed,    r => r.description || r.category || '기타'),
      varTop:     grp(variable, r => r.category || '기타'),
    }
  }, [filteredRecords])

  const fixedPct  = expense > 0 ? Math.round((fixedTotal / expense) * 100) : 0
  const varPct    = expense > 0 ? Math.round((varTotal   / expense) * 100) : 0
  const fixedMax  = fixedTop[0]?.amount ?? 1
  const varMax    = varTop[0]?.amount   ?? 1

  const vsExpense = viewMode === 'month' ? pctDelta(expense, prevMonthExpense) : null
  const vsIncome  = viewMode === 'month' ? pctDelta(income,  prevMonthIncome)  : null
  const vsRegret  = prevRegret > 0       ? pctDelta(regretTotal, prevRegret)   : null

  const expenseCount  = filteredRecords.filter(r => r.type === '지출').length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 타이틀 줄 */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-gray-200 bg-white shrink-0">
        {/* 좌: 제목 + MTH/YR 토글 + 기간 네비 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-gray-800">{ledgerName ?? '현황'}</h1>
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

      {/* 본문 — gray-50 배경 + max-w-5xl */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-5 py-5">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">

          {/* ── SUMMARY ── */}
          <div>
            <SectionLabel label="Summary" />
            <div className="grid grid-cols-[2fr_1fr] gap-4">
              {/* 좌: 새 디자인 — 50:50 좌우 균등 */}
              <div className="bg-white border border-gray-300 flex divide-x divide-gray-200">

                {/* 좌측 패널 — 지출 */}
                <div className="flex-1 flex flex-col">
                  {/* 상단: 지출 큰 숫자 */}
                  <div className="px-5 py-4 flex-1">
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-2">이번달 지출</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{fmtW(expense)}</p>
                      {vsExpense != null && (
                        <span className={`text-[11px] font-semibold ${vsExpense <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {vsExpense <= 0 ? '▼' : '▲'}{Math.abs(vsExpense)}%
                        </span>
                      )}
                    </div>
                    {prevMonthExpense > 0 && (
                      <p className={`text-[11px] mt-1.5 font-medium ${expense <= prevMonthExpense ? 'text-green-600' : 'text-red-500'}`}>
                        {expense <= prevMonthExpense
                          ? `전월보다 ${fmtW(prevMonthExpense - expense)} 절약`
                          : `전월보다 ${fmtW(expense - prevMonthExpense)} 초과`}
                      </p>
                    )}
                  </div>
                  {/* 하단: 건수/일평균 */}
                  <div className="px-5 py-3 border-t border-gray-200 flex gap-6 text-[11px] flex-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">건수</span>
                      <span className="font-semibold text-gray-700 tabular-nums">{expenseCount}건</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500">일평균</span>
                      <span className="font-semibold text-gray-700 tabular-nums">{fmtW(avgPerDay)}</span>
                    </div>
                  </div>
                </div>

                {/* 우측 패널 — 수입/순수입 + 프로그레스 바 + 예측 */}
                <div className="flex-1 flex flex-col">
                  {/* 수입 / 순수입 */}
                  <div className="px-5 py-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">수입</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-green-600 tabular-nums">{fmtW(income)}</span>
                        {vsIncome != null && (
                          <span className={`text-[9px] font-semibold ${vsIncome >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {vsIncome >= 0 ? '▲' : '▼'}{Math.abs(vsIncome)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">순수입</span>
                      <span className={`text-[13px] font-bold tabular-nums ${net < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {net < 0 ? `-${fmtW(-net)}` : fmtW(net)}
                      </span>
                    </div>
                  </div>
                  {/* 기간 / 지출 프로그레스 바 */}
                  <div className="px-5 py-3 space-y-2 border-t border-gray-200">
                    {(() => {
                      const dPct = Math.min(Math.round(elapsedDays / totalDays * 100), 100)
                      const ePct = income > 0 ? Math.min(Math.round(expense / income * 100), 100) : 0
                      return <>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 w-6 shrink-0">기간</span>
                          <div className="flex-1 h-1.5 bg-gray-100">
                            <div className="h-full bg-gray-400" style={{ width: `${dPct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right shrink-0">{dPct}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 w-6 shrink-0">지출</span>
                          <div className="flex-1 h-1.5 bg-gray-100">
                            <div className={`h-full ${ePct > dPct ? 'bg-red-400' : 'bg-gray-700'}`} style={{ width: `${ePct}%` }} />
                          </div>
                          <span className="text-[10px] text-gray-400 tabular-nums w-7 text-right shrink-0">{ePct}%</span>
                        </div>
                      </>
                    })()}
                  </div>
                  {/* 예측 */}
                  <div className="px-5 py-3 border-t border-gray-200">
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-1.5">
                      Projected{isCurrent && daysLeft > 0 ? ` · ${daysLeft}일 남음` : ''}
                    </p>
                    {projected != null ? (
                      <p className={`text-sm font-semibold tabular-nums ${projected > income ? 'text-red-500' : 'text-gray-800'}`}>
                        {fmtW(projected)}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-gray-300">—</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 우: 예산 현황 */}
              <BudgetPanel
                expense={expense}
                categoryItems={categoryItems}
                daysLeft={daysLeft}
                viewMode={viewMode === 'month' ? 'month' : 'year'}
              />
            </div>
          </div>

          {/* ── EXPENSE BREAKDOWN + CATEGORY (2fr + 1fr) ── */}
          <div>
            <SectionLabel label="Expense Breakdown — Fixed vs Variable" />
            <div className="grid grid-cols-[2fr_1fr] gap-4">

              {/* 좌: Fixed / Variable 분석 */}
              <div className="bg-white border border-gray-300 px-5 py-4">
                {expense === 0 ? (
                  <p className="text-xs text-gray-400">지출 내역이 없습니다.</p>
                ) : (
                  <>
                    {/* 비율 바 */}
                    <div className="flex h-6 overflow-hidden border border-gray-300 mb-2">
                      <div className="bg-gray-800 flex items-center justify-center px-1.5 overflow-hidden" style={{ width: `${fixedPct}%` }}>
                        {fixedPct >= 12 && (
                          <span className="text-[9px] text-white font-bold whitespace-nowrap">Fixed {fixedPct}%</span>
                        )}
                      </div>
                      <div className="bg-gray-200 flex items-center justify-center px-1.5 flex-1 overflow-hidden">
                        {varPct >= 12 && (
                          <span className="text-[9px] text-gray-600 font-bold whitespace-nowrap">Variable {varPct}%</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 mb-4">
                      <div>
                        <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">FIXED 📌</p>
                        <p className="text-base font-extrabold text-gray-900 tabular-nums">{fmtW(fixedTotal)}</p>
                        <p className="text-[10px] text-gray-400 tabular-nums">{fixedPct}% · {fixedCount}건</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-0.5">VARIABLE</p>
                        <p className="text-base font-extrabold text-gray-900 tabular-nums">{fmtW(varTotal)}</p>
                        <p className="text-[10px] text-gray-400 tabular-nums">{varPct}% · {varCount}건</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6">
                      <div>
                        <div className="border-b border-gray-200 pb-0.5 mb-1.5">
                          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Fixed TOP</p>
                        </div>
                        {fixedTop.length === 0 ? (
                          <p className="text-[11px] text-gray-300">📌 표시한 항목이 없어요.</p>
                        ) : fixedTop.map((item, i) => (
                          <div key={item.label} className="flex items-center border-b border-gray-100 py-1.5 gap-2">
                            <span className="text-[9px] text-gray-300 w-3 tabular-nums">{i + 1}</span>
                            <span className="text-[11px] text-gray-700 truncate flex-1">{item.label}</span>
                            <span className="text-[11px] font-semibold text-gray-900 tabular-nums shrink-0">{fmtShort(item.amount)}</span>
                            <div className="w-16 h-1 bg-gray-100 shrink-0">
                              <div className="h-full bg-gray-700" style={{ width: `${Math.round((item.amount / fixedMax) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="border-b border-gray-200 pb-0.5 mb-1.5">
                          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Variable TOP</p>
                        </div>
                        {varTop.length === 0 ? (
                          <p className="text-[11px] text-gray-300">—</p>
                        ) : varTop.map((item, i) => {
                          const color = categoryItems.find(c => c.label === item.label)?.color ?? '#9ca3af'
                          return (
                          <div key={item.label} className="flex items-center border-b border-gray-100 py-1.5 gap-2">
                            <span className="text-[9px] text-gray-300 w-3 tabular-nums">{i + 1}</span>
                            <span className="text-[11px] text-gray-700 truncate flex-1">{item.label}</span>
                            <span className="text-[11px] font-semibold text-gray-900 tabular-nums shrink-0">{fmtShort(item.amount)}</span>
                            <div className="w-16 h-1 bg-gray-100 shrink-0">
                              <div className="h-full" style={{ width: `${Math.round((item.amount / varMax) * 100)}%`, backgroundColor: color }} />
                            </div>
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 우: By Category */}
              <div className="bg-white border border-gray-300 px-4 py-4">
                <div className="border-b border-gray-200 pb-0.5 mb-2">
                  <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">By Category</p>
                </div>
                {categoryItems.length === 0 ? (
                  <p className="text-[11px] text-gray-300">지출 내역이 없어요.</p>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {categoryItems.slice(0, 8).map(item => {
                      const pct = expense > 0 ? Math.round((item.amount / expense) * 100) : 0
                      return (
                        <div key={item.label} className="flex items-center gap-2 border-b border-gray-50 py-1.5">
                          <span className="w-2 h-2 shrink-0" style={{ background: item.color }} />
                          <span className="text-[11px] text-gray-700 truncate flex-1 min-w-0">{item.label}</span>
                          <div className="w-16 h-1.5 bg-gray-100 shrink-0">
                            <div className="h-full" style={{ width: `${pct}%`, background: item.color, opacity: 0.75 }} />
                          </div>
                          <span className="text-[10px] text-gray-400 tabular-nums w-5 text-right shrink-0">{pct}%</span>
                          <span className="text-[11px] font-medium text-gray-700 tabular-nums w-10 text-right shrink-0">{fmtShort(item.amount)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── REGRET ANALYSIS ── */}
          <div>
            <SectionLabel label="Regret Analysis — 후회 소비" />
            <div className="bg-white border border-gray-300">
              {regretCount === 0 ? (
                <div className="px-5 py-4 text-xs text-gray-400">
                  후회로 표시된 지출이 없습니다. 내역에서 😞를 체크하면 여기서 분석됩니다.
                </div>
              ) : (
                <>
                  {/* 핵심 지표 */}
                  <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
                    <MetricCell
                      label="후회 총액"
                      value={fmtW(regretTotal)}
                      badge={vsRegret != null ? `${vsRegret <= 0 ? '▼' : '▲'}${Math.abs(vsRegret)}% vs 전월` : undefined}
                      badgeGood={vsRegret != null && vsRegret <= 0}
                    />
                    <MetricCell label="비중" value={`${regretPct}%`} sub="전체 지출 대비" />
                    <MetricCell label="건수" value={`${regretCount}건`}
                      sub={prevRegret > 0 ? `전월 ${fmtW(prevRegret)}` : undefined} />
                  </div>

                  {/* 패턴 분석 3열 */}
                  <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
                    {/* 카테고리 */}
                    <div className="px-4 py-3">
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-2">📍 Category</p>
                      {categoryStats.length === 0 ? (
                        <p className="text-[11px] text-gray-300">—</p>
                      ) : categoryStats.map(c => (
                        <div key={c.label} className="border-b border-gray-100 py-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-700 truncate mr-2">{c.label}</span>
                            <span className="text-red-500 font-semibold tabular-nums shrink-0">{Math.round(c.ratio * 100)}%</span>
                          </div>
                          <p className="text-[10px] text-gray-400 tabular-nums">{c.total}건 중 {c.regret}건 · {fmtShort(c.regretAmt)}</p>
                        </div>
                      ))}
                    </div>

                    {/* 시간대 */}
                    <div className="px-4 py-3">
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-2">🕐 Time Pattern</p>
                      {timeStats.length === 0 ? (
                        <p className="text-[11px] text-gray-300">—</p>
                      ) : timeStats.map(t => (
                        <div key={t.label} className="border-b border-gray-100 py-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-700 truncate mr-2">{t.label}</span>
                            <span className="text-gray-800 font-semibold tabular-nums shrink-0">{t.count}건</span>
                          </div>
                          <p className="text-[10px] text-gray-400 tabular-nums">{fmtW(t.amount)}</p>
                        </div>
                      ))}
                    </div>

                    {/* 결제수단 */}
                    <div className="px-4 py-3">
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-2">💳 Payment</p>
                      {paymentStats.length === 0 ? (
                        <p className="text-[11px] text-gray-300">—</p>
                      ) : paymentStats.map(p => (
                        <div key={p.label} className="border-b border-gray-100 py-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-700 truncate mr-2">{p.label}</span>
                            <span className="text-red-500 font-semibold tabular-nums shrink-0">{Math.round(p.ratio * 100)}%</span>
                          </div>
                          <p className="text-[10px] text-gray-400">{p.total}건 중 {p.regret}건</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 후회 내역 리스트 */}
                  <div className="px-5 py-3">
                    <div className="border-b border-gray-200 pb-0.5 mb-2">
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">Regret Items</p>
                    </div>
                    <div className="flex flex-col max-h-48 overflow-y-auto">
                      {[...regretItems]
                        .sort((a, b) => b.amount - a.amount)
                        .map((r, i) => (
                          <div key={r.id ?? i} className="flex items-center gap-3 border-b border-gray-100 py-1.5">
                            <span className="text-[10px] text-gray-400 tabular-nums shrink-0 w-12">{r.date.slice(5)}</span>
                            <span className="text-[11px] text-gray-700 truncate flex-1 min-w-0">{r.description || r.category || '(내용 없음)'}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{r.category}</span>
                            <span className="text-[11px] font-semibold text-red-500 tabular-nums shrink-0">{fmtShort(r.amount)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── TREND ── */}
          <div>
            <SectionLabel label="Trend — 지출 추이" />
            <div className="bg-white border border-gray-300 [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
              <TrendLineSection
                records={filteredRecords}
                refMonth={activeMonth ?? ''}
                viewMode={viewMode}
                activeYear={activeYear}
                compact
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

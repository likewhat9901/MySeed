// /ledger/overview — 현황 대시보드 (요약 / 지출 쪼개기 / 후회 분석 / 추이)
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLedgerContext } from '../_context/LedgerContext'
import { getRecord } from '@/features/ledger/record/rpc'
import { useReviewSettings } from '@/features/ledger/record/reviewSettings'

type ViewMode = 'month' | 'year'

const CATEGORY_COLORS = [
  '#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899',
  '#14b8a6','#f43f5e','#64748b','#84cc16',
]

/* ── 예산 패널 (사무 스타일) ── */
interface CategoryItem { label: string; amount: number; color: string }

function BudgetPanel({ expense, categoryItems, daysLeft, viewMode }: {
  expense: number; categoryItems: CategoryItem[]; daysLeft: number; viewMode: 'month' | 'year'
}) {
  const [budget, setBudget] = useState<{ total: number; cats: Record<string, number> }>({ total: 0, cats: {} })
  const [open, setOpen] = useState(false)
  const [draftCats, setDraftCats] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const saved = localStorage.getItem('overview2_budget')
      if (saved) setBudget(JSON.parse(saved))
    } catch {}
  }, [])

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
// 차트 y축 상한을 1/2/5 × 10ⁿ 형태의 깔끔한 값으로 올림
function niceCeil(n: number) {
  if (n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const base = Math.pow(10, exp)
  const f = n / base
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * base
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

  // 고정 판정 — 내역 isFixed 또는 규칙에서 지정한 고정 카테고리
  const { settings } = useReviewSettings()
  const fixedCatSet = useMemo(() => new Set(settings.fixedCategories), [settings.fixedCategories])
  const isFixedRecord = (r: { isFixed: boolean; category: string }) => r.isFixed || fixedCatSet.has(r.category)

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

  function formatMonthLabel(month: string): string {
    const [y, m] = month.split('-')
    return `${y}년 ${Number(m)}월`
  }

  const navLabel = useMemo(() => {
    if (viewMode === 'month') {
      if (!activeMonth) return ''
      return formatMonthLabel(activeMonth)
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
  const { expense, income, transfer, categoryItems } = useMemo(() => {
    let expense = 0, income = 0, transfer = 0
    const catMap = new Map<string, number>()
    for (const r of filteredRecords) {
      if (r.type === '지출' && r.amount > 0) {
        expense += r.amount
        const k = r.category ?? '기타'
        catMap.set(k, (catMap.get(k) ?? 0) + r.amount)
      } else if (r.type === '수입' && r.amount > 0) {
        income += r.amount
      } else if (r.type === '이체' && r.amount > 0) {
        transfer += r.amount
      }
    }
    const categoryItems = Array.from(catMap.entries())
      .map(([label, amount], i) => ({ label, amount, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
      .sort((a, b) => b.amount - a.amount)
    return { expense, income, transfer, categoryItems }
  }, [filteredRecords])

  const net = income - expense

  const { prevMonthExpense, prevMonthIncome, prevMonthTransfer } = useMemo(() => {
    if (viewMode !== 'month' || !activeMonth) return { prevMonthExpense: 0, prevMonthIncome: 0, prevMonthTransfer: 0 }
    const prevPrefix = shiftMonth(activeMonth, -1)
    const prevRecs = records.filter(r => r.date.startsWith(prevPrefix))
    return {
      prevMonthExpense:  prevRecs.filter(r => r.type === '지출').reduce((s, r) => s + r.amount, 0),
      prevMonthIncome:   prevRecs.filter(r => r.type === '수입').reduce((s, r) => s + r.amount, 0),
      prevMonthTransfer: prevRecs.filter(r => r.type === '이체').reduce((s, r) => s + r.amount, 0),
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

  /* 고정 vs 변동 */
  const { fixedTotal, varTotal, fixedCount, varCount, fixedTop, varTop } = useMemo(() => {
    const fixed: typeof filteredRecords = []
    const variable: typeof filteredRecords = []
    for (const r of filteredRecords) {
      if (r.type !== '지출' || r.amount <= 0) continue
      if (isFixedRecord(r)) fixed.push(r); else variable.push(r)
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
  }, [filteredRecords, fixedCatSet])

  const fixedPct  = expense > 0 ? Math.round((fixedTotal / expense) * 100) : 0
  const varPct    = expense > 0 ? Math.round((varTotal   / expense) * 100) : 0
  const fixedMax  = fixedTop[0]?.amount ?? 1
  const varMax    = varTop[0]?.amount   ?? 1

  const vsExpense = viewMode === 'month' ? pctDelta(expense, prevMonthExpense) : null
  const vsIncome  = viewMode === 'month' ? pctDelta(income,  prevMonthIncome)  : null

  const expenseCount  = filteredRecords.filter(r => r.type === '지출').length

  /* 지출 추이 — 고정비 바닥 + 변동지출 누적 (월: 일별 / 연: 월별) */
  const trendData = useMemo(() => {
    // 버킷 키 + x라벨 + 주말
    let buckets: { key: string; label: string; weekend: boolean }[] = []
    if (viewMode === 'month') {
      if (!activeMonth) return { points: [], fixed: 0 }
      const [y, mo] = activeMonth.split('-').map(Number)
      const totalDays = new Date(y, mo, 0).getDate()
      buckets = Array.from({ length: totalDays }, (_, i) => {
        const d = i + 1
        const dow = new Date(y, mo - 1, d).getDay()
        return { key: `${activeMonth}-${String(d).padStart(2, '0')}`, label: `${d}`, weekend: dow === 0 || dow === 6 }
      })
    } else {
      buckets = Array.from({ length: 12 }, (_, i) => ({
        key: `${activeYear}-${String(i + 1).padStart(2, '0')}`, label: `${i + 1}월`, weekend: false,
      }))
    }

    // 버킷별 변동지출 + 고정비 총액
    const varDaily = new Map<string, number>()
    let fixed = 0
    for (const r of filteredRecords) {
      if (r.type !== '지출' || r.amount <= 0) continue
      if (isFixedRecord(r)) { fixed += r.amount; continue }
      const k = viewMode === 'month' ? r.date : r.date.slice(0, 7)
      varDaily.set(k, (varDaily.get(k) ?? 0) + r.amount)
    }

    // 변동 누적 (고정비를 시작점으로)
    let cum = 0
    const points = buckets.map(b => {
      const daily = varDaily.get(b.key) ?? 0
      cum += daily
      return { ...b, daily, cumWithFixed: fixed + cum }
    })
    return { points, fixed }
  }, [filteredRecords, activeMonth, activeYear, viewMode, fixedCatSet])

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
          <div className="flex items-center gap-1">
            <button onClick={() => shiftNav(-1)} disabled={!canPrev}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => viewMode === 'month' ? setDropdown(v => !v) : undefined}
                className={`text-xs font-semibold text-gray-700 min-w-[88px] text-center px-2 py-1 border border-gray-200 ${
                  viewMode === 'month' ? 'hover:border-gray-400 cursor-pointer' : 'cursor-default'
                }`}
              >
                {navLabel}
              </button>
              {dropdownOpen && viewMode === 'month' && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 shadow-md py-0.5 w-[88px]">
                  {[...availableMonths].reverse().map(m => (
                    <button key={m}
                      onClick={() => { setRefMonth(m); setDropdown(false) }}
                      className={`w-full px-2 py-1.5 text-left text-xs transition-colors ${
                        m === activeMonth ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {formatMonthLabel(m)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => shiftNav(1)} disabled={!canNext}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
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
              {/* 좌: 수치(2분할) / 우: 인사이트 — 분석 탭 요약 카드와 동형 */}
              <div className="bg-white border border-gray-300 flex">

                {/* 좌: 지출·건수 가로 → 비중 바 → 수입/순수입 */}
                <div className="w-1/2 min-w-0 flex flex-col divide-y divide-gray-100 border-r border-gray-200">
                  {/* 지출 / 건수 가로 */}
                  <div className="px-4 py-3 flex gap-4 flex-1 items-center">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">이번달 지출</p>
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-2xl font-extrabold text-gray-900 leading-none tabular-nums">{fmtW(expense)}</p>
                        {vsExpense != null && (
                          <span className={`text-[10px] font-bold tabular-nums ${vsExpense <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {vsExpense <= 0 ? '▼' : '▲'}{Math.abs(vsExpense)}%
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 tabular-nums">일평균 {fmtW(avgPerDay)}</p>
                    </div>
                    <div className="flex-1 border-l border-gray-100 pl-4">
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-1">건수</p>
                      <p className="text-2xl font-extrabold text-gray-800 leading-none tabular-nums">{expenseCount}건</p>
                      <p className="text-[10px] text-gray-400 mt-1 tabular-nums">고정 {fixedCount} · 변동 {varCount}</p>
                    </div>
                  </div>
                  {/* 지출 / 수입 / 이체 3유형 — 전월 대비 증감 포함 */}
                  <div className="px-4 py-2.5 flex-1 flex items-center">
                    <div className="grid grid-cols-3 gap-2 w-full divide-x divide-gray-100">
                      {(() => {
                        const dExp = expense - prevMonthExpense
                        const dInc = income - prevMonthIncome
                        const dTra = transfer - prevMonthTransfer
                        const delta = (d: number, goodWhenDown: boolean) => {
                          if (viewMode !== 'month' || d === 0) return null
                          const up = d > 0
                          const good = goodWhenDown ? !up : up
                          return <span className={`text-[9px] font-semibold tabular-nums ${good ? 'text-green-600' : 'text-red-500'}`}>{up ? '▲' : '▼'}{fmtW(Math.abs(d))}</span>
                        }
                        return <>
                          <div>
                            <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-0.5">지출</p>
                            <p className="text-[13px] font-bold text-gray-900 tabular-nums leading-none">{fmtW(expense)}</p>
                            <p className="mt-0.5 leading-none">{delta(dExp, true) ?? <span className="text-[9px] text-gray-300">—</span>}</p>
                          </div>
                          <div className="pl-2">
                            <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-0.5">수입</p>
                            <p className="text-[13px] font-bold text-green-600 tabular-nums leading-none">{fmtW(income)}</p>
                            <p className="mt-0.5 leading-none">{delta(dInc, false) ?? <span className="text-[9px] text-gray-300">—</span>}</p>
                          </div>
                          <div className="pl-2">
                            <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mb-0.5">이체</p>
                            <p className="text-[13px] font-bold text-gray-500 tabular-nums leading-none">{transfer > 0 ? fmtW(transfer) : '—'}</p>
                            <p className="mt-0.5 leading-none">{viewMode === 'month' && dTra !== 0 ? <span className="text-[9px] text-gray-400 tabular-nums">{dTra > 0 ? '▲' : '▼'}{fmtW(Math.abs(dTra))}</span> : <span className="text-[9px] text-gray-300">—</span>}</p>
                          </div>
                        </>
                      })()}
                    </div>
                  </div>
                  {/* 수입 중 지출 비중 바 + 순수입 */}
                  <div className="px-4 py-3 flex-1 flex flex-col justify-center">
                    {(() => {
                      const ePct = income > 0 ? Math.min(Math.round(expense / income * 100), 100) : 0
                      const sPct = income > 0 ? Math.max(100 - ePct, 0) : 0
                      return <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">
                            수입 중 지출 {income > 0 ? <span className="text-red-500">{ePct}%</span> : ''}
                          </span>
                          <span className="text-[11px] tabular-nums">
                            <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400 mr-1">순수입</span>
                            <span className={`font-bold ${net < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                              {net < 0 ? `-${fmtW(-net)}` : fmtW(net)}
                            </span>
                          </span>
                        </div>
                        {/* 스택 바 — 지출(빨강) + 순수입(파랑) */}
                        <div className="flex h-2 overflow-hidden bg-gray-100">
                          <div className="bg-red-400 h-full transition-all" style={{ width: `${ePct}%` }} />
                          <div className="bg-blue-400 h-full transition-all" style={{ width: `${sPct}%` }} />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-1 tabular-nums">지출 {fmtW(expense)} / 수입 {fmtW(income)}</p>
                      </>
                    })()}
                  </div>
                </div>

                {/* 우: 인사이트 전용 */}
                <div className="w-1/2 min-w-0 px-4 py-3 bg-gray-50 flex flex-col gap-2">
                  <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-gray-400">💡 INSIGHT</p>
                  {/* 전월 대비 */}
                  {prevMonthExpense > 0 && (
                    <p className="text-[12px] text-gray-700 leading-relaxed">
                      전월보다{' '}
                      <span className={`font-bold tabular-nums ${expense <= prevMonthExpense ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtW(Math.abs(expense - prevMonthExpense))}
                      </span>
                      {expense <= prevMonthExpense ? ' 덜 썼어요' : ' 더 썼어요'}
                    </p>
                  )}
                  {/* 고정 / 변동 분해 */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600">고정비</span>
                      <span className="tabular-nums">
                        <span className="font-semibold text-gray-800">{fmtW(fixedTotal)}</span>
                        <span className="text-gray-400 ml-1">{fixedPct}%</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600">변동지출</span>
                      <span className="tabular-nums">
                        <span className="font-semibold text-gray-800">{fmtW(varTotal)}</span>
                        <span className="text-gray-400 ml-1">{varPct}%</span>
                      </span>
                    </div>
                  </div>
                  {/* 순수입 코멘트 */}
                  {income > 0 && (
                    net >= 0 ? (
                      <p className="text-[11px] text-gray-500 mt-auto pt-1 border-t border-gray-200 tabular-nums">
                        수입의 <span className="font-semibold text-gray-700">{Math.round((net / income) * 100)}%</span>를 남겼어요
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 mt-auto pt-1 border-t border-gray-200 tabular-nums">
                        지출이 수입을 <span className="font-semibold text-red-500">{Math.round((-net / income) * 100)}%</span> 초과했어요
                      </p>
                    )
                  )}
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

          {/* ── TREND ── */}
          <div>
            <SectionLabel label="Trend — 지출 추이" />
            <div className="bg-white border border-gray-300 px-5 py-4">
              {trendData.points.length === 0 || expense === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">지출 데이터가 없어요.</p>
              ) : (() => {
                const pts = trendData.points
                const n = pts.length
                const fixed = trendData.fixed
                const last = pts[n - 1]

                const yMax = niceCeil(Math.max(...pts.map(p => p.cumWithFixed), fixed, 1))
                const yTicks = [1, 0.5, 0]

                const PAD = 6
                const px = (i: number) => n === 1 ? 50 : PAD + (i / (n - 1)) * (100 - PAD * 2)
                const py = (v: number) => 100 - (v / yMax) * 100
                const fixedY = py(fixed)                          // 고정비선 y(%)
                const dailyMax = Math.max(...pts.map(p => p.daily), 1)

                // 누적선 — 모노톤 큐빅 (고정비에서 시작)
                const linePts = pts.map((p, i) => [px(i), py(p.cumWithFixed)] as const)
                const clampY = (y: number) => Math.max(0, Math.min(100, y))
                let linePath = linePts.length ? `M ${linePts[0][0]} ${linePts[0][1]}` : ''
                for (let i = 0; i < linePts.length - 1; i++) {
                  const p0 = linePts[i - 1] ?? linePts[i], p1 = linePts[i], p2 = linePts[i + 1], p3 = linePts[i + 2] ?? p2
                  const c1x = p1[0] + (p2[0] - p0[0]) / 6 * 0.5, c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6 * 0.5)
                  const c2x = p2[0] - (p3[0] - p1[0]) / 6 * 0.5, c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6 * 0.5)
                  linePath += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
                }
                const varPct = expense > 0 ? Math.round((varTotal / expense) * 100) : 0

                return (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[11px] font-semibold text-gray-800">지출 {viewMode === 'month' ? '일별' : '월별'} 추이</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-gray-300" />{viewMode === 'month' ? '일별' : '월별'} 변동</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-700" />누적</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-0 border-t border-dashed border-orange-400" />고정비</span>
                      </div>
                    </div>

                    {/* 차트 영역 */}
                    <div className="flex relative">
                      {/* y 그리드 — 끝까지 */}
                      {yTicks.map((r, i) => (
                        <div key={i} className="absolute left-0 right-0 border-t border-gray-200"
                          style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }} />
                      ))}

                      {/* 좌축 */}
                      <div className="w-10 shrink-0 relative h-24">
                        {yTicks.map((r, i) => (
                          <span key={i} className="absolute right-1.5 text-[9px] text-gray-400 tabular-nums -translate-y-1/2 bg-white px-0.5"
                            style={{ top: `${(i / (yTicks.length - 1)) * 100}%` }}>
                            {fmtW(Math.round(yMax * r))}
                          </span>
                        ))}
                      </div>

                      {/* 플롯 */}
                      <div className="relative flex-1 h-24">
                        {/* 고정비 영역 (바닥~고정선) */}
                        {fixed > 0 && (
                          <div className="absolute left-0 right-0 bottom-0 bg-orange-50"
                            style={{ height: `${100 - fixedY}%` }} />
                        )}
                        {/* 고정비 기준선 */}
                        {fixed > 0 && (
                          <div className="absolute left-0 right-0 border-t border-dashed border-orange-400"
                            style={{ top: `${fixedY}%` }} />
                        )}

                        {/* 일별 변동 막대 (고정선 위에서) */}
                        {pts.map((p, i) => p.daily > 0 && (
                          <div key={p.key}
                            className="absolute -translate-x-1/2 bg-gray-300 rounded-sm"
                            style={{
                              left: `${px(i)}%`,
                              width: `${viewMode === 'month' ? 1.6 : 3}%`,
                              bottom: `${100 - fixedY}%`,
                              height: `${(p.daily / dailyMax) * fixedY}%`,
                            }} />
                        ))}

                        {/* 누적선 */}
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                          <path d={linePath} fill="none" stroke="#374151" strokeWidth={2}
                            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                        </svg>

                        {/* 끝점 + 총지출 라벨 */}
                        <div className="absolute -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${px(n - 1)}%`, top: `${py(last.cumWithFixed)}%` }}>
                          <span className="absolute left-1/2 -translate-x-1/2 -top-4 whitespace-nowrap text-[10px] font-bold text-gray-800 tabular-nums">
                            {fmtW(last.cumWithFixed)}
                          </span>
                          <div className="w-2 h-2 rounded-full bg-white border-[1.5px] border-gray-700" />
                        </div>
                      </div>
                    </div>

                    {/* x축 라벨 */}
                    <div className="flex mt-1">
                      <div className="w-10 shrink-0" />
                      <div className="relative flex-1 h-4">
                        {pts.map((p, i) => (
                          <span key={p.key}
                            className={`absolute -translate-x-1/2 tabular-nums ${viewMode === 'month' ? 'text-[7px]' : 'text-[9px]'} ${
                              p.weekend ? 'text-red-400' : 'text-gray-500'
                            } ${i === n - 1 ? 'font-bold' : ''}`}
                            style={{ left: `${px(i)}%` }}>
                            {p.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 요약 지표 3칸 */}
                    <div className="grid grid-cols-3 divide-x divide-gray-300 mt-3 pt-3 border-t border-gray-300">
                      <div className="px-2 flex items-baseline justify-between gap-2">
                        <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">고정비</span>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtW(fixed)}</span>
                          <span className="text-[9px] text-gray-400 tabular-nums ml-1">{expense > 0 ? Math.round((fixed / expense) * 100) : 0}%</span>
                        </div>
                      </div>
                      <div className="px-3 flex items-baseline justify-between gap-2">
                        <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">변동지출</span>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtW(varTotal)}</span>
                          <span className="text-[9px] text-gray-400 tabular-nums ml-1">{varPct}%</span>
                        </div>
                      </div>
                      <div className="px-3 flex items-baseline justify-between gap-2">
                        <span className="text-[9px] font-bold tracking-wider uppercase text-gray-400 shrink-0">총 지출</span>
                        <span className="text-[13px] font-bold text-gray-800 tabular-nums">{fmtW(expense)}</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

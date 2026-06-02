// 이번달 점검 모달 — 지출을 점검필요/소액/자동처리 3그룹으로 나눠 review(😊😐😞) 지정
'use client'

import { useMemo, useRef, useState } from 'react'
import { X, Settings, ChevronRight, ChevronDown, ChevronUp, Lock, ThumbsUp } from 'lucide-react'
import type { LedgerRecord, ReviewRating } from '@/features/ledger/record/types'
import { useReviewSettings } from '@/features/ledger/record/reviewSettings'
import { CATEGORIES } from '@/constants/categories'

interface Props {
  records: LedgerRecord[]                                       // 이번달 필터된 내역
  onComplete: (updates: Record<string, ReviewRating>) => void   // 점검 완료 시 일괄 반영
  onClose: () => void
}

const RATINGS: { value: Exclude<ReviewRating, null>; label: string }[] = [
  { value: 'good', label: '😊' },
  { value: 'soso', label: '😐' },
  { value: 'bad',  label: '😞' },
]

function fmt(n: number) {
  return `₩${n.toLocaleString()}`
}
function fmtShort(n: number) {
  if (n >= 10_000) return `₩${(n / 10_000).toFixed(n % 10_000 === 0 ? 0 : 1)}만`
  return `₩${n.toLocaleString()}`
}

/* 😊😐😞 선택 버튼 그룹 */
function RatingButtons({ value, onPick }: { value: ReviewRating; onPick: (v: ReviewRating) => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {RATINGS.map(r => (
        <button
          key={r.value}
          onClick={() => onPick(value === r.value ? null : r.value)}
          className={`text-sm w-6 h-6 flex items-center justify-center border transition-all ${
            value === r.value
              ? 'border-gray-800 bg-gray-50 opacity-100'
              : 'border-gray-200 opacity-30 hover:opacity-70'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}

export default function ReviewModal({ records, onComplete, onClose }: Props) {
  const { settings, update } = useReviewSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [openAuto, setOpenAuto] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'todo' | 'done' | 'all'>('todo') // ①② 표시 필터
  const bodyRef = useRef<HTMLDivElement>(null)

  // 설정 패널을 열고 본문을 맨 위로 스크롤해 패널이 보이게 함
  function openSettings() {
    setSettingsOpen(true)
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 점검 결과는 모달 내부 draft에만 쌓고, 점검 완료 시 한 번에 반영한다.
  // 분류(아래 useMemo)는 원본 records 기준이라 리뷰를 눌러도 항목이 이동하지 않는다.
  const [draft, setDraft] = useState<Record<string, ReviewRating>>({})
  const reviewOf = (r: LedgerRecord): ReviewRating => (r.id in draft ? draft[r.id] : r.review)

  function setOne(id: string, v: ReviewRating) {
    setDraft(prev => ({ ...prev, [id]: v }))
  }
  function setMany(ids: string[], v: ReviewRating) {
    setDraft(prev => {
      const next = { ...prev }
      for (const id of ids) next[id] = v
      return next
    })
  }

  const { needBig, needAlways, smallByCat, fixedItems, excludedItems, reviewTargets } = useMemo(() => {
    const expenses = records.filter(r => r.type === '지출' && r.amount > 0)
    const small = settings.smallAmount
    const always = new Set(settings.alwaysReview)
    const exclude = new Set(settings.exclude)

    const needBig: LedgerRecord[] = []      // 점검필요 — 큰 지출 (미점검)
    const needAlways: LedgerRecord[] = []   // 점검필요 — 항상점검 소액 (미점검)
    const smallMap = new Map<string, LedgerRecord[]>() // 소액 지출 (카테고리별, 미점검)
    const fixedItems: LedgerRecord[] = []   // 고정 지출 (③)
    const excludedItems: LedgerRecord[] = []// 사용자가 점검 제외로 지정한 카테고리 (③)
    const reviewTargets: LedgerRecord[] = []// 진행도 분모 — 고정·제외 뺀 점검 대상 전체(이미 점검한 것 포함)

    for (const r of expenses) {
      if (r.isFixed) { fixedItems.push(r); continue }
      if (exclude.has(r.category)) { excludedItems.push(r); continue }

      // ①②에는 점검 대상 전체를 담는다(원본 review 기준 분류 → 누른 항목이 이동하지 않음).
      // 표시 시점에 filter(todo/done/all)로 걸러낸다.
      reviewTargets.push(r)

      const isAlways = always.has(r.category)
      if (r.amount >= small) {
        needBig.push(r)
      } else if (isAlways) {
        needAlways.push(r)
      } else {
        const k = r.category || '기타'
        if (!smallMap.has(k)) smallMap.set(k, [])
        smallMap.get(k)!.push(r)
      }
    }

    needBig.sort((a, b) => b.amount - a.amount)
    needAlways.sort((a, b) => b.amount - a.amount)

    const smallByCat = Array.from(smallMap.entries())
      .map(([cat, rows]) => ({ cat, rows, total: rows.reduce((s, r) => s + r.amount, 0) }))
      .sort((a, b) => b.total - a.total)

    return { needBig, needAlways, smallByCat, fixedItems, excludedItems, reviewTargets }
  }, [records, settings])

  // 진행도 — 점검 대상 전체(고정·제외 제외) 중 review가 채워진 건수 (draft 우선)
  const reviewed = reviewTargets.filter(r => reviewOf(r) !== null).length
  const total = reviewTargets.length
  const remaining = total - reviewed

  // ①② 표시 필터 — 원본 review 기준이라 리뷰를 눌러도 항목이 사라지지 않음
  function visible<T extends LedgerRecord>(rows: T[]): T[] {
    if (filter === 'todo') return rows.filter(r => r.review === null)
    if (filter === 'done') return rows.filter(r => r.review !== null)
    return rows
  }
  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'todo', label: `미점검 ${remaining}` },
    { key: 'done', label: `점검완료 ${reviewed}` },
    { key: 'all',  label: `전체 ${total}` },
  ]
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0

  function toggleCat(cat: string) {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }
  function toggleAuto(key: string) {
    setOpenAuto(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handleComplete() {
    // 실제로 바뀐 것만 추려서 반영
    const updates: Record<string, ReviewRating> = {}
    for (const [id, v] of Object.entries(draft)) {
      const orig = records.find(r => r.id === id)
      if (orig && orig.review !== v) updates[id] = v
    }
    onComplete(updates)
  }

  /* 한 줄 거래 행 */
  function Row({ r }: { r: LedgerRecord }) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-gray-100 last:border-b-0">
        <span className="text-[11px] text-gray-800 truncate flex-1 min-w-0">{r.description || '(내용 없음)'}</span>
        <span className="text-[10px] text-gray-400 w-16 shrink-0 truncate">{r.category}</span>
        <span className="text-[11px] font-semibold text-gray-900 tabular-nums w-20 text-right shrink-0">{r.amount.toLocaleString()}</span>
        <RatingButtons value={reviewOf(r)} onPick={v => setOne(r.id, v)} />
      </div>
    )
  }

  /* 섹션 박스 — 타이틀 우측 화살표로 접기/펼치기 (펼침 ˄ · 접힘 ∨) */
  function Box({ boxKey, title, sub, children }: { boxKey: string; title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode }) {
    const collapsed = openCats.has(`box:${boxKey}`)
    return (
      <div className="border border-gray-300">
        <button
          onClick={() => toggleCat(`box:${boxKey}`)}
          className="flex items-center justify-between w-full px-3 py-1.5 border-b border-gray-200 bg-gray-50 text-left"
        >
          <span className="text-[10px] font-bold text-gray-600">{title}</span>
          <div className="flex items-center gap-2 shrink-0">
            {sub}
            {collapsed ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronUp size={13} className="text-gray-400" />}
          </div>
        </button>
        {!collapsed && children}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white w-[600px] max-h-[88vh] border border-gray-300 shadow-xl flex flex-col">

        {/* 상단 고정 — 진행도 바 */}
        <div className="px-5 py-3 border-b border-gray-300 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-600">이번달 점검</p>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* 좌: 안 한 것 / 한 것 / 전체 필터 */}
            <div className="flex border border-gray-300 overflow-hidden shrink-0">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-[10px] font-semibold px-2.5 py-1 transition-colors ${
                    filter === f.key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {/* 우: 진행도 바 + 설정 */}
            <div className="flex-1 h-1.5 bg-gray-100">
              <div className="h-full bg-gray-800 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-gray-700 tabular-nums shrink-0">{pct}%</span>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 border border-gray-300 px-2 py-1 hover:bg-gray-50 shrink-0"
            >
              <Settings size={11} /> 설정
            </button>
          </div>

          {/* 설정 패널 */}
          {settingsOpen && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-gray-500 w-16 shrink-0">소액 기준</label>
                <div className="flex items-center border border-gray-300">
                  <span className="px-2 text-[10px] text-gray-400 bg-gray-50 border-r border-gray-200 py-1">₩</span>
                  <input
                    type="number"
                    value={settings.smallAmount}
                    onChange={e => update({ smallAmount: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-24 px-2 py-1 text-[11px] text-gray-800 outline-none tabular-nums"
                  />
                </div>
                <span className="text-[10px] text-gray-400">미만은 소액으로 묶음</span>
              </div>
              <div className="flex items-start gap-2">
                <label className="text-[10px] text-gray-500 w-16 shrink-0 pt-1">항상 점검</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter(c => c !== '수입').map(c => {
                    const on = settings.alwaysReview.includes(c)
                    return (
                      <button
                        key={c}
                        onClick={() => update({
                          alwaysReview: on
                            ? settings.alwaysReview.filter(x => x !== c)
                            : [...settings.alwaysReview, c],
                          // 항상점검으로 켜면 제외에서는 빼준다 (상충 방지)
                          exclude: on ? settings.exclude : settings.exclude.filter(x => x !== c),
                        })}
                        className={`text-[10px] px-2 py-1 border transition-colors ${
                          on ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <label className="text-[10px] text-gray-500 w-16 shrink-0 pt-1">점검 제외</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter(c => c !== '수입').map(c => {
                    const on = settings.exclude.includes(c)
                    return (
                      <button
                        key={c}
                        onClick={() => update({
                          exclude: on
                            ? settings.exclude.filter(x => x !== c)
                            : [...settings.exclude, c],
                          // 제외로 켜면 항상점검에서는 빼준다 (상충 방지)
                          alwaysReview: on ? settings.alwaysReview : settings.alwaysReview.filter(x => x !== c),
                        })}
                        className={`text-[10px] px-2 py-1 border transition-colors ${
                          on ? 'border-gray-400 bg-gray-200 text-gray-600 line-through' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 본문 스크롤 */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-gray-50">

          {/* ① 점검 필요 */}
          <section>
            {(() => {
              const big = visible(needBig)
              const always = visible(needAlways)
              return <>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-gray-800">
                    ① 점검 필요 <span className="text-gray-400 font-medium">({big.length + always.length}건)</span>
                  </h3>
                  <span className="text-[10px] text-gray-400">{fmt(settings.smallAmount)} 이상</span>
                </div>

                <div className="space-y-2">
                  <Box boxKey="big" title={`큰 지출 (${big.length}건)`}>
                    {big.length === 0
                      ? <p className="px-3 py-3 text-[11px] text-gray-300">없음</p>
                      : big.map(r => <Row key={r.id} r={r} />)}
                  </Box>

                  {always.length > 0 && (
                    <Box boxKey="always" title={<span>🏷 항상 점검 (소액 · {always.length}건)</span>}>
                      <p className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100">
                        {settings.alwaysReview.join('·')}은(는) 금액과 무관하게 점검해요.
                      </p>
                      {always.map(r => <Row key={r.id} r={r} />)}
                    </Box>
                  )}
                </div>
              </>
            })()}
          </section>

          {/* ② 소액 지출 */}
          <section>
            {(() => {
              // 필터된 행 기준으로 그룹 재구성, 빈 그룹은 숨김
              const groups = smallByCat
                .map(g => { const rows = visible(g.rows); return { ...g, rows, total: rows.reduce((s, r) => s + r.amount, 0) } })
                .filter(g => g.rows.length > 0)
              const cnt = groups.reduce((s, g) => s + g.rows.length, 0)
              const tot = groups.reduce((s, g) => s + g.total, 0)
              const allIds = groups.flatMap(g => g.rows.map(r => r.id))
              return <>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-gray-800">
                    ② 소액 지출 <span className="text-gray-400 font-medium">({cnt}건 · {fmtShort(tot)})</span>
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400">{fmt(settings.smallAmount)} 미만</span>
                    {allIds.length > 0 && (
                      <button
                        onClick={() => setMany(allIds, 'good')}
                        className="text-[10px] font-semibold text-gray-600 border border-gray-300 px-2 py-1 hover:bg-gray-100"
                      >
                        전부 😊 처리
                      </button>
                    )}
                  </div>
                </div>
                <div className="border border-gray-300">
                  {groups.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-gray-300">없음</p>
                  ) : groups.map(g => {
                    const open = openCats.has(g.cat)
                    const ids = g.rows.map(r => r.id)
                    // 카테고리 전체가 같은 값이면 그 값을, 섞여 있으면 null을 표시
                    const first = reviewOf(g.rows[0])
                    const groupValue = g.rows.every(r => reviewOf(r) === first) ? first : null
                    return (
                      <div key={g.cat} className="border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <button onClick={() => toggleCat(g.cat)} className="flex items-center gap-1 flex-1 min-w-0 text-left">
                            {open ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                            <span className="text-[11px] text-gray-800 truncate">{g.cat}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{g.rows.length}건 · {fmtShort(g.total)}</span>
                          </button>
                          <RatingButtons value={groupValue} onPick={v => setMany(ids, v)} />
                        </div>
                        {open && (
                          <div className="bg-gray-50 border-t border-gray-100">
                            {g.rows.map(r => <Row key={r.id} r={r} />)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            })()}
          </section>

          {/* ③ 자동 만족 처리 */}
          <section>
            {(() => {
              const fixedTot = fixedItems.reduce((s, r) => s + r.amount, 0)
              const exclTot = excludedItems.reduce((s, r) => s + r.amount, 0)
              const autoGroups = [
                { key: 'fixed',   icon: <Lock size={11} />, label: '고정 지출', rows: fixedItems, total: fixedTot },
                { key: 'exclude', icon: <ThumbsUp size={11} />, label: '기타 제외 항목', rows: excludedItems, total: exclTot },
              ].filter(g => g.rows.length > 0)
              return <>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-gray-800">
                    ③ 자동 만족 처리 <span className="text-gray-400 font-medium">({fixedItems.length + excludedItems.length}건 · {fmtShort(fixedTot + exclTot)})</span>
                  </h3>
                  <button
                    onClick={openSettings}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 border border-gray-300 px-2 py-1 hover:bg-gray-100"
                  >
                    <Settings size={11} /> 제외 규칙 수정
                  </button>
                </div>
                <div className="border border-gray-300">
                  <p className="px-3 py-1.5 text-[10px] text-gray-400 border-b border-gray-100">
                    점검에서 제외된 항목이에요. 되돌릴 게 있으면 펼쳐서 수정하세요.
                  </p>
                  {autoGroups.length === 0 ? (
                    <p className="px-3 py-3 text-[11px] text-gray-300">없음</p>
                  ) : autoGroups.map(g => {
                    const open = openAuto.has(g.key)
                    return (
                      <div key={g.key} className="border-b border-gray-100 last:border-b-0">
                        <button onClick={() => toggleAuto(g.key)} className="flex items-center gap-2 w-full px-3 py-1.5 text-left">
                          <span className="text-gray-400 shrink-0">{g.icon}</span>
                          <span className="text-[11px] text-gray-700 flex-1">{g.label}</span>
                          <span className="text-[10px] text-gray-400 tabular-nums shrink-0">{g.rows.length}건 · {fmtShort(g.total)}</span>
                          {open ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                        </button>
                        {open && (
                          <div className="bg-gray-50 border-t border-gray-100">
                            {g.rows.map(r => <Row key={r.id} r={r} />)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            })()}
          </section>

        </div>

        {/* 하단 고정 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-300 shrink-0">
          <span className="text-[11px] text-gray-500">
            {remaining > 0 ? `아직 ${remaining}건 남았어요` : '모두 점검했어요 🎉'}
          </span>
          <button
            onClick={handleComplete}
            className="text-xs font-bold px-4 py-2 bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            점검 완료
          </button>
        </div>
      </div>
    </div>
  )
}

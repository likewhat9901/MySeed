// 점검 규칙 모달 — 점검 모달 ①②③ 순서에 맞춰 규칙 통합 설정
'use client'

import { X } from 'lucide-react'
import { useReviewSettings } from '@/features/ledger/record/reviewSettings'
import { CATEGORIES } from '@/constants/categories'

interface Props {
  onClose: () => void
}

const CATS = CATEGORIES.filter(c => c !== '수입')

export default function RulesModal({ onClose }: Props) {
  const { settings, update } = useReviewSettings()

  type ListField = 'alwaysReview' | 'exclude' | 'fixedCategories' | 'smallDefaults'

  const ALL_FIELDS = ['alwaysReview', 'exclude', 'fixedCategories', 'smallDefaults'] as const

  const FIELD_STYLE: Record<ListField, {
    active: string
    label: string
    dimBg: string     // inline style — 카드 테두리 색과 동일 계열
    dimBorder: string
    dimText: string
    dimLine?: boolean
  }> = {
    alwaysReview:    { active: 'border-gray-800 bg-gray-800 text-white font-bold',               label: '항상 리뷰', dimBg: '#f3f4f6', dimBorder: '#1f2937', dimText: '#9ca3af' },
    smallDefaults:   { active: 'border-green-500 bg-green-500 text-gray-700 font-bold',          label: '자동 만족', dimBg: '#f3f4f6', dimBorder: '#22c55e', dimText: '#9ca3af' },
    fixedCategories: { active: 'border-blue-600 bg-blue-600 text-white font-bold',               label: '고정 지출', dimBg: '#f3f4f6', dimBorder: '#3b82f6', dimText: '#9ca3af' },
    exclude:         { active: 'border-orange-400 bg-orange-400 text-gray-700 font-bold',        label: '리뷰 제외', dimBg: '#f3f4f6', dimBorder: '#f97316', dimText: '#9ca3af', dimLine: true },
  }

  function toggle(field: ListField, cat: string) {
    const current = settings[field]
    const next = current.includes(cat) ? current.filter(x => x !== cat) : [...current, cat]
    const patch: Partial<typeof settings> = { [field]: next }
    // 상충 방지: 4개 그룹 모두 중복 불가 — 켤 때 다른 그룹에서 제거
    if (!current.includes(cat)) {
      const others = ALL_FIELDS.filter(f => f !== field)
      for (const other of others) patch[other] = settings[other].filter(x => x !== cat)
    }
    update(patch)
  }

  // 다른 그룹에 속한 경우 해당 그룹 정보 반환
  function getConflict(field: ListField, cat: string): ListField | null {
    for (const other of ALL_FIELDS.filter(f => f !== field)) {
      if (settings[other].includes(cat)) return other
    }
    return null
  }

  function CatToggle({ field, cat }: { field: ListField; cat: string }) {
    const on = settings[field].includes(cat)
    const conflict = !on ? getConflict(field, cat) : null
    const cs = FIELD_STYLE[field]
    const cd = conflict ? FIELD_STYLE[conflict] : null

    if (on) {
      return (
        <button
          onClick={() => toggle(field, cat)}
          className={`text-[10px] px-2 py-1 border transition-colors ${cs.active}`}
        >
          {cat}
        </button>
      )
    }
    if (cd) {
      return (
        <button
          disabled
          title={`'${cd.label}'에 설정됨`}
          className="text-[10px] px-2 py-1 border cursor-not-allowed"
          style={{ background: cd.dimBg, borderColor: cd.dimBorder, color: cd.dimText, textDecoration: cd.dimLine ? 'line-through' : undefined }}
        >
          {cat}
        </button>
      )
    }
    return (
      <button
        onClick={() => toggle(field, cat)}
        className="text-[10px] px-2 py-1 border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
      >
        {cat}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white w-[480px] border border-gray-300 shadow-xl flex flex-col">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-600">점검 규칙</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={15} /></button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">

          {/* ① 리뷰 필요 */}
          <div>
            <p className="text-[10px] font-bold text-gray-700 mb-2">① 리뷰 필요</p>
            {/* 항상 리뷰 — 검정 테두리 */}
            <div className="border border-gray-800 px-4 py-3">
              <p className="text-[10px] text-gray-500 font-semibold mb-1">항상 리뷰</p>
              <p className="text-[10px] text-gray-400 mb-2">소액이어도 ①로 올릴 카테고리</p>
              <div className="flex flex-wrap gap-1.5">
                {CATS.map(c => <CatToggle key={c} field="alwaysReview" cat={c} />)}
              </div>
            </div>
          </div>

          {/* ② 소액 지출 */}
          <div>
            <p className="text-[10px] font-bold text-gray-700 mb-2">② 소액 지출</p>
            <div className="space-y-2">
              {/* 소액 기준 — 색 없음 (카테고리 규칙 아님) */}
              <div className="border border-gray-300 px-4 py-3">
                <p className="text-[10px] text-gray-500 font-semibold mb-2">소액 기준</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-300">
                    <span className="px-2.5 text-[10px] text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5">₩</span>
                    <input
                      type="number"
                      value={settings.smallAmount}
                      onChange={e => update({ smallAmount: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-28 px-2.5 py-1.5 text-[11px] text-gray-800 outline-none tabular-nums"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">미만은 ②로 묶음</span>
                </div>
              </div>
              {/* 자동 만족 — 초록 테두리 */}
              <div className="border border-green-500 px-4 py-3">
                <p className="text-[10px] text-gray-500 font-semibold mb-1">자동 만족</p>
                <p className="text-[10px] text-gray-400 mb-2">소액 중 만족으로 자동 처리할 카테고리</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATS.map(c => <CatToggle key={c} field="smallDefaults" cat={c} />)}
                </div>
              </div>
            </div>
          </div>

          {/* ③ 리뷰 제외 */}
          <div>
            <p className="text-[10px] font-bold text-gray-700 mb-2">③ 리뷰 제외</p>
            <div className="space-y-2">
              {/* 고정 지출 — 파랑 테두리 */}
              <div className="border border-blue-500 px-4 py-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">🔒</span>
                  <p className="text-[10px] text-gray-500 font-semibold">고정 지출</p>
                </div>
                <p className="text-[10px] text-gray-400">매달 반복되는 고정비 — ③ 고정 지출로 자동 분류</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATS.map(c => <CatToggle key={c} field="fixedCategories" cat={c} />)}
                </div>
              </div>
              {/* 리뷰 제외 — 주황 테두리 */}
              <div className="border border-orange-400 px-4 py-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">⊘</span>
                  <p className="text-[10px] text-gray-500 font-semibold">리뷰 제외</p>
                </div>
                <p className="text-[10px] text-gray-400">리뷰하지 않기로 한 카테고리 — ③ 리뷰 제외로 자동 분류</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATS.map(c => <CatToggle key={c} field="exclude" cat={c} />)}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 하단 */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-300">
          <button
            onClick={onClose}
            className="text-xs font-bold px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

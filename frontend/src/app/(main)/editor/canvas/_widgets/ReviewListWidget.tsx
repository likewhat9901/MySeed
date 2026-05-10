'use client'

// ─── _widgets/ReviewListWidget.tsx ───────────────────────────────────────────
// 지출 돌아보기 위젯. 항목별 잘함/애매/아쉬움 평가 + 합계 요약.

import { Trash2 } from 'lucide-react'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { ReviewListBinding, ReviewItem, ReviewRating } from '@/features/editor/types'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { widgetMessages } from '@/lib/i18n/widgetMessages'

const RATING_CYCLE: ReviewRating[] = ['good', 'meh', 'bad', null]

const RATING_STYLE: Record<NonNullable<ReviewRating>, { bg: string; text: string; label: string }> = {
  good: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'reviewGood' },
  meh:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'reviewMeh'  },
  bad:  { bg: 'bg-red-100',    text: 'text-red-600',    label: 'reviewBad'  },
}

export default function ReviewListWidget({ binding, onBindingChange, onBeforeChange, isEditMode }: WidgetComponentProps) {
  const { locale } = useLocale()
  const t = widgetMessages[locale]

  const data = binding as ReviewListBinding | null
  const items: ReviewItem[] = data?.items ?? []

  function update(next: ReviewItem[]) {
    onBindingChange({ items: next } as ReviewListBinding)
  }

  function addItem() {
    onBeforeChange()
    update([...items, { id: crypto.randomUUID(), label: '', amount: 0, rating: null }])
  }

  function deleteItem(id: string) {
    onBeforeChange()
    update(items.filter(item => item.id !== id))
  }

  function updateLabel(id: string, label: string) {
    update(items.map(item => item.id === id ? { ...item, label } : item))
  }

  function updateAmount(id: string, raw: string) {
    const amount = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0
    update(items.map(item => item.id === id ? { ...item, amount } : item))
  }

  function cycleRating(id: string, current: ReviewRating) {
    const idx = RATING_CYCLE.indexOf(current)
    const next = RATING_CYCLE[(idx + 1) % RATING_CYCLE.length]
    if (!isEditMode) onBeforeChange()
    update(items.map(item => item.id === id ? { ...item, rating: next } : item))
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const goodCount = items.filter(i => i.rating === 'good').length
  const mehCount  = items.filter(i => i.rating === 'meh').length
  const badCount  = items.filter(i => i.rating === 'bad').length

  return (
    <div className="flex flex-col h-full p-3 gap-2">
      {/* 제목 */}
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.reviewListTitle}</h3>
        {isEditMode && (
          <button onClick={addItem} className="text-xs text-green-600 hover:text-green-700 font-medium">
            {t.reviewAddItem}
          </button>
        )}
      </div>

      {/* 항목 목록 */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {items.map(item => (
          <div key={item.id} className="group flex items-center gap-2 py-1 px-1 rounded-lg hover:bg-gray-50">
            {/* 항목명 */}
            {isEditMode ? (
              <input
                className="flex-1 min-w-0 text-xs text-gray-700 bg-amber-50 border-b border-amber-300 outline-none placeholder:text-gray-300"
                value={item.label}
                placeholder={t.reviewPlaceholderLabel}
                onChange={e => updateLabel(item.id, e.target.value)}
                onFocus={onBeforeChange}
              />
            ) : (
              <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{item.label || '—'}</span>
            )}

            {/* 금액 */}
            {isEditMode ? (
              <input
                className="w-20 text-xs text-right text-gray-600 bg-amber-50 border-b border-amber-300 outline-none placeholder:text-gray-300"
                value={item.amount === 0 ? '' : item.amount.toLocaleString()}
                placeholder={t.reviewPlaceholderAmount}
                onChange={e => updateAmount(item.id, e.target.value)}
                onFocus={onBeforeChange}
              />
            ) : (
              <span className="text-xs text-gray-500 tabular-nums shrink-0">
                {item.amount > 0 ? item.amount.toLocaleString() : '—'}
              </span>
            )}

            {/* 평가 뱃지 */}
            <button
              onClick={() => cycleRating(item.id, item.rating)}
              className="shrink-0"
            >
              {item.rating ? (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RATING_STYLE[item.rating].bg} ${RATING_STYLE[item.rating].text}`}>
                  {t[RATING_STYLE[item.rating].label as keyof typeof t]}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                  —
                </span>
              )}
            </button>

            {/* 삭제 버튼 */}
            <td className="border-0 bg-white shrink-0">
              {isEditMode && (
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </td>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-xs text-gray-300 text-center py-4">
            {isEditMode ? t.reviewAddItem : '—'}
          </p>
        )}
      </div>

      {/* 하단 요약 */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-1">
            {goodCount > 0 && <span className="text-[10px] font-medium text-green-600">{t.reviewGood} {goodCount}</span>}
            {mehCount  > 0 && <span className="text-[10px] font-medium text-yellow-600">{t.reviewMeh} {mehCount}</span>}
            {badCount  > 0 && <span className="text-[10px] font-medium text-red-500">{t.reviewBad} {badCount}</span>}
          </div>
          {total > 0 && (
            <span className="text-[10px] text-gray-400 shrink-0">
              {t.reviewTotal} {total.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

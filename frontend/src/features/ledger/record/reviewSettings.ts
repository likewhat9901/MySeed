// 점검 모달 설정(소액 기준·항상점검·제외 카테고리) localStorage 영속화 (v1)
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LedgerRecord } from './types'

const KEY = 'mm.reviewSettings.v1'

export interface ReviewSettings {
  smallAmount: number                          // 소액 기준 (이 금액 미만이면 ②소액 그룹)
  smallAmountDefault: number                   // 소액 기준 카드 "초기화" 시 되돌아갈 사용자 지정 기본값
  alwaysReview: string[]                       // 금액 무관 항상 점검할 카테고리 라벨
  exclude: string[]                            // 점검에서 제외할 카테고리 (③ 기타 제외 항목)
  fixedCategories: string[]                    // 고정 지출 카테고리 (③ 고정 지출로 자동 분류)
  smallDefaults: string[]                      // 소액 자동 만족 카테고리 목록
}

export const DEFAULT_SETTINGS: ReviewSettings = {
  smallAmount: 10_000,
  smallAmountDefault: 10_000,
  alwaysReview: [],
  exclude: [],
  fixedCategories: [],
  smallDefaults: [],
}

function load(): ReviewSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function useReviewSettings() {
  const [settings, setSettings] = useState<ReviewSettings>(DEFAULT_SETTINGS)

  useEffect(() => { setSettings(load()) }, [])

  const update = useCallback((patch: Partial<ReviewSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { window.localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return { settings, update }
}

/**
 * 점검 진행도 — 고정·제외 카테고리를 뺀 점검 대상 중 review가 채워진 비율.
 * ReviewModal의 reviewTargets 판정과 동일 기준.
 */
export function reviewProgress(records: LedgerRecord[], settings: ReviewSettings) {
  const fixed = new Set(settings.fixedCategories)
  const exclude = new Set(settings.exclude)
  let total = 0, reviewed = 0
  for (const r of records) {
    if (r.type !== '지출' || r.amount <= 0) continue
    if (r.isFixed || fixed.has(r.category)) continue   // 고정 지출 제외
    if (exclude.has(r.category)) continue               // 점검 제외 카테고리
    total++
    if (r.review !== null) reviewed++
  }
  return { total, reviewed, remaining: total - reviewed }
}

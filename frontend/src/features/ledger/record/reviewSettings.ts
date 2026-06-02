// 점검 모달 설정(소액 기준·항상점검·제외 카테고리) localStorage 영속화 (v1)
'use client'

import { useCallback, useEffect, useState } from 'react'

const KEY = 'mm.reviewSettings.v1'

export interface ReviewSettings {
  smallAmount: number       // 소액 기준 (이 금액 미만이면 ②소액 그룹)
  alwaysReview: string[]    // 금액 무관 항상 점검할 카테고리 라벨
  exclude: string[]         // 점검에서 제외할 카테고리 (③ 기타 제외 항목)
}

const DEFAULT_SETTINGS: ReviewSettings = {
  smallAmount: 10_000,
  alwaysReview: ['카페·간식'],
  exclude: [],
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

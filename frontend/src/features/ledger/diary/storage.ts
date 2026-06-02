// 일기 엔트리 localStorage 영속화 (v1)
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DiaryEntry, DiaryMood } from './types'

const KEY = 'mm.diaryEntries.v1'

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(window.localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}

function persist<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function useDiaryEntries() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])

  useEffect(() => { setEntries(load<DiaryEntry>(KEY)) }, [])

  const upsert = useCallback((date: string, ledId: string | null, mood: DiaryMood, text: string) => {
    setEntries(prev => {
      const existing = prev.find(e => e.date === date && e.ledId === ledId)
      const now = new Date().toISOString()
      const next = existing
        ? prev.map(e => e.id === existing.id ? { ...e, mood, text, updatedAt: now } : e)
        : [...prev, { id: newId(), ledId, date, mood, text, createdAt: now, updatedAt: now }]
      persist(KEY, next)
      return next
    })
  }, [])

  const remove = useCallback((id: string) => {
    setEntries(prev => {
      const next = prev.filter(e => e.id !== id)
      persist(KEY, next)
      return next
    })
  }, [])

  return { entries, upsert, remove }
}

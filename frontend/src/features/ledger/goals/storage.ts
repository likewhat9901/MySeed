// localStorage 기반 줄이기/모으기 목표 영속화 (v1)
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ReductionGoal, SavingsGoal, SavingsDeposit, Resolution, Retrospective } from './types'

const REDUCTION_KEY = 'mm.reductionGoals.v1'
const SAVINGS_GOAL_KEY = 'mm.savingsGoals.v1'
const SAVINGS_DEPOSIT_KEY = 'mm.savingsDeposits.v1'
const RESOLUTION_KEY = 'mm.resolutions.v1'
const RETROSPECTIVE_KEY = 'mm.retrospectives.v1'

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function save<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function newId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function useReductionGoals() {
  const [goals, setGoals] = useState<ReductionGoal[]>([])

  useEffect(() => { setGoals(load<ReductionGoal>(REDUCTION_KEY)) }, [])

  const persist = useCallback((next: ReductionGoal[]) => {
    setGoals(next)
    save(REDUCTION_KEY, next)
  }, [])

  const add = useCallback((g: Omit<ReductionGoal, 'id' | 'createdAt'>) => {
    const item: ReductionGoal = { ...g, id: newId(), createdAt: new Date().toISOString() }
    persist([...goals, item])
  }, [goals, persist])

  const update = useCallback((id: string, patch: Partial<ReductionGoal>) => {
    persist(goals.map(g => g.id === id ? { ...g, ...patch } : g))
  }, [goals, persist])

  const remove = useCallback((id: string) => {
    persist(goals.filter(g => g.id !== id))
  }, [goals, persist])

  return { goals, add, update, remove }
}

export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [deposits, setDeposits] = useState<SavingsDeposit[]>([])

  useEffect(() => {
    setGoals(load<SavingsGoal>(SAVINGS_GOAL_KEY))
    setDeposits(load<SavingsDeposit>(SAVINGS_DEPOSIT_KEY))
  }, [])

  const persistGoals = useCallback((next: SavingsGoal[]) => {
    setGoals(next); save(SAVINGS_GOAL_KEY, next)
  }, [])
  const persistDeposits = useCallback((next: SavingsDeposit[]) => {
    setDeposits(next); save(SAVINGS_DEPOSIT_KEY, next)
  }, [])

  const addGoal = useCallback((g: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const item: SavingsGoal = { ...g, id: newId(), createdAt: new Date().toISOString() }
    persistGoals([...goals, item])
  }, [goals, persistGoals])

  const removeGoal = useCallback((id: string) => {
    persistGoals(goals.filter(g => g.id !== id))
    persistDeposits(deposits.filter(d => d.goalId !== id))
  }, [goals, deposits, persistGoals, persistDeposits])

  const setDeposit = useCallback((goalId: string, targetMonth: string, amount: number) => {
    const existing = deposits.find(d => d.goalId === goalId && d.targetMonth === targetMonth)
    if (existing) {
      persistDeposits(deposits.map(d => d.id === existing.id ? { ...d, amount } : d))
    } else {
      const item: SavingsDeposit = {
        id: newId(), goalId, targetMonth, amount, createdAt: new Date().toISOString(),
      }
      persistDeposits([...deposits, item])
    }
  }, [deposits, persistDeposits])

  return { goals, deposits, addGoal, removeGoal, setDeposit }
}

export function useResolutions() {
  const [items, setItems] = useState<Resolution[]>([])

  useEffect(() => { setItems(load<Resolution>(RESOLUTION_KEY)) }, [])

  const persist = useCallback((next: Resolution[]) => {
    setItems(next)
    save(RESOLUTION_KEY, next)
  }, [])

  const add = useCallback((r: Pick<Resolution, 'ledId' | 'targetMonth' | 'text'> & Partial<Pick<Resolution, 'emoji' | 'category' | 'baselineAmount'>>) => {
    const item: Resolution = {
      ...r, id: newId(), status: 'none', brokenCount: 0, createdAt: new Date().toISOString(),
    }
    persist([...load<Resolution>(RESOLUTION_KEY), item])
  }, [persist])

  const update = useCallback((id: string, patch: Partial<Resolution>) => {
    persist(items.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [items, persist])

  const remove = useCallback((id: string) => {
    persist(items.filter(r => r.id !== id))
  }, [items, persist])

  return { items, add, update, remove }
}

export function useRetrospectives() {
  const [items, setItems] = useState<Retrospective[]>([])

  useEffect(() => { setItems(load<Retrospective>(RETROSPECTIVE_KEY)) }, [])

  const persist = useCallback((next: Retrospective[]) => {
    setItems(next)
    save(RETROSPECTIVE_KEY, next)
  }, [])

  // 월별 1개 — 있으면 갱신, 없으면 생성
  const upsert = useCallback((ledId: string | null, month: string, patch: Partial<Pick<Retrospective, 'good' | 'bad' | 'next' | 'mood' | 'note'>>) => {
    const existing = items.find(r => r.month === month && (r.ledId === ledId || r.ledId === null))
    if (existing) {
      persist(items.map(r => r.id === existing.id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r))
    } else {
      const item: Retrospective = {
        id: newId(), ledId, month, good: '', bad: '', next: '', ...patch, updatedAt: new Date().toISOString(),
      }
      persist([...items, item])
    }
  }, [items, persist])

  return { items, upsert }
}

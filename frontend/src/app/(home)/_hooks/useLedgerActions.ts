'use client'

// ─── (home)/_hooks/useLedgerActions.ts ────────────────────────────────────────
// 홈 화면(LoggedInView)의 장부 목록 상태와 CRUD 핸들러를 담당하는 훅.
//
// 반환값:
//   - ledgers: 장부 목록, loading: 로드 중 여부
//   - creating: 새 이름 입력 중 여부, newName / setNewName: 입력 값
//   - newNameInputRef: 입력 input에 대한 ref (자동 포커스용)
//   - startCreating / cancelCreating: 입력 모드 열기/닫기
//   - handleCreate: Enter 시 장부 생성 후 에디터로 이동
//   - handleRename / handleDelete / handleCoverChange: 장부 수정

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/useAuth'
import { getMyLedgers, createLedger, renameLedger, deleteLedger } from '@/features/ledger/api'
import type { LedgerSummary } from '@/features/ledger/api'

export function useLedgerActions() {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const newNameInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getMyLedgers(user.id)
      .then(data => { if (!cancelled) setLedgers(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (creating) newNameInputRef.current?.focus()
  }, [creating])

  const startCreating = () => {
    setNewName('')
    setCreating(true)
  }

  const cancelCreating = () => {
    setCreating(false)
    setNewName('')
  }

  const handleCreate = async () => {
    if (!user) return
    const name = newName.trim() || '내 가계부'
    setCreating(false)
    setNewName('')
    const ledId = await createLedger(user.id, name)
    if (ledId) router.push(`/editor?led=${ledId}`)
  }

  const handleRename = async (id: string, name: string) => {
    await renameLedger(id, name)
    setLedgers(prev => prev.map(l => l.led_id === id ? { ...l, led_name: name } : l))
  }

  const handleDelete = async (id: string) => {
    await deleteLedger(id)
    setLedgers(prev => prev.filter(l => l.led_id !== id))
  }

  const handleCoverChange = (id: string, url: string | null) => {
    setLedgers(prev => prev.map(l => l.led_id === id ? { ...l, cover_url: url } : l))
  }

  return {
    ledgers,
    loading,
    creating,
    newName, setNewName,
    newNameInputRef,
    startCreating,
    cancelCreating,
    handleCreate,
    handleRename,
    handleDelete,
    handleCoverChange,
  }
}

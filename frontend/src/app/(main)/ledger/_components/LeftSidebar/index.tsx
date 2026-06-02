// 왼쪽 사이드바 — 가계부 아코디언 목록 + 가계부별 record 목록
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, ChevronDown, ChevronRight, FileText, Trash2 } from 'lucide-react'
import { useLedgerContext } from '../../_context/LedgerContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useLedgerList } from '../../_hooks/useLedgerList'
import { getRecordList, deleteRecord, saveRecord } from '@/features/ledger/record/rpc'
import type { RecordSummary } from '@/features/ledger/record/rpc'
import { ChevronSideIcon } from './icons'

interface LeftSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function LeftSidebar({ isOpen, onToggle }: LeftSidebarProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentLedId = searchParams.get('led')

  const { canvasId, loadLedger, recordSavedAt } = useLedgerContext()

  const {
    ledgers, loadingLedgers,
    isCreating, newName, setNewName,
    startCreating, cancelCreating,
    handleCreate,
  } = useLedgerList({ userId: user?.id, canvasId })

  const [recordMap, setRecordMap] = useState<Record<string, RecordSummary[]>>({})
  const [openLedgers, setOpenLedgers] = useState<Set<string>>(new Set())
  const [creatingRecordFor, setCreatingRecordFor] = useState<string | null>(null)
  const [newRecordName, setNewRecordName] = useState('')

  const sortRows = (rows: RecordSummary[]) =>
    [...rows].sort((a, b) => a.regist_dt.localeCompare(b.regist_dt))

  // 현재 선택된 가계부는 자동으로 펼치고 record 목록도 로드
  useEffect(() => {
    if (!canvasId) return
    setOpenLedgers(prev => new Set([...prev, canvasId]))
    getRecordList(canvasId).then(rows =>
      setRecordMap(prev => ({ ...prev, [canvasId]: sortRows(rows) }))
    )
  }, [canvasId])

  // 내역 저장 시 해당 가계부 목록 갱신
  useEffect(() => {
    if (!canvasId || recordSavedAt === 0) return
    getRecordList(canvasId).then(rows =>
      setRecordMap(prev => ({ ...prev, [canvasId]: sortRows(rows) }))
    )
  }, [recordSavedAt, canvasId])

  // 가계부 펼칠 때 record 목록 로드
  async function toggleLedger(ledId: string) {
    setOpenLedgers(prev => {
      const next = new Set(prev)
      if (next.has(ledId)) { next.delete(ledId); return next }
      next.add(ledId)
      return next
    })
    if (recordMap[ledId] === undefined) {
      const rows = await getRecordList(ledId)
      setRecordMap(prev => ({ ...prev, [ledId]: sortRows(rows) }))
    }
  }

  // 가계부 클릭 → overview로 이동
  function handleLedgerClick(ledId: string) {
    loadLedger(ledId)
    router.push(`/ledger/overview?led=${ledId}`)
  }

  // record 클릭 → 가계부 로드 후 현재 탭 유지, rec 파라미터만 변경
  function handleRecordClick(ledId: string, recId: string) {
    if (ledId !== canvasId) loadLedger(ledId)
    const tab = pathname.includes('/records') ? 'records' : pathname.includes('/invest') ? 'invest' : 'overview'
    router.push(`/ledger/${tab}?led=${ledId}&rec=${recId}`)
  }

  // record 생성 — 이름 입력 후 저장, 내역 페이지로 이동
  async function handleCreateRecord(ledId: string) {
    const name = newRecordName.trim()
    if (!name) { setCreatingRecordFor(null); setNewRecordName(''); return }
    const recId = await saveRecord(null, ledId, null, name, [])
    if (recId) {
      setRecordMap(prev => ({
        ...prev,
        [ledId]: [...(prev[ledId] ?? []), { rec_id: recId, rec_name: name, regist_dt: '', update_dt: '' }],
      }))
      if (ledId !== canvasId) loadLedger(ledId)
      router.push(`/ledger/records?led=${ledId}&rec=${recId}`)
    }
    setCreatingRecordFor(null)
    setNewRecordName('')
  }

  // record 삭제
  async function handleDeleteRecord(ledId: string, recId: string) {
    if (!confirm('이 내역을 삭제하시겠습니까?')) return
    const ok = await deleteRecord(recId)
    if (ok) {
      setRecordMap(prev => ({
        ...prev,
        [ledId]: (prev[ledId] ?? []).filter(r => r.rec_id !== recId),
      }))
      if (recId === currentRecId) {
        router.push(`/ledger/records?led=${ledId}`)
      }
    }
  }

  const currentRecId = searchParams.get('rec')

  return (
    <aside
      className={`h-full bg-white border-r border-gray-300 flex flex-col shrink-0 select-none transition-all duration-200 overflow-hidden ${
        isOpen ? 'w-56' : 'w-10'
      }`}
    >
      {isOpen ? (
        <>
          {/* 헤더 */}
          <div className="flex items-center justify-between px-3 h-8 border-b border-gray-300 shrink-0">
            <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">내 가계부</span>
            <div className="flex items-center gap-1">
              <button
                onClick={startCreating}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                <Plus size={13} />
              </button>
              <button
                onClick={onToggle}
                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ChevronSideIcon rotated={false} />
              </button>
            </div>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto py-1">
            {isCreating && (
              <div className="px-2 py-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
                    if (e.key === 'Escape') cancelCreating()
                  }}
                  onBlur={cancelCreating}
                  placeholder="가계부 이름…"
                  className="w-full text-xs px-2 py-1 border border-gray-300 outline-none bg-white focus:border-gray-500"
                />
              </div>
            )}

            {loadingLedgers ? (
              <p className="px-3 py-2 text-xs text-gray-400">불러오는 중…</p>
            ) : ledgers.length === 0 && !isCreating ? (
              <p className="px-3 py-2 text-xs text-gray-400">가계부가 없어요.</p>
            ) : (
              ledgers.map(ledger => {
                const isExpanded = openLedgers.has(ledger.led_id)
                const isActive   = ledger.led_id === currentLedId
                const recs       = recordMap[ledger.led_id] ?? []

                return (
                  <div key={ledger.led_id}>
                    {/* 가계부 행 */}
                    <div
                      className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors border-l-2 ${
                        isActive
                          ? 'border-gray-800 bg-gray-50 text-gray-900'
                          : 'border-transparent text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => toggleLedger(ledger.led_id)}
                        className="shrink-0 text-gray-400"
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                      <span
                        className="flex-1 text-xs font-medium truncate"
                        onClick={() => handleLedgerClick(ledger.led_id)}
                      >
                        {ledger.led_name}
                      </span>
                    </div>

                    {/* record 목록 */}
                    {isExpanded && (
                      <div className="ml-5 border-l border-gray-200 mb-1">
                        {recs.length === 0 ? (
                          <p className="px-2 py-1 text-[11px] text-gray-300">내역 없음</p>
                        ) : (
                          recs.map(rec => {
                            const isRecActive = rec.rec_id === currentRecId
                            return (
                              <div
                                key={rec.rec_id}
                                className={`group flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-colors ${
                                  isRecActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                                }`}
                                onClick={() => handleRecordClick(ledger.led_id, rec.rec_id)}
                              >
                                <FileText size={11} className="shrink-0 opacity-50" />
                                <span className={`flex-1 text-[11px] truncate ${isRecActive ? 'font-semibold' : ''}`}>{rec.rec_name}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDeleteRecord(ledger.led_id, rec.rec_id) }}
                                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            )
                          })
                        )}
                        {/* 새 내역 추가 */}
                        {creatingRecordFor === ledger.led_id ? (
                          <div className="flex items-center gap-1 px-2 py-1">
                            <input
                              autoFocus
                              value={newRecordName}
                              onChange={e => setNewRecordName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); handleCreateRecord(ledger.led_id) }
                                if (e.key === 'Escape') { setCreatingRecordFor(null); setNewRecordName('') }
                              }}
                              onBlur={() => { setCreatingRecordFor(null); setNewRecordName('') }}
                              placeholder="내역 이름…"
                              className="flex-1 min-w-0 text-[11px] px-2 h-[22px] border border-gray-300 outline-none bg-white focus:border-gray-500"
                            />
                            <button
                              onMouseDown={e => { e.preventDefault(); handleCreateRecord(ledger.led_id) }}
                              className="shrink-0 px-1.5 h-[22px] text-[10px] font-bold bg-gray-800 text-white hover:bg-gray-600 transition-colors"
                            >
                              추가
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setCreatingRecordFor(ledger.led_id); setNewRecordName('') }}
                            className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors w-full hover:bg-gray-50"
                          >
                            <Plus size={10} />
                            새 내역 추가
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      ) : (
        /* 접힌 상태 */
        <div className="flex flex-col items-center pt-2.5">
          <button
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronSideIcon rotated={true} />
          </button>
        </div>
      )}
    </aside>
  )
}

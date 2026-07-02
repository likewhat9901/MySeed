'use client'

// ─── (home)/_views/LoggedInView.tsx ───────────────────────────────────────────
// 로그인 상태 홈 화면 — 탭 전환 (내 캔버스 / 저장된 템플릿) + 풀 레이아웃

import Link from 'next/link'
import { ArrowRight, LayoutGrid, List, Plus } from 'lucide-react'
import { useState, useEffect, useMemo, type RefObject } from 'react'
import LedgerCard from '../_components/LedgerCard'
import LedgerRow from '../_components/LedgerRow'
import LedgerSkeleton from '../_components/LedgerSkeleton'
import MappingTemplateCard from '../_components/MappingTemplateCard'
import MappingTemplateRow from '../_components/MappingTemplateRow'
import { useLedgerActions } from '../_hooks/useLedgerActions'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { homeMessages } from '@/lib/i18n/messages/homeMessages'
import { useAuth } from '@/features/auth/AuthContext'
import { getImportMappings, deleteImportMapping, type ImportMapping } from '@/features/ledger/record/rpc'
import { formatRelativeTime } from '../_utils/ledgerUtils'

type Section = 'ledgers' | 'mappings'

interface NewLedgerInputProps {
  mode: 'grid' | 'list'
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function NewLedgerInput({ mode, inputRef, value, onChange, onConfirm, onCancel }: NewLedgerInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
    if (e.key === 'Escape') onCancel()
  }

  if (mode === 'grid') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-800 p-4 min-h-[160px]">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onCancel}
          placeholder="가계부 이름…"
          className="w-full text-sm text-center border-b border-gray-800 outline-none bg-transparent text-gray-800 placeholder:text-gray-400 pb-1"
        />
        <p className="text-[11px] text-gray-400">Enter로 생성, Esc로 취소</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-800 px-4 py-3">
      <div className="w-10 h-10 shrink-0 border-2 border-gray-800 flex items-center justify-center text-gray-800">
        <Plus className="size-4" />
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="가계부 이름… (Enter로 생성)"
        className="flex-1 text-sm border-b border-gray-800 outline-none bg-transparent text-gray-800 placeholder:text-gray-400 pb-0.5"
      />
    </div>
  )
}

export default function LoggedInView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [activeSection, setActiveSection] = useState<Section>('ledgers')
  const { locale } = useLocale()
  const t = homeMessages[locale]
  const { user } = useAuth()
  const {
    ledgers, loading, creating,
    newName, setNewName, newNameInputRef,
    startCreating, cancelCreating,
    handleCreate, handleRename, handleDelete, handleCoverChange,
  } = useLedgerActions()

  // 가장 최근 생성된 가계부 — "이어하기" 배너용 (실제 최근 수정 추적 데이터는 없어 regist_dt로 대체)
  const latestLedger = useMemo(
    () => ledgers.length === 0 ? null : [...ledgers].sort((a, b) => b.regist_dt.localeCompare(a.regist_dt))[0],
    [ledgers],
  )

  const [mappings, setMappings] = useState<ImportMapping[]>([])
  const [loadingMappings, setLoadingMappings] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    getImportMappings(user.id)
      .then(setMappings)
      .finally(() => setLoadingMappings(false))
  }, [user?.id])

  async function handleDeleteMapping(mapId: string) {
    await deleteImportMapping(mapId)
    setMappings(prev => prev.filter(m => m.map_id !== mapId))
  }

  const inputProps: Omit<NewLedgerInputProps, 'mode'> = {
    inputRef: newNameInputRef,
    value: newName,
    onChange: setNewName,
    onConfirm: handleCreate,
    onCancel: cancelCreating,
  }

  return (
    <section className="flex-1 bg-gray-50">
      <div className="py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">

          {/* 이어하기 배너 — 가장 최근 가계부 */}
          {!loading && latestLedger && (
            <>
              <Link
                href={`/ledger?led=${latestLedger.led_id}`}
                className="block border border-gray-300 bg-white px-5 py-4 hover:border-gray-800 transition-colors"
              >
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-400 mb-1.5">계속 이어서 작업하기</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{latestLedger.led_name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{formatRelativeTime(latestLedger.regist_dt, locale)}</p>
                  </div>
                  <ArrowRight className="size-4 text-gray-400 shrink-0" />
                </div>
              </Link>

              {/* 지표 카드 — 가장 최근 가계부 기준 */}
              <div className="flex items-center gap-2 mt-6 mb-3">
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-400 shrink-0">
                  {latestLedger.led_name} 기준
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[10px] text-gray-400 mb-1">전체 가계부</p>
                  <p className="text-lg font-bold text-gray-800 tabular-nums">{ledgers.length}개</p>
                </div>
                <div className="border border-gray-200 bg-white px-4 py-3">
                  <p className="text-[10px] text-gray-400 mb-1">저장된 매핑</p>
                  <p className="text-lg font-bold text-gray-800 tabular-nums">{mappings.length}개</p>
                </div>
              </div>
            </>
          )}

          {/* 좌: 가계부/매핑 리스트 · 우: 카테고리 TOP3 + 최근 활동 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

            <div>
              {/* 섹션 라벨 + 가로선 + 뷰 토글 */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">
                  {activeSection === 'ledgers' ? `My Ledgers — ${t.tabMyCanvas}` : `Saved Mappings — ${t.tabSavedMappings}`}
                </span>
                <div className="flex-1 h-px bg-gray-300" />
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveSection('ledgers')}
                      className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        activeSection === 'ledgers' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t.tabMyCanvas}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('mappings')}
                      className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        activeSection === 'mappings' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t.tabSavedMappings}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`cursor-pointer p-1 ${viewMode === 'list' ? 'text-gray-800' : 'text-gray-300 hover:text-gray-500'}`}
                      aria-label="리스트 뷰"
                    >
                      <List className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`cursor-pointer p-1 ${viewMode === 'grid' ? 'text-gray-800' : 'text-gray-300 hover:text-gray-500'}`}
                      aria-label="그리드 뷰"
                    >
                      <LayoutGrid className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {activeSection === 'ledgers' ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {creating ? (
                      <NewLedgerInput mode="grid" {...inputProps} />
                    ) : (
                      <button
                        type="button"
                        onClick={startCreating}
                        className="flex flex-col items-center justify-center gap-3 bg-white border border-dashed border-gray-300 p-6 min-h-[160px] hover:border-gray-800 transition-colors cursor-pointer group"
                      >
                        <div className="w-12 h-12 border-2 border-gray-300 flex items-center justify-center group-hover:border-gray-800 group-hover:text-gray-800 text-gray-300 transition-colors">
                          <Plus className="size-5" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-800">{t.startNewLedger}</p>
                          {t.newLedgerSub && <p className="text-xs text-gray-400 mt-0.5">{t.newLedgerSub}</p>}
                        </div>
                      </button>
                    )}
                    {loading
                      ? Array.from({ length: 5 }).map((_, i) => <LedgerSkeleton key={i} mode="grid" />)
                      : ledgers.map((ledger, i) => (
                          <LedgerCard key={ledger.led_id} ledger={ledger} index={i}
                            onRename={handleRename} onDelete={handleDelete} onCoverChange={handleCoverChange} />
                        ))
                    }
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {creating ? (
                      <NewLedgerInput mode="list" {...inputProps} />
                    ) : (
                      <button
                        type="button"
                        onClick={startCreating}
                        className="flex items-center gap-4 bg-white border border-dashed border-gray-300 px-4 py-3 hover:border-gray-800 transition-colors cursor-pointer group"
                      >
                        <div className="w-10 h-10 shrink-0 border-2 border-gray-300 flex items-center justify-center group-hover:border-gray-800 group-hover:text-gray-800 text-gray-300 transition-colors">
                          <Plus className="size-4" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-800">{t.startNewLedger}</p>
                          {t.newLedgerSub && <p className="text-[11px] text-gray-400 mt-0.5">{t.newLedgerSub}</p>}
                        </div>
                      </button>
                    )}
                    {loading
                      ? Array.from({ length: 3 }).map((_, i) => <LedgerSkeleton key={i} mode="list" />)
                      : ledgers.map((ledger, i) => (
                          <LedgerRow key={ledger.led_id} ledger={ledger} index={i}
                            onRename={handleRename} onDelete={handleDelete} onCoverChange={handleCoverChange} />
                        ))
                    }
                  </div>
                )
              ) : (
                loadingMappings ? (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 5 }).map((_, i) => <LedgerSkeleton key={i} mode="grid" />)}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {Array.from({ length: 3 }).map((_, i) => <LedgerSkeleton key={i} mode="list" />)}
                    </div>
                  )
                ) : mappings.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4">{t.noMappings}</p>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {mappings.map((m, i) => (
                      <MappingTemplateCard key={m.map_id} mapping={m} index={i} onDelete={handleDeleteMapping} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {mappings.map((m, i) => (
                      <MappingTemplateRow key={m.map_id} mapping={m} index={i} onDelete={handleDeleteMapping} />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* 우측 패널 — 카테고리 TOP3 + 최근 활동 (가장 최근 가계부 기준, 데이터 연동 전 빈 상태) */}
            {!loading && latestLedger && (
              <div className="border border-gray-200 bg-white">
                <div className="px-4 py-2.5 border-b border-gray-200">
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">
                    카테고리 TOP3 ({latestLedger.led_name})
                  </p>
                </div>
                <div className="px-4 py-6">
                  <p className="text-[11px] text-gray-300 text-center">아직 분석할 내역이 없어요</p>
                </div>
                <div className="px-4 py-2.5 border-y border-gray-200">
                  <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-gray-500">
                    최근 활동 ({latestLedger.led_name})
                  </p>
                </div>
                <div className="px-4 py-6">
                  <p className="text-[11px] text-gray-300 text-center">최근 활동 내역이 없어요</p>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </section>
  )
}

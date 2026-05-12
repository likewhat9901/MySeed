'use client'

// ─── (home)/_views/LoggedInView.tsx ───────────────────────────────────────────
// 로그인 상태 홈 화면 — 탭 전환 (내 캔버스 / 저장된 템플릿) + 풀 레이아웃

import { LayoutGrid, List, Plus } from 'lucide-react'
import { useState, useEffect, type RefObject } from 'react'
import LedgerCard from '../_components/LedgerCard'
import LedgerRow from '../_components/LedgerRow'
import LedgerSkeleton from '../_components/LedgerSkeleton'
import MappingTemplateCard from '../_components/MappingTemplateCard'
import MappingTemplateRow from '../_components/MappingTemplateRow'
import { useLedgerActions } from '../_hooks/useLedgerActions'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { homeMessages } from '@/lib/i18n/messages/homeMessages'
import { useAuth } from '@/features/auth/AuthContext'
import { getImportMappings, deleteImportMapping, type ImportMapping } from '@/features/import/rpc'

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
      <div className="flex flex-col items-center justify-center gap-3 bg-white border border-brand rounded-2xl p-4 min-h-[160px]">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onCancel}
          placeholder="가계부 이름…"
          className="w-full text-sm text-center border-b border-brand outline-none bg-transparent text-gray-800 placeholder:text-gray-400 pb-1"
        />
        <p className="text-[11px] text-gray-400">Enter로 생성, Esc로 취소</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 bg-white border border-brand rounded-xl px-4 py-3">
      <div className="w-10 h-10 shrink-0 rounded-lg border-2 border-brand flex items-center justify-center text-brand">
        <Plus className="size-4" />
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="가계부 이름… (Enter로 생성)"
        className="flex-1 text-sm border-b border-brand outline-none bg-transparent text-gray-800 placeholder:text-gray-400 pb-0.5"
      />
    </div>
  )
}

type Tab = 'ledgers' | 'mappings'

export default function LoggedInView() {
  const [activeTab, setActiveTab] = useState<Tab>('ledgers')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { locale } = useLocale()
  const t = homeMessages[locale]
  const { user } = useAuth()
  const {
    ledgers, loading, creating,
    newName, setNewName, newNameInputRef,
    startCreating, cancelCreating,
    handleCreate, handleRename, handleDelete, handleCoverChange,
  } = useLedgerActions()

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
    <section className="flex-1 bg-gradient-to-b from-seed-bg via-white to-white py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* 타이틀 */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-darker">{t.gardenTitle}</h1>
          {t.gardenSub && <p className="mt-2 text-sm text-gray-500">{t.gardenSub}</p>}
        </div>

        {/* 탭 + 뷰 토글 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab('ledgers')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ledgers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.tabMyCanvas}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mappings')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'mappings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.tabSavedMappings}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`cursor-pointer p-1.5 rounded ${viewMode === 'grid' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              aria-label="그리드 뷰"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`cursor-pointer p-1.5 rounded ${viewMode === 'list' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              aria-label="리스트 뷰"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>

        {/* 탭 콘텐츠 — 내 캔버스 */}
        {activeTab === 'ledgers' && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {creating ? (
                <NewLedgerInput mode="grid" {...inputProps} />
              ) : (
                <button
                  type="button"
                  onClick={startCreating}
                  className="flex flex-col items-center justify-center gap-3 bg-white border border-seed-muted rounded-2xl p-6 min-h-[160px] hover:shadow-md hover:border-brand/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-brand/20 flex items-center justify-center group-hover:border-brand group-hover:text-brand text-brand/30 transition-colors">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {creating ? (
                <NewLedgerInput mode="list" {...inputProps} />
              ) : (
                <button
                  type="button"
                  onClick={startCreating}
                  className="flex items-center gap-4 bg-white border border-seed-muted rounded-xl px-4 py-3 hover:shadow-sm hover:border-brand/30 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg border-2 border-brand/20 flex items-center justify-center group-hover:border-brand group-hover:text-brand text-brand/30 transition-colors">
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
        )}

        {/* 탭 콘텐츠 — 저장된 템플릿 */}
        {activeTab === 'mappings' && (
          loadingMappings ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <LedgerSkeleton key={i} mode="grid" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from({ length: 3 }).map((_, i) => <LedgerSkeleton key={i} mode="list" />)}
              </div>
            )
          ) : mappings.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">{t.noMappings}</p>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {mappings.map((m, i) => (
                <MappingTemplateCard key={m.map_id} mapping={m} index={i} onDelete={handleDeleteMapping} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {mappings.map((m, i) => (
                <MappingTemplateRow key={m.map_id} mapping={m} index={i} onDelete={handleDeleteMapping} />
              ))}
            </div>
          )
        )}

      </div>
    </section>
  )
}

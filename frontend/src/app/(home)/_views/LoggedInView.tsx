'use client'

// ─── (home)/_views/LoggedInView.tsx ───────────────────────────────────────────
// 로그인 상태 홈 화면.
//
// 구성:
//   - NewLedgerInput: 새 장부 이름 입력 인라인 컴포넌트 (grid/list 모드 각각)
//   - LoggedInView: 타이틀 + 장부 목록(grid/list 뷰 전환) + 블루프린트 섹션
//
// 상태/로직: useLedgerActions 훅에서 처리 (ledgers, creating, CRUD 핸들러)
// 장부 아이템 렌더링: LedgerCard(grid) / LedgerRow(list) / LedgerSkeleton(로딩)

import { LayoutGrid, List, Plus, Sparkles, Table2, Database, PieChart } from 'lucide-react'
import { useState, type RefObject } from 'react'
import LedgerCard from '../_components/LedgerCard'
import LedgerRow from '../_components/LedgerRow'
import LedgerSkeleton from '../_components/LedgerSkeleton'
import { useLedgerActions } from '../_hooks/useLedgerActions'

const BLUEPRINTS = [
  { icon: Table2,   title: 'Standard Excel',  sub: 'LEGACY MIGRATION' },
  { icon: Database, title: 'Notion Canvas',   sub: 'MODULAR DATABASE' },
  { icon: PieChart, title: 'Portfolio Audit', sub: 'ASSET ALLOCATION' },
]

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

export default function LoggedInView() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const {
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
  } = useLedgerActions()

  const inputProps: Omit<NewLedgerInputProps, 'mode'> = {
    inputRef: newNameInputRef,
    value: newName,
    onChange: setNewName,
    onConfirm: handleCreate,
    onCancel: cancelCreating,
  }

  return (
    <section className="min-h-[calc(100vh-56px)] bg-gray-50 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* 타이틀 */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">My Garden</h1>
          <p className="mt-2 text-sm text-gray-500">
            Nurture your wealth through editorial precision. Your financial landscape, curated and growing.
          </p>
        </div>

        {/* 장부 목록 */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Saved Ledgers</h2>
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

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {creating ? (
                <NewLedgerInput mode="grid" {...inputProps} />
              ) : (
                <button
                  type="button"
                  onClick={startCreating}
                  className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl p-6 min-h-[160px] hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center group-hover:border-brand group-hover:text-brand text-gray-400 transition-colors">
                    <Plus className="size-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">Start New Ledger</p>
                    <p className="text-xs text-gray-400 mt-0.5">Excel or Notion import</p>
                  </div>
                </button>
              )}

              {loading
                ? Array.from({ length: 3 }).map((_, i) => <LedgerSkeleton key={i} mode="grid" />)
                : ledgers.map((ledger, i) => (
                    <LedgerCard
                      key={ledger.led_id}
                      ledger={ledger}
                      index={i}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onCoverChange={handleCoverChange}
                    />
                  ))
              }
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {creating ? (
                <NewLedgerInput mode="list" {...inputProps} />
              ) : (
                <button
                  type="button"
                  onClick={startCreating}
                  className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer group"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg border-2 border-gray-300 flex items-center justify-center group-hover:border-brand group-hover:text-brand text-gray-400 transition-colors">
                    <Plus className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800">Start New Ledger</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Excel or Notion import</p>
                  </div>
                </button>
              )}

              {loading
                ? Array.from({ length: 3 }).map((_, i) => <LedgerSkeleton key={i} mode="list" />)
                : ledgers.map((ledger, i) => (
                    <LedgerRow
                      key={ledger.led_id}
                      ledger={ledger}
                      index={i}
                      onRename={handleRename}
                      onDelete={handleDelete}
                      onCoverChange={handleCoverChange}
                    />
                  ))
              }
            </div>
          )}
        </div>

        {/* 블루프린트 */}
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-3">
            <Sparkles className="size-4 text-brand" />
            Start from Blueprint
          </h2>
          <div className="flex flex-wrap gap-3">
            {BLUEPRINTS.map(({ icon: Icon, title, sub }) => (
              <button
                key={title}
                type="button"
                className="cursor-pointer flex items-center gap-3 border border-gray-200 bg-white rounded-xl px-4 py-3 hover:shadow-sm hover:border-gray-300 transition-all"
              >
                <Icon className="size-5 text-gray-500 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

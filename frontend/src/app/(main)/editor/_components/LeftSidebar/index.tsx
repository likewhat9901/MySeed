'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditorContext } from '../../_context/EditorContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useLedgerList } from './useLedgerList'
import LedgerRow from './LedgerRow'
import ImportMapper from '../ImportMapper'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/editorMessages'
import {
  ChevronSideIcon, FolderIcon,
  PlusIconSm, SaveIcon, ImportIcon,
} from './icons'

// ─── LeftSidebar ─────────────────────────────────────────────────────────────

interface LeftSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function LeftSidebar({ isOpen, onToggle }: LeftSidebarProps) {
  const { saveCanvas, saveStatus, canvasId } = useEditorContext()
  const { user } = useAuth()
  const router = useRouter()
  const { locale } = useLocale()
  const t = editorMessages[locale]
  const [importOpen, setImportOpen] = useState(false)

  const {
    ledgers, loadingLedgers,
    isCreating, newName, setNewName,
    startCreating, cancelCreating,
    handleCreate, handleRename, handleDelete,
  } = useLedgerList({ userId: user?.id, canvasId })

  const isSaving = saveStatus === 'saving'
  const saveBtnLabel = isSaving ? t.saving : saveStatus === 'saved' ? t.saved : t.saveDraft

  return (
    <>
      <aside
        className={`h-full bg-gray-50 border-r border-gray-200 flex flex-col shrink-0 select-none transition-all duration-200 overflow-hidden ${
          isOpen ? 'w-56' : 'w-12'
        }`}
      >
        {/* 사이드바 펼침/접힘 토글 */}
        <div className={`flex items-center h-10 shrink-0 border-b border-gray-200 ${isOpen ? 'justify-end px-2' : 'justify-center'}`}>
          <button
            onClick={onToggle}
            title={isOpen ? t.collapseSidebar : t.expandSidebar}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronSideIcon rotated={!isOpen} />
          </button>
        </div>

        {/* Ledger 목록 */}
        <div className="flex-1 overflow-y-auto pt-3 px-1.5">
          {isOpen ? (
            <>
              <div className="flex items-center justify-between mb-2 px-1.5">
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest">{t.myLedgers}</p>
                <button
                  onClick={startCreating}
                  title="새 가계부"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <PlusIconSm />
                </button>
              </div>

              <div className="flex flex-col gap-0.5">
                {isCreating && (
                  <div className="px-1.5 py-0.5">
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
                      className="w-full text-sm px-2 py-1 border border-green-400 rounded-md outline-none bg-white"
                    />
                  </div>
                )}

                {loadingLedgers ? (
                  <div className="px-2 py-2 text-xs text-gray-400">{t.loading}</div>
                ) : ledgers.length === 0 && !isCreating ? (
                  <div className="px-2 py-2 text-xs text-gray-400">{t.noLedgers}</div>
                ) : (
                  ledgers.map(ledger => (
                    <LedgerRow
                      key={ledger.led_id}
                      ledger={ledger}
                      isActive={ledger.led_id === canvasId}
                      onClick={() => router.push(`/editor?led=${ledger.led_id}`)}
                      onRename={name => handleRename(ledger.led_id, name)}
                      onDelete={() => handleDelete(ledger.led_id)}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onToggle}
              title={t.myLedgersTitle}
              className="w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <FolderIcon />
            </button>
          )}
        </div>

        {/* 하단 빠른 실행 */}
        <div className={`pt-3 pb-4 border-t border-gray-200 ${isOpen ? 'px-3' : 'px-1.5'}`}>
          {isOpen && (
            <p className="text-[10px] font-semibold text-gray-400 tracking-widest mb-2 px-1">
              {t.quickActions}
            </p>
          )}
          <div className={`flex flex-col ${isOpen ? 'gap-2' : 'gap-1 items-center'}`}>
            {isOpen ? (
              <>
                <button
                  onClick={saveCanvas}
                  disabled={isSaving}
                  title="저장 (Ctrl+S)"
                  className={`flex items-center justify-center gap-2 w-full px-3 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                    isSaving
                      ? 'bg-brand-dark opacity-60 cursor-not-allowed'
                      : saveStatus === 'saved'
                      ? 'bg-green-600 cursor-pointer'
                      : 'bg-brand-dark hover:bg-green-700 cursor-pointer'
                  }`}
                >
                  <SaveIcon />
                  {saveBtnLabel}
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  title={t.importData}
                  className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <ImportIcon />
                  {t.importData}
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={isSaving}
                  onClick={saveCanvas}
                  title="저장 (Ctrl+S)"
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                    isSaving
                      ? 'text-gray-400 opacity-60 cursor-not-allowed'
                      : saveStatus === 'saved'
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-brand-dark hover:bg-green-50'
                  }`}
                >
                  <SaveIcon />
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  title={t.importData}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <ImportIcon />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ImportMapper 오버레이 */}
      {importOpen && <ImportMapper onClose={() => setImportOpen(false)} />}
    </>
  )
}

'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEditorContext } from '../../_context/EditorContext'
import { useAuth } from '@/features/auth/AuthContext'
import { useLedgerList } from '../../_hooks/useLedgerList'
import LedgerRow from './LedgerRow'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/messages/editorMessages'
import { ChevronSideIcon, FolderIcon, PlusIconSm } from './icons'

// ─── LeftSidebar ─────────────────────────────────────────────────────────────

interface LeftSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function LeftSidebar({ isOpen, onToggle }: LeftSidebarProps) {
  const { canvasId, isDirty } = useEditorContext()
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useLocale()
  const t = editorMessages[locale]
  const {
    ledgers, loadingLedgers,
    isCreating, newName, setNewName,
    startCreating, cancelCreating,
    handleCreate, handleRename, handleDelete,
  } = useLedgerList({ userId: user?.id, canvasId })

  function handleLedgerClick(ledId: string) {
    if (isDirty) {
      const ok = window.confirm('저장하지 않은 변경사항이 있어요. 저장하지 않고 이동할까요?')
      if (!ok) return
    }
    router.push(`${pathname}?led=${ledId}`)
  }

  return (
    <aside
      className={`h-full bg-gray-50 border-r border-gray-200 flex flex-col shrink-0 select-none transition-all duration-200 overflow-hidden ${
        isOpen ? 'w-56' : 'w-12'
      }`}
    >
      <div className="flex-1 overflow-y-auto pt-3 px-1.5">
        {isOpen ? (
          <>
            <div className="flex items-center justify-between mb-2 px-1.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold text-gray-400 tracking-widest">{t.myLedgers}</p>
                <button
                  onClick={startCreating}
                  title="새 가계부"
                  className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <PlusIconSm />
                </button>
              </div>
              <button
                onClick={onToggle}
                title={t.collapseSidebar}
                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <ChevronSideIcon rotated={!isOpen} />
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
                    onClick={() => handleLedgerClick(ledger.led_id)}
                    onRename={name => handleRename(ledger.led_id, name)}
                    onDelete={() => handleDelete(ledger.led_id)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={onToggle}
              title={t.expandSidebar}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <ChevronSideIcon rotated={!isOpen} />
            </button>
            <button
              onClick={onToggle}
              title={t.myLedgersTitle}
              className="w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <FolderIcon />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

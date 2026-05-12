'use client'

import Link from 'next/link'
import { MoreVertical, Pencil, Trash2, ImagePlus, X } from 'lucide-react'
import type { LedgerSummary } from '@/features/ledger/rpc'
import { formatRelativeTime, getThumbColor } from '../_utils/ledgerUtils'
import { useLedgerItemMenu } from '../_hooks/useLedgerItemMenu'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { homeMessages } from '@/lib/i18n/messages/homeMessages'

interface Props {
  ledger: LedgerSummary
  index: number
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onCoverChange: (id: string, url: string | null) => void
}

export default function LedgerRow({ ledger, index, onRename, onDelete, onCoverChange }: Props) {
  const color = getThumbColor(index)
  const { locale } = useLocale()
  const t = homeMessages[locale]
  const {
    menuOpen, setMenuOpen,
    renaming, setRenaming,
    nameInput, setNameInput,
    uploading,
    menuRef, inputRef, fileInputRef,
    submitRename,
    handleCoverUpload,
    handleRemoveCover,
  } = useLedgerItemMenu({ ledger, onRename, onCoverChange })

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow">
      {/* 썸네일 */}
      <Link href={`/editor?led=${ledger.led_id}`} className="shrink-0 relative">
        {ledger.cover_url ? (
          <img
            src={ledger.cover_url}
            alt={ledger.led_name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color}`} />
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-lg bg-white/60 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        {renaming ? (
          <input
            ref={inputRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submitRename() }
              if (e.key === 'Escape') { setNameInput(ledger.led_name); setRenaming(false) }
            }}
            onBlur={submitRename}
            className="w-full text-sm font-semibold text-gray-800 border-b border-brand outline-none bg-transparent"
          />
        ) : (
          <Link href={`/editor?led=${ledger.led_id}`} className="block text-sm font-semibold text-gray-800 truncate hover:underline">
            {ledger.led_name}
          </Link>
        )}
        <p className="text-[11px] text-gray-400 mt-0.5">{formatRelativeTime(ledger.regist_dt, locale)}</p>
      </div>

      {/* 컨텍스트 메뉴 */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={e => { e.preventDefault(); setMenuOpen(v => !v) }}
          className="cursor-pointer text-gray-400 hover:text-gray-600"
        >
          <MoreVertical className="size-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-5 z-20 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); setRenaming(true) }}
              className="cursor-pointer flex items-center gap-2 w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="size-3.5 text-gray-400" /> {t.rename}
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); fileInputRef.current?.click() }}
              className="cursor-pointer flex items-center gap-2 w-full px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            >
              <ImagePlus className="size-3.5 text-gray-400" /> {t.changeCover}
            </button>
            {ledger.cover_url && (
              <button
                type="button"
                onClick={handleRemoveCover}
                className="cursor-pointer flex items-center gap-2 w-full px-3 py-1.5 text-gray-500 hover:bg-gray-50"
              >
                <X className="size-3.5 text-gray-400" /> {t.removeCover}
              </button>
            )}
            <div className="my-1 border-t border-gray-100" />
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(ledger.led_id) }}
              className="cursor-pointer flex items-center gap-2 w-full px-3 py-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" /> {t.delete}
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />
    </div>
  )
}

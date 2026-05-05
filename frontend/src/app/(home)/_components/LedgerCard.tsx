'use client'

import Link from 'next/link'
import { MoreVertical, Pencil, Trash2, ImagePlus, X } from 'lucide-react'
import type { LedgerSummary } from '@/features/ledger/api'
import { formatRelativeTime, getThumbColor } from '../_utils/ledgerUtils'
import { useLedgerItemMenu } from './useLedgerItemMenu'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { homeMessages } from '@/lib/i18n/homeMessages'

interface Props {
  ledger: LedgerSummary
  index: number
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onCoverChange: (id: string, url: string | null) => void
}

export default function LedgerCard({ ledger, index, onRename, onDelete, onCoverChange }: Props) {
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
    <div className="bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-shadow">
      {/* 썸네일 */}
      <Link href={`/editor?led=${ledger.led_id}`} className="block overflow-hidden rounded-t-2xl relative">
        {ledger.cover_url ? (
          <img
            src={ledger.cover_url}
            alt={ledger.led_name}
            className="h-24 w-full object-cover"
          />
        ) : (
          <div className={`h-24 bg-gradient-to-br ${color}`} />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </Link>

      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
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
              className="flex-1 text-xs font-semibold text-gray-800 border-b border-brand outline-none bg-transparent leading-snug"
            />
          ) : (
            <Link href={`/editor?led=${ledger.led_id}`} className="flex-1 text-xs font-semibold text-gray-800 leading-snug hover:underline truncate">
              {ledger.led_name}
            </Link>
          )}

          {/* 컨텍스트 메뉴 */}
          <div ref={menuRef} className="relative shrink-0 mt-0.5">
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
        </div>

        <p className="text-[10px] text-gray-400 mt-1">{formatRelativeTime(ledger.regist_dt)}</p>
      </div>

      {/* 파일 선택 input — 숨김 */}
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

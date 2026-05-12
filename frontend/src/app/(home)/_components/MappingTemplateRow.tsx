// 매핑 템플릿 목록형 컴포넌트 — 홈 화면 리스트 뷰용
'use client'

import { MoreVertical, Trash2, Link2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { formatRelativeTime } from '../_utils/ledgerUtils'
import type { ImportMapping } from '@/features/import/rpc'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { homeMessages } from '@/lib/i18n/messages/homeMessages'

interface Props {
  mapping: ImportMapping
  index: number
  onDelete: (mapId: string) => void
}

const ROW_COLORS = [
  'from-blue-100 to-blue-200',
  'from-purple-100 to-purple-200',
  'from-amber-100 to-amber-200',
  'from-teal-100 to-teal-200',
  'from-rose-100 to-rose-200',
  'from-indigo-100 to-indigo-200',
]

export default function MappingTemplateRow({ mapping, index, onDelete }: Props) {
  const color = ROW_COLORS[index % ROW_COLORS.length]
  const { locale } = useLocale()
  const t = homeMessages[locale]
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Link2 className="size-4 text-white/70" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{mapping.map_name}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {mapping.mappings.length}{t.mappingCountUnit} · {formatRelativeTime(mapping.regist_dt, locale)}
        </p>
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={e => { e.preventDefault(); setMenuOpen(v => !v) }}
          className="cursor-pointer text-gray-400 hover:text-gray-600"
        >
          <MoreVertical className="size-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-5 z-20 w-32 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(mapping.map_id) }}
              className="cursor-pointer flex items-center gap-2 w-full px-3 py-1.5 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" /> {t.delete}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

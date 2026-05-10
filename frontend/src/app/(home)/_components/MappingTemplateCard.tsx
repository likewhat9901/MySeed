// 매핑 템플릿 카드형 컴포넌트 — 홈 화면 그리드 뷰용
'use client'

import { MoreVertical, Trash2, Link2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { formatRelativeTime } from '../_utils/ledgerUtils'
import type { ImportMapping } from '@/features/import/api'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { homeMessages } from '@/lib/i18n/homeMessages'

interface Props {
  mapping: ImportMapping
  index: number
  onDelete: (mapId: string) => void
}

const CARD_COLORS = [
  'from-blue-100 to-blue-200',
  'from-purple-100 to-purple-200',
  'from-amber-100 to-amber-200',
  'from-teal-100 to-teal-200',
  'from-rose-100 to-rose-200',
  'from-indigo-100 to-indigo-200',
]

export default function MappingTemplateCard({ mapping, index, onDelete }: Props) {
  const color = CARD_COLORS[index % CARD_COLORS.length]
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
    <div className="bg-white border border-seed-muted rounded-2xl hover:shadow-[0_4px_20px_-4px_rgba(45,140,78,0.15)] transition-shadow">
      {/* 썸네일 */}
      <div className={`h-24 rounded-t-2xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <Link2 className="size-7 text-white/70" />
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <p className="flex-1 text-xs font-semibold text-gray-800 leading-snug truncate">{mapping.map_name}</p>

          <div ref={menuRef} className="relative shrink-0 mt-0.5">
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

        <p className="text-[10px] text-gray-400 mt-1">
          {mapping.mappings.length}{t.mappingCountUnit} · {formatRelativeTime(mapping.regist_dt, locale)}
        </p>
      </div>
    </div>
  )
}

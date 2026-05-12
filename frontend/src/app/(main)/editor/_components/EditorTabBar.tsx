// editor 캔버스/임포트 페이지 간 전환 탭 바
'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, FileInput } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { editorMessages } from '@/lib/i18n/messages/editorMessages'

export default function EditorTabBar() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const ledId        = searchParams.get('led')
  const { locale }   = useLocale()
  const t            = editorMessages[locale]

  const TABS = [
    { href: '/editor/canvas', label: t.tabCanvas,   icon: LayoutDashboard },
    { href: '/editor/import', label: t.importData,  icon: FileInput },
  ]

  return (
    <div className="h-8 shrink-0 border-b border-gray-200 bg-white flex items-center px-3 gap-1 select-none">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active  = pathname.startsWith(href)
        const tabHref = ledId ? `${href}?led=${ledId}` : href
        return (
          <Link
            key={href}
            href={tabHref}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium border-b-2 transition-colors ${
              active
                ? 'border-gray-800 text-gray-800'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={13} />
            {label}
          </Link>
        )
      })}
    </div>
  )
}

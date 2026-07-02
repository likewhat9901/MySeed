'use client'

// 로그인 사용자 전용 좌측 고정 사이드바 — 가계부/카드/투자 메뉴 + 하단 유저
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useCallback } from 'react'
import { LayoutGrid, CreditCard, TrendingUp, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useOutsideClick } from '@/hooks/useOutsideClick'

const NAV_ITEMS = [
  { href: '/ledger', label: '가계부', icon: LayoutGrid },
  { href: '/card', label: '카드', icon: CreditCard },
  { href: '/invest', label: '투자', icon: TrendingUp },
] as const

export default function GlobalSidebar() {
  const { loggedIn, user, logout } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useOutsideClick(menuRef, menuOpen, closeMenu)

  // /ledger 내부는 자체 LeftSidebar(가계부 목록+내역 트리)를 쓰므로 전역 사이드바는 숨김
  if (!loggedIn || pathname?.startsWith('/ledger')) return null

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '사용자'
  const displayEmail = user?.email ?? ''
  const avatarLetter = displayName.charAt(0).toUpperCase()

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-44 border-r border-gray-200 bg-white flex flex-col py-6 px-3 z-40">
      <Link href="/" className="text-sm font-bold text-gray-800 px-2 mb-6">MySeed</Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-1.5 text-xs font-semibold transition-colors border-l-2 ${
                active
                  ? 'border-l-gray-800 bg-gray-50 text-gray-900'
                  : 'border-l-transparent text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div ref={menuRef} className="relative mt-auto pt-4 border-t border-gray-200">
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-300 shadow-md py-1 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
              {displayEmail && <p className="text-[10px] text-gray-400 truncate mt-0.5">{displayEmail}</p>}
            </div>
            <Link
              href="/profile/settings"
              onClick={closeMenu}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings size={13} />
              설정
            </Link>
            <button
              type="button"
              onClick={() => { logout(); closeMenu() }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={13} />
              로그아웃
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 px-2 py-1.5 w-full hover:bg-gray-50 transition-colors"
        >
          <span className="w-6 h-6 shrink-0 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-medium">
            {avatarLetter}
          </span>
          <span className="text-xs font-semibold text-gray-800 truncate">{displayName}</span>
        </button>
      </div>
    </aside>
  )
}

'use client'

// 루트 레이아웃 본문 — 로그인 시 전역 사이드바(GlobalSidebar) 폭만큼 본문을 밀어줌
import { usePathname } from 'next/navigation'
import { useAuth } from '@/features/auth/AuthContext'
import GlobalSidebar from '@/components/layout/GlobalSidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { loggedIn } = useAuth()
  const pathname = usePathname()
  // /ledger 내부는 자체 LeftSidebar를 쓰므로 전역 사이드바 여백을 주지 않음
  const sidebarVisible = loggedIn && !pathname?.startsWith('/ledger')

  return (
    <>
      <GlobalSidebar />
      <div className={sidebarVisible ? 'pl-44 flex flex-col flex-1' : 'flex flex-col flex-1'}>
        {children}
      </div>
    </>
  )
}

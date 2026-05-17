// ledger 하위 라우트(/ledger/overview, /ledger/records)가 LedgerProvider와 탭 바를 공유하는 레이아웃
'use client'

import { LedgerProvider } from './_context/LedgerContext'
import { useLedgerContext } from './_context/LedgerContext'
import LeftSidebar from './_components/LeftSidebar'
import LedgerTabBar from './_components/LedgerTabBar'
import LedgerFooter from './_components/LedgerFooter'

function LedgerInner({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useLedgerContext()
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <LedgerTabBar />
          {children}
        </div>
      </div>
      <LedgerFooter />
    </div>
  )
}

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LedgerProvider>
      <LedgerInner>{children}</LedgerInner>
    </LedgerProvider>
  )
}

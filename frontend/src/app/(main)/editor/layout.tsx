// editor 하위 라우트(/editor/canvas, /editor/import)가 EditorProvider와 탭 바를 공유하는 레이아웃
'use client'

import { useState } from 'react'
import { EditorProvider } from './_context/EditorContext'
import EditorTabBar from './_components/EditorTabBar'
import LeftSidebar from './_components/LeftSidebar'
import EditorFooter from './_components/EditorFooter'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <EditorProvider>
      <EditorTabBar />
      <div className="flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(v => !v)}
          />
          <div className="flex flex-col flex-1 overflow-hidden">
            {children}
          </div>
        </div>
        <EditorFooter />
      </div>
    </EditorProvider>
  )
}

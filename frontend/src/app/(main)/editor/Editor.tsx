'use client'

import { useEffect } from 'react'
import { EditorProvider, useEditorContext } from './_context/EditorContext'
import LeftSidebar from './_components/LeftSidebar'
import Canvas from './_components/Canvas'
import BottomToolbar from './_components/BottomToolbar'
import RightSidebar from './_components/RightSidebar'
import EditorFooter from './_components/EditorFooter'

// ─── Editor ──────────────────────────────────────────────────────────────────
// EditorProvider로 전체 상태를 공급하고, 하위 컴포넌트는 useEditorContext로 직접 읽음

export default function Editor() {
  return (
    <EditorProvider>
      <EditorLayout />
    </EditorProvider>
  )
}

// Provider 안에서 Context를 소비하는 레이아웃 컴포넌트
function EditorLayout() {
  const { sidebarOpen, setSidebarOpen, saveCanvas, undo, redo, canUndo, canRedo } = useEditorContext()

  // Ctrl+S / Cmd+S — 저장 · Ctrl+Z / Cmd+Z — undo · Ctrl+Y / Cmd+Shift+Z — redo
  // input/textarea 포커스일 때는 텍스트 편집용으로 두고 캔버스 단축키는 막음
  useEffect(() => {
    function inEditableField(t: EventTarget | null) {
      const el = t as HTMLElement | null
      if (!el) return false
      if (el.closest('input, textarea, [contenteditable="true"]')) return true
      return false
    }

    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveCanvas()
        return
      }
      if (inEditableField(e.target)) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (!canUndo) return
        e.preventDefault()
        undo()
        return
      }
      if (
        (e.ctrlKey && e.key === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z')
      ) {
        if (!canRedo) return
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveCanvas, undo, redo, canUndo, canRedo])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-gray-50 overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
        />

        <div className="relative flex flex-col flex-1 overflow-hidden">
          <Canvas />
          <BottomToolbar />
        </div>

        <RightSidebar />
      </div>

      <EditorFooter />
    </div>
  )
}

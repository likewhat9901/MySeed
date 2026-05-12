'use client'

import { useState, useCallback } from 'react'

// ─── useUIState ───────────────────────────────────────────────────────────────
// 사이드바 열림 상태·그리드·Undo/Redo UI 상태를 관리합니다.
// EditorProvider 내부에서만 호출합니다.

export interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  rightSidebarOpen: boolean
  setRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>
  rightActiveTab: 'widgets' | 'properties'
  setRightActiveTab: React.Dispatch<React.SetStateAction<'widgets' | 'properties'>>
  handleRightToggle: (tab?: 'widgets' | 'properties') => void
  showGrid: boolean
  onToggleGrid: () => void
  isEditMode: boolean
  toggleEditMode: () => void
}

export function useUIState(): UIState {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [rightActiveTab, setRightActiveTab] = useState<'widgets' | 'properties'>('properties')
  const [showGrid, setShowGrid] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  const handleRightToggle = useCallback((tab?: 'widgets' | 'properties') => {
    setRightSidebarOpen(v => !v)
    if (tab) setRightActiveTab(tab)
  }, [])

  const onToggleGrid = useCallback(() => setShowGrid(v => !v), [])
  const toggleEditMode = useCallback(() => setIsEditMode(v => !v), [])

  return {
    sidebarOpen,
    setSidebarOpen,
    rightSidebarOpen,
    setRightSidebarOpen,
    rightActiveTab,
    setRightActiveTab,
    handleRightToggle,
    showGrid,
    onToggleGrid,
    isEditMode,
    toggleEditMode,
  }
}

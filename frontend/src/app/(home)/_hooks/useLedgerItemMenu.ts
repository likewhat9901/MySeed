'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import type { LedgerSummary } from '@/features/ledger/rpc'
import { updateLedgerCover } from '@/features/ledger/rpc'
import { uploadLedgerCover } from '@/features/ledger/storage'
import { useOutsideClick } from '@/hooks/useOutsideClick'

interface Options {
  ledger: LedgerSummary
  onRename: (id: string, name: string) => void
  onCoverChange: (id: string, url: string | null) => void
}

export function useLedgerItemMenu({ ledger, onRename, onCoverChange }: Options) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(ledger.led_name)
  const [uploading, setUploading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useOutsideClick(menuRef, menuOpen, closeMenu)

  useEffect(() => {
    if (renaming) inputRef.current?.focus()
  }, [renaming])

  const submitRename = () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== ledger.led_name) onRename(ledger.led_id, trimmed)
    else setNameInput(ledger.led_name)
    setRenaming(false)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const url = await uploadLedgerCover(user.id, ledger.led_id, file)
    if (url) {
      await updateLedgerCover(ledger.led_id, url)
      onCoverChange(ledger.led_id, url)
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleRemoveCover = async () => {
    setMenuOpen(false)
    await updateLedgerCover(ledger.led_id, null)
    onCoverChange(ledger.led_id, null)
  }

  return {
    menuOpen, setMenuOpen,
    renaming, setRenaming,
    nameInput, setNameInput,
    uploading,
    menuRef, inputRef, fileInputRef,
    submitRename,
    handleCoverUpload,
    handleRemoveCover,
  }
}

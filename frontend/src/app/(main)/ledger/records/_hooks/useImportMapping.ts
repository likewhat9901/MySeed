// 매핑 템플릿 CRUD 및 컬럼 선택 상태 관리
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { getImportMappings, saveImportMapping, deleteImportMapping } from '@/features/ledger/record/rpc'
import type { ImportMapping } from '@/features/ledger/record/rpc'
import type { RecordColumn, ColumnMappingEntry } from '@/features/ledger/record/types'

export function toRpcMappings(entries: ColumnMappingEntry[]) {
  return entries.map(e => ({
    widget_id:   e.column,
    widget_type: 'table' as const,
    sheet:       e.sheet,
    address:     e.address,
  }))
}

export function fromRpcMappings(rpcMappings: ImportMapping['mappings']): ColumnMappingEntry[] {
  const validColumns: RecordColumn[] = ['date', 'description', 'amount', 'category', 'type']
  return rpcMappings
    .filter(m => validColumns.includes(m.widget_id as RecordColumn))
    .map(m => ({
      column:  m.widget_id as RecordColumn,
      sheet:   m.sheet,
      address: m.address,
    }))
}

export function useImportMapping(canvasId: string | null) {
  const { user } = useAuth()

  const [columnMappings, setColumnMappings] = useState<ColumnMappingEntry[]>([])
  const [selectedColumn, setSelectedColumn] = useState<RecordColumn | null>(null)
  const [selectedAddr,   setSelectedAddr]   = useState<string | null>(null)

  const [presets,       setPresets]       = useState<ImportMapping[]>([])
  const [activePreset,  setActivePreset]  = useState<ImportMapping | null>(null)
  const [isDirty,       setIsDirty]       = useState(false)
  const [savingPreset,  setSavingPreset]  = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [showPresets,   setShowPresets]   = useState(false)
  const [newPresetName, setNewPresetName] = useState('')

  useEffect(() => {
    if (!user?.id || !canvasId) return
    getImportMappings(user.id, canvasId).then(setPresets)
  }, [user?.id, canvasId])

  function loadPreset(preset: ImportMapping, onApply: (entries: ColumnMappingEntry[]) => void) {
    const entries = fromRpcMappings(preset.mappings)
    setColumnMappings(entries)
    setActivePreset(preset)
    setIsDirty(false)
    setShowPresets(false)
    onApply(entries)
  }

  async function saveNewPreset() {
    if (!user?.id || !canvasId || columnMappings.length === 0) return
    const name = newPresetName.trim()
    if (!name || presets.some(p => p.map_name === name)) return
    setSavingPreset(true)
    const mapId = crypto.randomUUID()
    await saveImportMapping(user.id, mapId, name, toRpcMappings(columnMappings), canvasId)
    const fresh = await getImportMappings(user.id, canvasId)
    setPresets(fresh)
    const created = fresh.find(p => p.map_id === mapId) ?? {
      map_id: mapId, map_name: name,
      mappings: toRpcMappings(columnMappings), regist_dt: new Date().toISOString(),
    }
    setActivePreset(created)
    setIsDirty(false)
    setSavingPreset(false)
    setSavedFeedback(true)
    setNewPresetName('')
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  async function updatePreset() {
    if (!user?.id || !canvasId || !activePreset || columnMappings.length === 0) return
    setSavingPreset(true)
    await saveImportMapping(user.id, activePreset.map_id, activePreset.map_name, toRpcMappings(columnMappings), canvasId)
    setActivePreset(prev => prev ? { ...prev, mappings: toRpcMappings(columnMappings) } : prev)
    setPresets(prev => prev.map(p => p.map_id === activePreset.map_id ? { ...p, mappings: toRpcMappings(columnMappings) } : p))
    setIsDirty(false)
    setSavingPreset(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  async function deletePreset(mapId: string) {
    await deleteImportMapping(mapId)
    setPresets(prev => prev.filter(p => p.map_id !== mapId))
    if (activePreset?.map_id === mapId) { setActivePreset(null); setIsDirty(false) }
  }

  function addMapping(entry: ColumnMappingEntry) {
    const next = [...columnMappings.filter(m => m.column !== entry.column), entry]
    setColumnMappings(next)
    setIsDirty(true)
    setSelectedColumn(null)
    setSelectedAddr(null)
    return next
  }

  function addMappings(entries: ColumnMappingEntry[]) {
    let next = columnMappings
    for (const entry of entries) next = [...next.filter(m => m.column !== entry.column), entry]
    setColumnMappings(next)
    setIsDirty(true)
    return next
  }

  function removeMapping(col: RecordColumn) {
    const next = columnMappings.filter(m => m.column !== col)
    setColumnMappings(next)
    setIsDirty(true)
    return next
  }

  return {
    columnMappings, selectedColumn, setSelectedColumn, selectedAddr, setSelectedAddr,
    presets, activePreset, isDirty, savingPreset, savedFeedback,
    showPresets, setShowPresets, newPresetName, setNewPresetName,
    loadPreset, saveNewPreset, updatePreset, deletePreset,
    addMapping, addMappings, removeMapping,
  }
}

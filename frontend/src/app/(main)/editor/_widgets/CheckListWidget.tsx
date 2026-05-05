'use client'

// ─── _widgets/CheckListWidget.tsx ────────────────────────────────────────────
// 체크리스트 위젯. 항목 추가/삭제/체크, 드래그 재정렬, 진행 바 표시.
// data_binding: CheckListBinding { title: string, items: { text, checked }[] }

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import type { WidgetComponentProps } from '../_components/Canvas/WidgetWrapper'
import type { CheckListBinding } from '@/features/editor/types'

export default function CheckListWidget({ binding, onBindingChange, onBeforeChange }: WidgetComponentProps) {
  const data = binding as CheckListBinding | null
  const title: string = data?.title ?? '체크리스트'
  const items: { text: string; checked: boolean }[] = data?.items ?? []

  const [editingTitle, setEditingTitle] = useState(false)

  function updateTitle(value: string) {
    onBeforeChange()
    onBindingChange({ title: value, items } as CheckListBinding)
  }

  function updateItem(idx: number, patch: Partial<{ text: string; checked: boolean }>) {
    const next = items.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    onBeforeChange()
    onBindingChange({ title, items: next } as CheckListBinding)
  }

  function addItem() {
    onBeforeChange()
    onBindingChange({ title, items: [...items, { text: '', checked: false }] } as CheckListBinding)
  }

  function deleteItem(idx: number) {
    onBeforeChange()
    onBindingChange({ title, items: items.filter((_, i) => i !== idx) } as CheckListBinding)
  }

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2">
        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 text-sm font-semibold text-gray-800 outline-none border-b border-green-400 pb-0.5 bg-transparent"
            value={title}
            onChange={e => onBindingChange({ title: e.target.value, items } as CheckListBinding)}
            onBlur={() => { setEditingTitle(false); updateTitle(title) }}
          />
        ) : (
          <span
            className="text-sm font-semibold text-gray-800 cursor-text truncate"
            onDoubleClick={() => setEditingTitle(true)}
          >
            {title}
          </span>
        )}
        <span className="text-xs text-gray-400 shrink-0">{checkedCount}/{items.length}</span>
      </div>

      {/* 진행 바 */}
      {items.length > 0 && (
        <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* 아이템 목록 */}
      <div className="flex-1 overflow-auto flex flex-col gap-1">
        {items.length === 0 && (
          <p className="text-xs text-gray-300 text-center mt-4">항목을 추가해 보세요</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 group py-1 px-1 rounded hover:bg-gray-50">
            <GripVertical size={12} className="text-gray-200 shrink-0 cursor-grab" />
            <input
              type="checkbox"
              checked={item.checked}
              onChange={e => updateItem(idx, { checked: e.target.checked })}
              className="accent-green-500 shrink-0 w-3.5 h-3.5 cursor-pointer"
            />
            <input
              className={`flex-1 text-xs bg-transparent outline-none min-w-0 ${
                item.checked ? 'line-through text-gray-400' : 'text-gray-700'
              }`}
              value={item.text}
              placeholder="항목 입력..."
              onChange={e => updateItem(idx, { text: e.target.value })}
              onFocus={onBeforeChange}
            />
            <button
              onClick={() => deleteItem(idx)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity shrink-0"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* 추가 버튼 */}
      <button
        onClick={addItem}
        className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium self-start"
      >
        <Plus size={13} /> 항목 추가
      </button>
    </div>
  )
}

// 엑셀 업로드 후 소스(preset/커스텀) 선택 모달
'use client'

import { X } from 'lucide-react'
import { IMPORT_PRESETS } from '../_utils/importPresets'

interface Props {
  onSelectPreset: (presetId: string) => void
  onSelectCustom: () => void
  onClose:        () => void
}

export default function ImportSourceModal({ onSelectPreset, onSelectCustom, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[360px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-800">엑셀 형식 선택</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">어떤 형식의 엑셀 파일인가요?</p>

        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={onSelectCustom}
            className="flex flex-col items-start px-4 py-3 rounded-xl border border-dashed border-gray-300 hover:border-brand hover:bg-brand/5 transition-colors text-left"
          >
            <span className="text-sm font-medium text-gray-700">직접 매핑</span>
            <span className="text-[11px] text-gray-400 mt-0.5">내가 만든 엑셀 — 컬럼을 직접 지정합니다</span>
          </button>
        </div>

        <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
          {IMPORT_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.id)}
              className="flex flex-col items-start px-4 py-3 rounded-xl border border-gray-200 hover:border-brand hover:bg-brand/5 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-700">{preset.label}</span>
              <span className="text-[11px] text-gray-400 mt-0.5">{preset.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

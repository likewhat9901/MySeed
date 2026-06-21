// 엑셀 업로드 후 소스(preset/커스텀) 선택 모달
'use client'

import { X } from 'lucide-react'
import { IMPORT_PRESETS } from '../../_utils/importPresets'

interface Props {
  onSelectPreset: (presetId: string) => void
  onSelectCustom: () => void
  onClose:        () => void
}

export default function ImportSourceModal({ onSelectPreset, onSelectCustom, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-300 shadow-xl w-[360px]">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-300">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-gray-600">엑셀 형식 선택</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-3">어떤 형식의 엑셀 파일인가요?</p>

          <div className="flex flex-col gap-1.5 mb-3">
            <button
              onClick={onSelectCustom}
              className="flex flex-col items-start px-4 py-3 border border-dashed border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-gray-700">직접 매핑</span>
              <span className="text-[11px] text-gray-400 mt-0.5">내가 만든 엑셀 — 컬럼을 직접 지정합니다</span>
            </button>
          </div>

          <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5">
            {IMPORT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className="flex flex-col items-start px-4 py-3 border border-gray-200 hover:border-gray-500 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-gray-700">{preset.label}</span>
                <span className="text-[11px] text-gray-400 mt-0.5">{preset.note}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 분석 탭 — 섹션 구분 라벨 (대문자 트래킹 텍스트 + 가로 구분선)

export function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-300" />
    </div>
  )
}

// 장부 데이터 로딩 중 표시하는 스켈레톤 — 그리드/리스트 뷰 형태 각각 지원
interface Props {
  mode: "grid" | "list";
}

export default function LedgerSkeleton({ mode }: Props) {
  if (mode === "grid") {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
        <div className="h-24 bg-gray-100" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-3/4" />
          <div className="h-2 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 animate-pulse">
      <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-2 bg-gray-100 rounded w-1/3" />
      </div>
    </div>
  );
}

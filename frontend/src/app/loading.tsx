// ─── app/loading.tsx ──────────────────────────────────────────────────────────
// Next.js 전역 로딩 UI. 페이지 전환 중 스피너 표시.

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
    </div>
  )
}

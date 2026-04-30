// ─── EditorFooter ────────────────────────────────────────────────────────────
// 에디터 하단 고정 푸터 (h-8). 버전 정보, 링크, 저작권 표시.
// Editor.tsx에서 캔버스 아래에 배치됨.

export default function EditorFooter() {
  return (
    <footer className="h-8 shrink-0 border-t border-gray-200 bg-white flex items-center px-4 text-xs text-gray-400">
      {/* 왼쪽: 앱 버전 */}
      <span className="w-40">MYSEED_CORE_v2.4</span>
      {/* 가운데: 외부 링크 */}
      <div className="flex-1 flex items-center justify-center gap-4">
        <a href="https://myseed.co.kr" className="hover:text-gray-600 transition-colors">myseed.co.kr</a>
        <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
        <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
      </div>
      {/* 오른쪽: 저작권 */}
      <span className="w-40 text-right">© 2026 MySeed. All rights reserved.</span>
    </footer>
  )
}

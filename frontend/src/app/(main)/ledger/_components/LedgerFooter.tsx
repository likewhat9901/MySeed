// 가계부 하단 고정 푸터

export default function LedgerFooter() {
  return (
    <footer className="h-6 shrink-0 overflow-hidden border-t border-gray-200 bg-white flex items-center px-4 text-[10px] text-gray-400">
      <span className="w-40">MYSEED_CORE_v2.4</span>
      <div className="flex-1 flex items-center justify-center gap-4">
        <a href="https://myseed.co.kr" className="hover:text-gray-600 transition-colors">myseed.co.kr</a>
        <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
        <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
      </div>
      <span className="w-40 text-right">© 2026 MySeed. All rights reserved.</span>
    </footer>
  )
}

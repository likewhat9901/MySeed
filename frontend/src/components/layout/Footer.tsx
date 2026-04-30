// ─── components/layout/Footer.tsx ─────────────────────────────────────────────
// 홈 페이지 하단 푸터. 로고 / 약관 링크 / 저작권만 표시하는 정적 컴포넌트.

export default function Footer() {
  return (
    <footer className="bg-gray-100 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <span className="text-gray-400 font-semibold text-sm shrink-0">MySeed</span>

        <nav className="hidden md:flex gap-4 lg:gap-6 text-xs text-gray-400">
          <a href="#" className="hover:text-gray-600 whitespace-nowrap">Terms</a>
          <a href="#" className="hover:text-gray-600 whitespace-nowrap">Privacy</a>
        </nav>

        <p className="text-xs text-gray-400 text-center sm:text-right whitespace-nowrap">© 2026</p>
      </div>
    </footer>
  );
}
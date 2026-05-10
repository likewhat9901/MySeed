// ─── components/layout/Footer.tsx ─────────────────────────────────────────────
// 홈 페이지 하단 푸터. 로고 / 약관 링크 / 저작권만 표시하는 정적 컴포넌트.

export default function Footer() {
  return (
    <footer className="bg-white border-t border-brand/15 py-3">
      <div className="w-full px-6 flex items-center justify-between">
        <span className="text-gray-400 font-semibold text-sm">MySeed</span>

        <nav className="hidden md:flex gap-6 text-xs text-gray-400">
          <a href="#" className="hover:text-gray-600">Terms</a>
          <a href="#" className="hover:text-gray-600">Privacy</a>
        </nav>

        <p className="text-xs text-gray-400">© 2026</p>
      </div>
    </footer>
  );
}
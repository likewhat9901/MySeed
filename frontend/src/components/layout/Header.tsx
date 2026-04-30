import Link from "next/link";
import HeaderClient from "@/components/layout/HeaderClient";

// 로고(서버 정적 렌더) + HeaderClient(전역 AuthContext 사용)
export default function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* 로고 — 서버에서 정적 렌더 */}
        <Link href="/" className="text-brand-dark font-bold text-lg tracking-tight shrink-0">
          MySeed
        </Link>

        {/* 나머지 — Client Component (전역 AuthContext 사용) */}
        <HeaderClient />

      </div>
    </nav>
  );
}

"use client";

// 헤더 바깥 틀 — 로그인 시 좌측 사이드바(GlobalSidebar) 폭만큼 밀어주고 로고를 숨김
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";

export default function HeaderBar({ children }: { children: React.ReactNode }) {
  const { loggedIn } = useAuth();
  const pathname = usePathname();
  // /ledger 내부는 GlobalSidebar를 숨기므로 헤더도 전체 폭 그대로 사용
  const sidebarVisible = loggedIn && !pathname?.startsWith('/ledger');

  return (
    <nav className={`fixed top-0 right-0 z-50 bg-white border-b border-gray-100 transition-[left] ${
      sidebarVisible ? 'left-44' : 'left-0'
    }`}>
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {!sidebarVisible && (
          <Link href="/" className="text-brand-dark font-bold text-lg tracking-tight shrink-0">
            MySeed
          </Link>
        )}
        {children}
      </div>
    </nav>
  );
}

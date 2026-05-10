"use client";

// 홈 진입점: 로그인 여부에 따라 LoggedInView / LoggedOutView 분기
import { useAuth } from "@/features/auth/AuthContext";
import Footer from "@/components/layout/Footer";
import LoggedInView from "./_views/LoggedInView";
import LoggedOutView from "./_views/LoggedOutView";

export default function Home() {
  const { loggedIn } = useAuth();
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 flex flex-col">
        {loggedIn ? <LoggedInView /> : <LoggedOutView />}
      </main>
      <Footer />
    </div>
  );
}

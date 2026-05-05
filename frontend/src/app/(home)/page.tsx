"use client";

// 홈 진입점: 로그인 여부에 따라 LoggedInView / LoggedOutView 분기
import { useAuth } from "@/features/auth/AuthContext";
import Footer from "@/components/layout/Footer";
import LoggedInView from "./_views/LoggedInView";
import LoggedOutView from "./_views/LoggedOutView";

export default function Home() {
  const { loggedIn } = useAuth();
  return (
    <>
      <main>
        {loggedIn ? <LoggedInView /> : <LoggedOutView />}
      </main>
      <Footer />
    </>
  );
}

"use client";

// 개발 환경에서만 react-scan 활성화 — 불필요한 리렌더 컴포넌트를 빨간 테두리로 하이라이트
import { scan } from "react-scan";
import { useEffect } from "react";

export default function ReactScanInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      scan({ enabled: true });
    }
  }, []);
  return null;
}

// LedgerCard / LedgerRow 공용 유틸 — 썸네일 색상 팔레트 & 시간 포맷

import { THUMB_COLORS } from '@/constants/ledger'

// ISO 날짜 문자열 → "방금 전 / N분 전 / N시간 전 / N일 전" (또는 영문) 변환
export function formatRelativeTime(isoString?: string, locale: 'ko' | 'en' = 'ko'): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (locale === 'en') {
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  if (mins < 1)  return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

// index를 THUMB_COLORS 길이로 나눈 나머지로 색상 순환
export function getThumbColor(index: number): string {
  return THUMB_COLORS[index % THUMB_COLORS.length];
}

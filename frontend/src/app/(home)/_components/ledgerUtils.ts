// LedgerCard / LedgerRow 공용 유틸 — 썸네일 색상 팔레트 & 시간 포맷

// 장부 순서(index)에 따라 순환 적용되는 그라디언트 색상 목록
export const THUMB_COLORS = [
  "from-blue-900 via-blue-700 to-cyan-500",
  "from-purple-700 via-pink-600 to-rose-400",
  "from-green-800 via-emerald-600 to-teal-400",
  "from-orange-700 via-amber-600 to-yellow-400",
  "from-slate-700 via-slate-500 to-gray-400",
];

// ISO 날짜 문자열 → "방금 전 / N분 전 / N시간 전 / N일 전" 변환
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
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

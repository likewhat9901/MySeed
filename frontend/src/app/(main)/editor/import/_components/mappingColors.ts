// 매핑 인덱스별 색상 팔레트 — ExcelGrid / CanvasPreview / 하단 칩 공용

export const MAPPING_COLORS = [
  { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', outline: '#3b82f6' }, // 파랑
  { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd', outline: '#8b5cf6' }, // 보라
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', outline: '#f59e0b' }, // 주황
  { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4', outline: '#ec4899' }, // 분홍
  { bg: '#ccfbf1', text: '#134e4a', border: '#5eead4', outline: '#14b8a6' }, // 청록
]

export function getMappingColor(index: number) {
  return MAPPING_COLORS[index % MAPPING_COLORS.length]
}

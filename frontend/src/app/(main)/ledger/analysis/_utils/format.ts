// 분석 탭 — 금액 포맷·월 이동·차트 축 올림 등 순수 유틸 함수

// 금액을 ₩억/만/원 단위로 축약
export function fmtW(n: number) {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `₩${Math.round(n / 10_000).toLocaleString()}만`
  return `₩${n.toLocaleString()}`
}

// "YYYY-MM"을 delta개월만큼 이동
export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 차트 y축 상한을 1/2/5 × 10ⁿ 형태의 깔끔한 값으로 올림
export function niceCeil(n: number) {
  if (n <= 0) return 1
  const exp = Math.floor(Math.log10(n))
  const base = Math.pow(10, exp)
  const f = n / base
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * base
}

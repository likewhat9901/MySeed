// ─── error-test/page.tsx ──────────────────────────────────────────────────────
// 개발용 에러 테스트 페이지. 의도적으로 에러를 던져 error.tsx 경계가 작동하는지 확인.

export default function ErrorTestPage() {
  throw new Error('이것은 테스트 에러입니다. error.tsx 페이지가 렌더링됩니다.')
}

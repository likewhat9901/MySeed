// ─── (main)/editor/page.tsx ───────────────────────────────────────────────────
// Next.js 라우트 엔트리포인트. Editor 컴포넌트만 렌더링.
// 실제 로직은 Editor.tsx → EditorProvider 체인에 있음.

import Editor from './Editor'

export default function EditorPage() {
  return <Editor />
}

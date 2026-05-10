// /editor 접근 시 /editor/canvas로 리다이렉트
import { redirect } from 'next/navigation'

export default function EditorRootPage() {
  redirect('/editor/canvas')
}

// /ledger 접근 시 /ledger/overview로 리다이렉트
import { redirect } from 'next/navigation'

export default function LedgerRootPage() {
  redirect('/ledger/overview')
}

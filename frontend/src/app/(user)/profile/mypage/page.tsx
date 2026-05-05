'use client'

// ─── profile/mypage/page.tsx ──────────────────────────────────────────────────
// 계정 설정 페이지 (/profile/mypage).
//
// 레이아웃: 왼쪽 사이드바(nav) + 오른쪽 콘텐츠 영역
//
// 섹션:
//   - Personal Information: 이름/이메일/전화/가입일/주소
//   - Security & Privacy: 비밀번호 변경 / 2FA / 생체인증
//   - Financial Preferences: 기본 통화 / 리스크 수준 / 연결 계좌
//   - Notification Settings: 이메일/푸시/주간리포트 알림 토글
//
// 현재 실제 저장 기능 미구현 (UI 목업)

import { useState } from 'react'
import { User, Shield, BarChart2, Bell, ChevronRight, CreditCard } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useLocale } from '@/lib/i18n/LocaleContext'
import { mypageMessages } from '@/lib/i18n/authMessages'

// ─── Toggle 컴포넌트 ──────────────────────────────────────────────────────────

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn(v => !v)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${on ? 'bg-brand-dark' : 'bg-gray-200'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ─── AccountSettingsPage ──────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const [activeNav, setActiveNav] = useState('personal')
  const { user } = useAuth()
  const { locale } = useLocale()
  const t = mypageMessages[locale]

  const NAV_ITEMS = [
    { id: 'personal',  label: t.navPersonal,  icon: User      },
    { id: 'security',  label: t.navSecurity,  icon: Shield    },
    { id: 'finance',   label: t.navFinance,   icon: BarChart2 },
    { id: 'notif',     label: t.navNotif,     icon: Bell      },
  ]

  const displayName = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? '사용자'
  const email = user?.email ?? '-'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">

        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t.pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.pageSubtitle}</p>
        </div>

        <div className="flex gap-6 items-start">

          {/* ── 왼쪽 사이드바 ── */}
          <aside className="w-52 shrink-0 bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-1">
            {/* 유저 요약 */}
            <div className="flex items-center gap-3 pb-4 mb-2 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-brand-dark flex items-center justify-center text-white text-sm font-bold shrink-0">
                {displayName[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{email}</p>
              </div>
            </div>

            {/* 네비게이션 */}
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveNav(id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer text-left ${
                  activeNav === id
                    ? 'bg-green-50 text-brand-dark font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            ))}
          </aside>

          {/* ── 오른쪽 콘텐츠 ── */}
          <div className="flex-1 flex flex-col gap-5 min-w-0">

            {/* Personal Information */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-brand" />
                  <h2 className="text-base font-bold text-gray-900">{t.sectionPersonal}</h2>
                </div>
                <button type="button" className="text-sm font-semibold text-brand hover:text-brand-dark cursor-pointer">
                  {t.editAll}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                <InfoField label={t.fieldFullName}    value={displayName} />
                <InfoField label={t.fieldEmail}       value={email}       />
                <InfoField label={t.fieldPhone}       value="-"           />
                <InfoField label={t.fieldMemberSince} value={memberSince} />
                <div className="col-span-2">
                  <InfoField label={t.fieldAddress} value="-" />
                </div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-5">

              {/* Security & Privacy */}
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Shield className="size-4 text-brand" />
                  <h2 className="text-base font-bold text-gray-900">{t.sectionSecurity}</h2>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-700">{t.changePassword}</span>
                    <ChevronRight className="size-4 text-gray-400" />
                  </div>
                  <ToggleRow label={t.twoFactor} sub={t.twoFactorSub} defaultOn />
                  <ToggleRow label={t.biometric} defaultOn />
                </div>
              </section>

              {/* Financial Preferences */}
              <section className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BarChart2 className="size-4 text-brand" />
                  <h2 className="text-base font-bold text-gray-900">{t.sectionFinance}</h2>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t.defaultCurrency}</span>
                    <span className="text-sm font-semibold text-brand">USD ($)</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t.riskTolerance}</p>
                    <RiskToggle labels={[t.riskLow, t.riskModerate, t.riskHigh]} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t.linkedAccounts}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CreditCard className="size-4 text-gray-400" />
                      Chase Checking (...4902)
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Notification Settings */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Bell className="size-4 text-brand" />
                <h2 className="text-base font-bold text-gray-900">{t.sectionNotif}</h2>
              </div>
              <div className="flex flex-col divide-y divide-gray-100">
                <ToggleRow label={t.emailNotif}   sub={t.emailNotifSub}   defaultOn padded />
                <ToggleRow label={t.pushNotif}    sub={t.pushNotifSub}              padded />
                <ToggleRow label={t.weeklyReport} sub={t.weeklyReportSub} defaultOn padded />
              </div>
            </section>

            {/* 저장 버튼 */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                {t.discardChanges}
              </button>
              <button
                type="button"
                className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-dark hover:bg-brand-darker rounded-xl cursor-pointer"
              >
                {t.saveChanges}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 로컬 컴포넌트 ─────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  )
}

function ToggleRow({
  label, sub, defaultOn = false, padded = false,
}: {
  label: string; sub?: string; defaultOn?: boolean; padded?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${padded ? 'py-4' : ''}`}>
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <Toggle defaultOn={defaultOn} />
    </div>
  )
}

function RiskToggle({ labels }: { labels: [string, string, string] }) {
  const [level, setLevel] = useState<0 | 1 | 2>(1)
  return (
    <div className="flex gap-1.5">
      {labels.map((label, idx) => (
        <button
          key={label}
          type="button"
          onClick={() => setLevel(idx as 0 | 1 | 2)}
          className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            level === idx
              ? 'bg-brand-dark text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

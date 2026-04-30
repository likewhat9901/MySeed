"use client";

// ─── auth/signup/_components/ui/PasswordInput.tsx ─────────────────────────────
// 비밀번호 입력 + 눈 아이콘 토글(표시/숨기기) 공용 컴포넌트.
// SignupPanel에서 password / confirmPassword 두 필드에 각각 사용.

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}

export default function PasswordInput({
  id,
  label,
  placeholder = "••••••••",
  value,
  onChange,
  autoComplete = "current-password",
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
          className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
        >
          {show ? (
            <Eye className="size-4" strokeWidth={1.75} aria-hidden />
          ) : (
            <EyeOff className="size-4" strokeWidth={1.75} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}

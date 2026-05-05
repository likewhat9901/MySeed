"use client";

import { useRef, useState, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useLocale, type Locale } from "@/lib/i18n/LocaleContext";
import { useOutsideClick } from "@/hooks/useOutsideClick";

const LOCALES: { value: Locale; label: string; native: string }[] = [
  { value: "en", label: "English", native: "EN" },
  { value: "ko", label: "한국어",  native: "KO" },
];

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(ref, open, close);

  const current = LOCALES.find((l) => l.value === locale)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors shrink-0"
        aria-label="언어 선택"
        aria-expanded={open}
      >
        {current.native}
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {LOCALES.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => { setLocale(l.value); setOpen(false); }}
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <span>
                <span className="font-semibold text-gray-400 text-xs mr-2">{l.native}</span>
                {l.label}
              </span>
              {locale === l.value && <Check className="size-3.5 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

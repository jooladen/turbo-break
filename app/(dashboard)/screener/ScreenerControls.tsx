"use client";

import { useState, useRef, useEffect } from "react";

type AdapterType = "yahoo" | "kiwoom" | "mock";

type Props = {
  market: string;
  date: string;
  adapterType: AdapterType;
  currentPeriod: string;
  currentVolMul: string;
  currentSwRange: string;
  currentConds: string;
};

const ADAPTER_OPTIONS: Array<{ value: AdapterType; label: string }> = [
  { value: "mock", label: "Mock 데이터" },
  { value: "yahoo", label: "Yahoo Finance" },
  { value: "kiwoom", label: "키움 REST API" },
];

const STORAGE_KEY = "screener-prefs";

type Prefs = {
  market: string;
  adapter: AdapterType;
  period?: string;
  volMul?: string;
  swRange?: string;
};

const VOL_MUL_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const SW_RANGE_OPTIONS = [7, 8, 9, 10, 15, 20];

export default function ScreenerControls({ market, date, adapterType, currentPeriod, currentVolMul, currentSwRange, currentConds }: Props) {
  const [localMarket, setLocalMarket] = useState(market);
  const [localConds, setLocalConds] = useState(currentConds);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // SPA 전환(Link)으로 /screener 진입 시 localStorage 복원
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("market") || params.has("adapter")) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const prefs = JSON.parse(raw) as Record<string, string>;
      const q = new URLSearchParams();
      const keys = ["market", "adapter", "period", "volMul", "swRange"] as const;
      for (const key of keys) {
        if (prefs[key]) q.set(key, prefs[key]);
      }
      const qs = q.toString();
      if (qs) window.location.replace(`/screener?${qs}`);
    } catch {
      // localStorage 접근 실패 시 무시
    }
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      // 날짜는 저장하지 않음 — 항상 오늘 날짜가 기본값이어야 함
      const prefs: Prefs = {
        market: localMarket,
        adapter: (fd.get("adapter") as AdapterType) ?? "mock",
        period: (fd.get("period") as string) ?? "5",
        volMul: (fd.get("volMul") as string) ?? "2",
        swRange: (fd.get("swRange") as string) ?? "15",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // 저장 실패 시 무시
    }
  }

  return (
    <form
      ref={formRef}
      action="/screener"
      method="GET"
      onSubmit={handleSubmit}
      className="relative overflow-hidden flex flex-wrap items-center gap-2 p-4 bg-white/80 dark:bg-white/[0.03] backdrop-blur-sm rounded-xl border border-gray-200 dark:border-white/[0.06] mb-6"
    >
      {/* 프로그레스 바 */}
      {isLoading && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-blue-500 animate-progress" />
        </div>
      )}

      {/* 숨김 input으로 전달 */}
      <input type="hidden" name="market" value={localMarket} />
      <input type="hidden" name="conds" value={localConds} />

      <div className="flex items-center gap-1">
        {(["ALL", "KOSPI", "KOSDAQ"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setLocalMarket(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              localMarket === m
                ? "bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-sm shadow-blue-500/25"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />

      {/* 돌파 기간 */}
      <select
        name="period"
        defaultValue={currentPeriod}
        onChange={() => formRef.current?.requestSubmit()}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
      >
        <option value="1">1일 돌파</option>
        <option value="2">2일 돌파</option>
        <option value="3">3일 돌파</option>
        <option value="4">4일 돌파</option>
        <option value="5">5일 돌파</option>
        <option value="20">20일 돌파</option>
      </select>

      {/* 거래량 배수 */}
      <select
        name="volMul"
        defaultValue={currentVolMul}
        onChange={() => formRef.current?.requestSubmit()}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
      >
        {VOL_MUL_OPTIONS.map((v) => (
          <option key={v} value={v}>
            거래량 {v}배
          </option>
        ))}
      </select>

      {/* 횡보 범위 — 변경 시 sideways 조건 필터도 자동 활성화 */}
      <select
        name="swRange"
        defaultValue={currentSwRange}
        onChange={() => {
          setLocalConds((prev) => {
            const parts = prev ? prev.split(",") : ["breakout"];
            if (!parts.includes("sideways")) parts.push("sideways");
            return parts.join(",");
          });
          // setState 후 requestSubmit은 다음 렌더에서 실행
          setTimeout(() => formRef.current?.requestSubmit(), 0);
        }}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
      >
        {SW_RANGE_OPTIONS.map((v) => (
          <option key={v} value={v}>
            횡보 {v}%
          </option>
        ))}
      </select>

      <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />

      {/* 날짜 */}
      <input
        type="date"
        name="date"
        defaultValue={date}
        onChange={() => setTimeout(() => formRef.current?.requestSubmit(), 0)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
      />

      <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />

      {/* 데이터 소스 선택 */}
      <select
        name="adapter"
        defaultValue={adapterType}
        onChange={() => formRef.current?.requestSubmit()}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all"
      >
        {ADAPTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* 조회 */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all shadow-sm shadow-blue-500/25"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            조회 중...
          </>
        ) : (
          "조회"
        )}
      </button>
    </form>
  );
}

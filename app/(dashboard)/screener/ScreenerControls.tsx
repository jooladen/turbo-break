"use client";

import { useState, useRef } from "react";

type AdapterType = "yahoo" | "kiwoom" | "mock";

type Props = {
  market: string;
  date: string;
  adapterType: AdapterType;
  currentPeriod: string;
  currentVolMul: string;
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
};

const VOL_MUL_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function ScreenerControls({ market, date, adapterType, currentPeriod, currentVolMul }: Props) {
  const [localMarket, setLocalMarket] = useState(market);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      // 날짜는 저장하지 않음 — 항상 오늘 날짜가 기본값이어야 함
      const prefs: Prefs = {
        market: localMarket,
        adapter: (fd.get("adapter") as AdapterType) ?? "mock",
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
      className="relative overflow-hidden flex flex-wrap items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 mb-6"
    >
      {/* 프로그레스 바 */}
      {isLoading && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-blue-500 animate-progress" />
        </div>
      )}

      {/* 시장 선택 — 숨김 input으로 전달 */}
      <input type="hidden" name="market" value={localMarket} />

      <div className="flex items-center gap-1">
        {(["ALL", "KOSPI", "KOSDAQ"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setLocalMarket(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              localMarket === m
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* 돌파 기간 */}
      <select
        name="period"
        defaultValue={currentPeriod}
        onChange={() => formRef.current?.requestSubmit()}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {VOL_MUL_OPTIONS.map((v) => (
          <option key={v} value={v}>
            거래량 {v}배
          </option>
        ))}
      </select>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* 날짜 */}
      <input
        type="date"
        name="date"
        defaultValue={date}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* 데이터 소스 선택 */}
      <select
        name="adapter"
        defaultValue={adapterType}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
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

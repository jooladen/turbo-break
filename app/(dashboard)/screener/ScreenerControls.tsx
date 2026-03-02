"use client";

import { useState } from "react";

type AdapterType = "yahoo" | "kiwoom" | "mock";

type Props = {
  market: string;
  date: string;
  adapterType: AdapterType;
};

const ADAPTER_OPTIONS: Array<{ value: AdapterType; label: string }> = [
  { value: "mock", label: "Mock 데이터" },
  { value: "yahoo", label: "Yahoo Finance" },
  { value: "kiwoom", label: "키움 REST API" },
];

export default function ScreenerControls({ market, date, adapterType }: Props) {
  const [localMarket, setLocalMarket] = useState(market);
  const [isLoading, setIsLoading] = useState(false);

  return (
    // method="GET" → 브라우저가 직접 /screener?market=...&date=... 로 이동
    // router.push() 를 쓰면 _rsc 파라미터가 URL에 노출되는 문제 방지
    <form
      action="/screener"
      method="GET"
      onSubmit={() => setIsLoading(true)}
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

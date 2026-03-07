"use client";

import type { ScreenerResult } from "@/lib/screener-types";
import { CONDITION_KEYS, getExpertDefs } from "./screener-constants";
import { GradeBadge } from "./screener-components";

export default function ExpertPanel({ result, period, volMultiplier = 2 }: { result: ScreenerResult; period: number; volMultiplier?: number }) {
  const passCount = result.passCount;
  const total = 10;
  const expertDefs = getExpertDefs(period, volMultiplier);
  const sortedDefs = CONDITION_KEYS.map((key) => expertDefs.find((d) => d.key === key)!);

  return (
    <div className="p-5 space-y-5">
      {/* 요약 헤더 */}
      <div className="rounded-2xl bg-gray-900 dark:bg-gray-800 text-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">스크리닝 결과</p>
            <p className="text-2xl font-black">
              {passCount} <span className="text-gray-400 font-normal text-lg">/ {total}개 통과</span>
            </p>
          </div>
          <GradeBadge grade={result.buySignal.grade} score={result.buySignal.score} />
        </div>
        <div className="flex gap-1 mt-2">
          {sortedDefs.map((def) => (
            <div
              key={def.key}
              className={`flex-1 h-2 rounded-full ${result.conditions[def.key] ? "bg-red-400" : "bg-gray-600"}`}
              title={def.name}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          빨간 막대 = 통과, 회색 막대 = 미통과 (좌→우: 중요도 순)
        </p>
      </div>

      {/* 10개 지표 카드 */}
      <div className="space-y-4">
        {sortedDefs.map((def, idx) => {
          const pass = result.conditions[def.key];
          const barPct = def.getBarPct(result);
          return (
            <div
              key={def.key}
              className={`rounded-2xl border-2 overflow-hidden ${
                pass
                  ? "border-green-200 dark:border-green-900"
                  : "border-red-200 dark:border-red-900"
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-3 ${
                  pass
                    ? "bg-green-50 dark:bg-green-900/20"
                    : "bg-red-50 dark:bg-red-900/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-mono text-gray-400 dark:text-gray-500 w-5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${def.catColor}`}
                  >
                    {def.category}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                    {def.name}
                  </span>
                </div>
                <span
                  className={`text-lg font-black ${pass ? "text-green-500" : "text-red-400"}`}
                >
                  {pass ? "✅" : "❌"}
                </span>
              </div>

              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs mb-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">기준:</span>{" "}
                    {def.target}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">현재:</span>{" "}
                    {def.getCurrent(result)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pass ? "bg-green-400" : "bg-red-400"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>

              <div className="px-4 py-3 space-y-3 bg-white dark:bg-gray-900">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    📐 무엇을 측정하나
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{def.what}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    💡 왜 중요한가
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{def.why}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 mb-1">👍 좋은 수치</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{def.good}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-bold text-red-500 dark:text-red-400 mb-1">⚠️ 위험 수치</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{def.bad}</p>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-1">⚡ Pro Tip</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{def.proTip}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          📚 이 스크리너는 윌리엄 오닐(CAN SLIM), 마크 미너비니(VCP), 스탠 와인스타인(Stage Analysis)의<br />
          전략을 기반으로 설계되었습니다. 투자 결정은 항상 본인의 판단과 책임 하에 이루어져야 합니다.
        </p>
      </div>
    </div>
  );
}

"use client";

import type { BuySignal } from "@/lib/screener-types";
import { GRADE_CONFIG } from "./screener-constants";
import { toKidText, toKidWarning, getConditionInfo } from "./screener-utils";

export default function BuySignalPanel({ signal, period, volMultiplier = 2, swRange = 15 }: { signal: BuySignal; period: number; volMultiplier?: number; swRange?: number }) {
  const cfg = GRADE_CONFIG[signal.grade];
  const totalConditions = signal.positives.length + signal.warnings.length;

  return (
    <div className="p-5 space-y-6">
      {/* ── 히어로 판정 카드 ── */}
      <div className={`rounded-2xl p-5 ring-2 ${cfg.ring} ${cfg.bg}`}>
        <div className="flex items-start gap-4 mb-4">
          <div className="text-5xl leading-none flex-shrink-0">{cfg.bigEmoji}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`${cfg.verdictBg} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                {cfg.label}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {signal.positives.length}/{totalConditions}개 조건 통과
              </span>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-gray-100 mb-1">
              {cfg.verdict}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {cfg.verdictSub}
            </p>
          </div>
        </div>

        {/* 점수 바 */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
            <span>매수 적합도</span>
            <span className="font-black text-gray-800 dark:text-gray-200">{signal.score}점 / 100점</span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
              style={{ width: `${signal.score}%` }}
            />
          </div>
          <div className="relative mt-1 h-4">
            <div className="absolute left-0 text-[10px] text-gray-400">0</div>
            <div className="absolute text-[10px] text-gray-400" style={{ left: "45%" }}>45</div>
            <div className="absolute text-[10px] text-gray-400" style={{ left: "65%" }}>65</div>
            <div className="absolute text-[10px] text-gray-400" style={{ left: "80%" }}>80</div>
            <div className="absolute right-0 text-[10px] text-gray-400">100</div>
          </div>
          <div className="flex text-[10px] font-bold mt-0.5 gap-0">
            <span className="flex-[45] text-center text-gray-400">F 🚫</span>
            <span className="flex-[20] text-center text-yellow-500">C 🤔</span>
            <span className="flex-[15] text-center text-orange-500">B 👍</span>
            <span className="flex-[20] text-center text-red-500">A 🔥</span>
          </div>
        </div>
      </div>

      {/* ── 좋은 이유들 ── */}
      {signal.positives.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🟢</span>
            <p className="font-black text-gray-800 dark:text-gray-100 text-base">
              이래서 좋아요
            </p>
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {signal.positives.length}가지
            </span>
          </div>
          <div className="space-y-3">
            {signal.positives.map((raw, i) => {
              const { icon, title, story } = toKidText(raw, period);
              const info = getConditionInfo(raw, period);
              return (
                <div
                  key={i}
                  className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/40 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100/60 dark:bg-green-900/40 border-b border-green-100 dark:border-green-900/40">
                    <span className="font-mono text-xs font-bold text-green-600 dark:text-green-400 w-5">
                      {String(info.idx).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">
                      {info.name}
                    </span>
                    <span className="ml-auto text-green-500 text-xs font-bold">통과 ✅</span>
                  </div>
                  <div className="flex gap-3 px-4 py-3.5">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-1">
                        {title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {story}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 걱정되는 점들 ── */}
      {signal.warnings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔴</span>
            <p className="font-black text-gray-800 dark:text-gray-100 text-base">
              이게 걱정돼요
            </p>
            <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {signal.warnings.length}가지
            </span>
          </div>
          <div className="space-y-3">
            {signal.warnings.map((raw, i) => {
              const { icon, title, story, fix } = toKidWarning(raw, period, volMultiplier, swRange);
              const info = getConditionInfo(raw, period);
              return (
                <div
                  key={i}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-100/60 dark:bg-red-900/40 border-b border-red-100 dark:border-red-900/40">
                    <span className="font-mono text-xs font-bold text-red-500 dark:text-red-400 w-5">
                      {String(info.idx).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-bold text-red-600 dark:text-red-300">
                      {info.name}
                    </span>
                    <span className="ml-auto text-red-400 text-xs font-bold">미통과 ❌</span>
                  </div>
                  <div className="flex gap-3 px-4 py-3.5">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-1">
                        {title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
                        {story}
                      </p>
                      <div className="flex items-center gap-1.5 bg-white/60 dark:bg-gray-800/60 rounded-xl px-3 py-1.5">
                        <span className="text-sm">💡</span>
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {fix}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── C/F 등급 — "이렇게 되면 살 수 있어요" ── */}
      {(signal.grade === "C" || signal.grade === "F") && signal.warnings.length > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🗓️</span>
            <p className="font-black text-blue-800 dark:text-blue-300 text-base">
              언제 다시 보면 될까요?
            </p>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-3 leading-relaxed">
            지금 당장 사지 말고, 아래 조건들이 해결되는 날 다시 체크해봐요! 📅
          </p>
          <div className="space-y-2">
            {signal.warnings.slice(0, 3).map((raw, i) => {
              const { icon, fix } = toKidWarning(raw, period, volMultiplier, swRange);
              return (
                <div key={i} className="flex items-start gap-2.5 bg-white/70 dark:bg-gray-800/50 rounded-xl px-3 py-2.5">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium leading-snug">
                    {fix}
                  </p>
                </div>
              );
            })}
            {signal.warnings.length > 3 && (
              <p className="text-xs text-blue-500 dark:text-blue-400 text-center pt-1">
                + {signal.warnings.length - 3}가지 조건이 더 있어요
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 모든 조건 통과 ── */}
      {signal.grade === "A" && signal.warnings.length === 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-red-500 to-orange-400 p-5 text-center text-white">
          <div className="text-4xl mb-2">🏆</div>
          <p className="font-black text-lg mb-1">완벽한 종목이에요!</p>
          <p className="text-sm opacity-90">10가지 조건을 모두 통과했어요. 아주 드문 기회예요!</p>
        </div>
      )}
    </div>
  );
}

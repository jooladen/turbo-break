"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { ScreenerResult, BuyGrade, StockOHLCV } from "@/lib/screener-types";
import { getConditionMeta } from "./screener-constants";

export type SortKey = "changeRate" | "turnover" | "volume" | "passCount" | "buyScore";
export type SortDir = "asc" | "desc";

export function SortIcon({
  col, sortKey, sortDir,
}: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col)
    return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>;
  return (
    <span className="text-blue-500 dark:text-blue-400 ml-1">
      {sortDir === "desc" ? "↓" : "↑"}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score === 10
      ? "bg-blue-500"
      : score >= 8
        ? "bg-green-500"
        : score >= 6
          ? "bg-yellow-500"
          : "bg-gray-400";
  return (
    <span className={`${color} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>
      {score}점
    </span>
  );
}

export function ConditionTooltip({ condKey, period, volMultiplier = 2 }: { condKey: keyof ScreenerResult["conditions"]; period: number; volMultiplier?: number }) {
  const meta = getConditionMeta(period, volMultiplier)[condKey];
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <span
      className="inline-block cursor-help"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(152, Math.min(rect.left + rect.width / 2, window.innerWidth - 152));
        setPos({ x, y: rect.bottom + 6 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="text-gray-400 dark:text-gray-500 text-[10px] ml-0.5">?</span>
      {pos &&
        createPortal(
          <div
            className="fixed w-72 z-[9999] bg-gray-900 text-white rounded-xl shadow-2xl p-4 text-left pointer-events-none"
            style={{ top: pos.y, left: pos.x, transform: "translateX(-50%)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{meta.label}</span>
              <ScoreBadge score={meta.score} />
            </div>
            <p className="text-xs text-yellow-300 mb-2 leading-relaxed">{meta.easy}</p>
            <div className="border-t border-gray-700 mb-2" />
            <p className="text-xs text-gray-300 leading-relaxed">{meta.detail}</p>
          </div>,
          document.body,
        )}
    </span>
  );
}

export function LegendItem({
  condKey,
  index,
  period,
  volMultiplier = 2,
}: {
  condKey: keyof ScreenerResult["conditions"];
  index: number;
  period: number;
  volMultiplier?: number;
}) {
  const meta = getConditionMeta(period, volMultiplier)[condKey];
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      className="flex items-center gap-1.5 cursor-help"
      onMouseEnter={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.max(152, Math.min(rect.left + rect.width / 2, window.innerWidth - 152));
        setPos({ x, y: rect.top - 6 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-300">{meta.label}</span>
      <ScoreBadge score={meta.score} />
      {pos &&
        createPortal(
          <div
            className="fixed w-72 z-[9999] bg-gray-900 text-white rounded-xl shadow-2xl p-4 text-left pointer-events-none"
            style={{ top: pos.y, left: pos.x, transform: "translate(-50%, -100%)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{meta.label}</span>
              <ScoreBadge score={meta.score} />
            </div>
            <p className="text-xs text-yellow-300 mb-2 leading-relaxed">{meta.easy}</p>
            <div className="border-t border-gray-700 mb-2" />
            <p className="text-xs text-gray-300 leading-relaxed">{meta.detail}</p>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function PassBadge({ count }: { count: number }) {
  const color =
    count === 10
      ? "bg-blue-600 text-white"
      : count >= 8
        ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
        : count >= 5
          ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {count}/10
    </span>
  );
}

export function GradeBadge({ grade, score }: { grade: BuyGrade; score: number }) {
  const styles: Record<BuyGrade, string> = {
    A: "bg-red-500 text-white",
    B: "bg-orange-400 text-white",
    C: "bg-gray-400 dark:bg-gray-600 text-white",
    F: "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${styles[grade]}`}
    >
      <span>{grade}</span>
      <span className="opacity-80">{score}</span>
    </span>
  );
}

export function Sparkline({
  data,
  width = 60,
  height = 20,
}: {
  data: StockOHLCV[];
  width?: number;
  height?: number;
}) {
  const closes = data.slice(0, 20).reverse().map((d) => d.close);
  if (closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const pts = closes
    .map(
      (c, i) =>
        `${(i / (closes.length - 1)) * width},${
          height - ((c - min) / (max - min || 1)) * height
        }`,
    )
    .join(" ");
  const rising = closes[closes.length - 1] >= closes[0];
  return (
    <svg width={width} height={height} className="inline-block align-middle mt-1">
      <polyline
        points={pts}
        fill="none"
        stroke={rising ? "#ef4444" : "#3b82f6"}
        strokeWidth="1.5"
      />
    </svg>
  );
}

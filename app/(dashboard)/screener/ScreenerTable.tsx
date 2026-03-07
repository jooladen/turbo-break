"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ScreenerResult, ScreenerConditions, StockOHLCV } from "@/lib/screener-types";
import StockChartInteractive from "@/components/stock-chart-interactive";
import { CONDITION_KEYS, getConditionLabels } from "./screener-constants";
import { generateKeyPoint, formatTurnover, formatVolume, downloadCsv, getMetricTooltip } from "./screener-utils";
import {
  SortIcon, PassBadge, GradeBadge, ConditionTooltip, LegendItem, Sparkline,
  type SortKey, type SortDir,
} from "./screener-components";
import BuySignalPanel from "./BuySignalPanel";
import ExpertPanel from "./ExpertPanel";

type Props = {
  results: ScreenerResult[];
  date: string;
  totalScanned: number;
  histories: Record<string, StockOHLCV[]>;
  period: number;
  activeConditions: Array<keyof ScreenerConditions>;
  volMultiplier: number;
  swRange: number;
};

type ModalTab = "chart" | "beginner" | "expert";

type ChartState = {
  ticker: string;
  name: string;
  result: ScreenerResult;
} | null;

export default function ScreenerTable({ results, date, totalScanned, histories, period, activeConditions, volMultiplier, swRange }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sortKey, setSortKey] = useState<SortKey>("buyScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");

  const requiredConditions = useMemo(() => new Set(activeConditions), [activeConditions]);

  const updateConditions = useCallback(
    (nextConds: Array<keyof ScreenerConditions>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("conds", nextConds.join(","));
      router.push(`/screener?${params.toString()}`);
    },
    [router, searchParams],
  );
  const [chart, setChart] = useState<ChartState>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("chart");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("screener-watchlist") ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  function toggleWatchlist(ticker: string) {
    setWatchlist((prev) => {
      const next = prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      localStorage.setItem("screener-watchlist", JSON.stringify(next));
      return next;
    });
  }

  const condLabels = useMemo(() => getConditionLabels(period), [period]);

  const sorted = useMemo(() => {
    const filtered = results.filter((r) => {
      if (marketFilter !== "ALL" && r.market !== marketFilter) return false;
      const isWatched = watchlist.includes(r.ticker);
      if (watchlistOnly && !isWatched) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      // 1차: 돌파 종목 우선
      const aB = a.conditions.breakout ? 1 : 0;
      const bB = b.conditions.breakout ? 1 : 0;
      if (aB !== bB) return bB - aB;
      // 2차: 선택된 정렬 기준
      const v = sortDir === "desc" ? -1 : 1;
      if (sortKey === "buyScore") {
        return (a.buySignal.score - b.buySignal.score) * v;
      }
      return (a[sortKey] - b[sortKey]) * v;
    });
  }, [results, sortKey, sortDir, marketFilter, watchlistOnly, watchlist]);

  const topStocks = useMemo(
    () =>
      sorted
        .filter((r) => r.conditions.breakout && (r.buySignal.grade === "A" || r.buySignal.grade === "B"))
        .slice(0, 3),
    [sorted],
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function openChart(r: ScreenerResult) {
    setChart({ ticker: r.ticker, name: r.name, result: r });
    setActiveTab("chart");
  }

  const th =
    "px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap";
  const thBtn =
    "px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none";

  return (
    <>
      <div className="space-y-3">
        {/* 필터 바 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 시장 + 통과조건 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "KOSPI", "KOSDAQ"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  marketFilter === m
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                {m}
              </button>
            ))}

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

            {CONDITION_KEYS.map((key) => {
              const checked = requiredConditions.has(key);
              const isLocked = key === "breakout" || key === "sideways";
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isLocked) return;
                    const next = new Set(requiredConditions);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    updateConditions([...next]);
                  }}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isLocked
                      ? "bg-red-500 text-white cursor-default opacity-90"
                      : checked
                        ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                        : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  {isLocked ? `🔒 ${condLabels[key]}` : `${condLabels[key]}${checked ? "✓" : ""}`}
                </button>
              );
            })}

            <button
              onClick={() => updateConditions([...CONDITION_KEYS])}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
            >
              전체
            </button>
            <button
              onClick={() => updateConditions(["breakout"])}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              초기화
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

            <button
              onClick={() => setWatchlistOnly((w) => !w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                watchlistOnly
                  ? "bg-yellow-400 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              ⭐ 관심{(() => { const c = results.filter((r) => watchlist.includes(r.ticker) && (marketFilter === "ALL" || r.market === marketFilter)).length; return c > 0 ? ` (${c})` : ""; })()}
            </button>
          </div>

          {/* 우측: 카운트 + CSV */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {sorted.length}
              <span className="text-gray-400 dark:text-gray-500">/{totalScanned}</span>
            </span>
            <button
              onClick={() => downloadCsv(sorted, date, period)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <span>CSV</span>
              <span className="text-xs">↓</span>
            </button>
          </div>
        </div>

        {/* TOP 3 추천 카드 */}
        {topStocks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              ⭐ 오늘의 추천 종목
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {topStocks.map((r) => {
                const isWatchlisted = watchlist.includes(r.ticker);
                return (
                  <div
                    key={r.ticker}
                    className={`rounded-xl border-2 p-4 cursor-pointer transition-shadow hover:shadow-md ${
                      r.buySignal.grade === "A"
                        ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20"
                        : "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/20"
                    }`}
                    onClick={() => openChart(r)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GradeBadge grade={r.buySignal.grade} score={r.buySignal.score} />
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            r.market === "KOSPI"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                          }`}
                        >
                          {r.market}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(r.ticker);
                        }}
                        className="text-lg leading-none text-yellow-400 hover:text-yellow-500 transition-colors"
                      >
                        {isWatchlisted ? "★" : "☆"}
                      </button>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      {r.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-snug">
                      {r.buySignal.summary}
                    </p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-1">
                      {generateKeyPoint(r.metrics, r.buySignal.grade, period)}
                    </p>
                    <span
                      className={`text-xs font-medium ${
                        r.changeRate >= 0 ? "text-red-500" : "text-blue-500"
                      }`}
                    >
                      {r.changeRate >= 0 ? "+" : ""}
                      {r.changeRate.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 안내 */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          행을 클릭하면 차트를 볼 수 있습니다
        </p>

        {/* 테이블 */}
        {sorted.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-lg">
              조건에 맞는 종목이 없습니다
            </p>
            <p className="text-gray-300 dark:text-gray-600 text-sm mt-1">
              필터 조건을 낮춰보세요
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className={th}>★</th>
                    <th className={th}>종목</th>
                    <th className={th}>시장</th>
                    <th className={th}>종가</th>
                    <th className={thBtn} onClick={() => handleSort("changeRate")}>
                      등락률
                      <SortIcon col="changeRate" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thBtn} onClick={() => handleSort("turnover")}>
                      거래대금
                      <SortIcon col="turnover" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thBtn} onClick={() => handleSort("volume")}>
                      거래량
                      <SortIcon col="volume" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    <th className={thBtn} onClick={() => handleSort("buyScore")}>
                      매수신호
                      <SortIcon col="buyScore" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                    {CONDITION_KEYS.map((k) => {
                      const labels = getConditionLabels(period);
                      return (
                        <th key={k} className={th}>
                          <span className="hidden lg:inline">{labels[k]}</span>
                          <span className="lg:hidden">{labels[k].slice(0, 2)}</span>
                          <ConditionTooltip condKey={k} period={period} volMultiplier={volMultiplier} swRange={swRange} />
                        </th>
                      );
                    })}
                    <th className={thBtn} onClick={() => handleSort("passCount")}>
                      통과
                      <SortIcon col="passCount" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {sorted.map((r, idx) => {
                    const rowBg =
                      r.buySignal.grade === "A"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : r.buySignal.grade === "B"
                          ? "bg-orange-50 dark:bg-orange-950/20"
                          : "";
                    const isBreakout = r.conditions.breakout;
                    const prevIsBreakout = idx > 0 && sorted[idx - 1].conditions.breakout;
                    const isBoundary = !isBreakout && prevIsBreakout;
                    return (
                      <tr
                        key={r.ticker}
                        onClick={() => openChart(r)}
                        className={`hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer ${rowBg} ${isBreakout ? "border-l-[3px] border-l-red-500" : ""} ${isBoundary ? "border-t-2 border-t-gray-300 dark:border-t-gray-600" : ""}`}
                      >
                        <td
                          className="px-2 py-3 whitespace-nowrap text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => toggleWatchlist(r.ticker)}
                            className="text-lg leading-none text-yellow-400 hover:text-yellow-500 transition-colors"
                          >
                            {watchlist.includes(r.ticker) ? "★" : "☆"}
                          </button>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {r.name}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/intraday?ticker=${r.ticker}`);
                              }}
                              className="text-xs px-1.5 py-0.5 rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shrink-0"
                            >
                              📊 ORB
                            </button>
                          </div>
                          <div className="text-gray-400 dark:text-gray-500 text-xs font-mono">
                            {r.ticker}
                          </div>
                          {histories[r.ticker] && histories[r.ticker].length >= 2 && (
                            <Sparkline data={histories[r.ticker]} />
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              r.market === "KOSPI"
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                : "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                            }`}
                          >
                            {r.market}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                          {r.close.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`text-sm font-semibold ${
                              r.changeRate >= 0
                                ? "text-red-500 dark:text-red-400"
                                : "text-blue-500 dark:text-blue-400"
                            }`}
                          >
                            {r.changeRate >= 0 ? "+" : ""}
                            {r.changeRate.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {formatTurnover(r.turnover)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {formatVolume(r.volume)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <GradeBadge grade={r.buySignal.grade} score={r.buySignal.score} />
                        </td>
                        {CONDITION_KEYS.map((k) => (
                          <td key={k} className="px-3 py-3 whitespace-nowrap text-center">
                            <span
                              title={getMetricTooltip(k, r, volMultiplier, swRange)}
                              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold cursor-help ${
                                r.conditions[k]
                                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                                  : "bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-500"
                              }`}
                            >
                              {r.conditions[k] ? "✓" : "✗"}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <PassBadge count={r.passCount} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 조건 범례 */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            스크리닝 조건
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {CONDITION_KEYS.map((k, i) => (
              <LegendItem key={k} condKey={k} index={i} period={period} volMultiplier={volMultiplier} swRange={swRange} />
            ))}
          </div>
        </div>
      </div>

      {/* 차트/분석 모달 */}
      {chart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setChart(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                    {chart.name}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 font-mono text-sm ml-2">
                    {chart.ticker}
                  </span>
                </div>
                <GradeBadge grade={chart.result.buySignal.grade} score={chart.result.buySignal.score} />
              </div>
              <button
                onClick={() => setChart(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            {/* 탭 */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 flex-shrink-0">
              {(
                [
                  { id: "chart", label: "📊 차트" },
                  { id: "beginner", label: "🐣 왕초보 분석" },
                  { id: "expert", label: "📚 중고급 분석" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div className="overflow-y-auto flex-1">
              {activeTab === "chart" && (
                <>
                  <div className="p-4">
                    {histories[chart.ticker] && histories[chart.ticker].length > 0 ? (
                      <StockChartInteractive data={histories[chart.ticker]} period={period} queryDate={date} volMultiplier={volMultiplier} />
                    ) : (
                      <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                        차트 데이터가 없습니다
                      </div>
                    )}
                  </div>
                  <div className="px-5 pb-4 text-xs text-gray-400 dark:text-gray-500 text-right">
                    최근 60일 일봉 • Yahoo Finance
                  </div>
                </>
              )}
              {activeTab === "beginner" && (
                <BuySignalPanel signal={chart.result.buySignal} period={period} volMultiplier={volMultiplier} swRange={swRange} />
              )}
              {activeTab === "expert" && (
                <ExpertPanel result={chart.result} period={period} volMultiplier={volMultiplier} swRange={swRange} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

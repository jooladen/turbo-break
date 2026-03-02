"use client";

import { useState, useMemo } from "react";
import type { ScreenerResult, StockOHLCV } from "@/lib/screener-types";
import StockChartInteractive from "@/components/stock-chart-interactive";

type SortKey = "changeRate" | "turnover" | "volume" | "passCount";
type SortDir = "asc" | "desc";

const CONDITION_LABELS: Record<keyof ScreenerResult["conditions"], string> = {
  breakout20: "20일 돌파",
  sideways: "횡보",
  volumeSurge: "거래량↑",
  tailFilter: "윗꼬리",
  turnoverMin: "거래대금",
  aboveMA60: "MA60↑",
  notOverheated: "과열X",
  bullish: "양봉",
  noGap: "갭X",
  notOverbought5d: "5일급등X",
};

const CONDITION_KEYS = Object.keys(CONDITION_LABELS) as Array<
  keyof ScreenerResult["conditions"]
>;

const PASS_FILTERS = [
  { label: "전체", min: 0 },
  { label: "5+", min: 5 },
  { label: "7+", min: 7 },
  { label: "8+", min: 8 },
  { label: "10 (완전)", min: 10 },
] as const;

function formatTurnover(turnover: number): string {
  if (turnover >= 1_000_000_000_000)
    return `${(turnover / 1_000_000_000_000).toFixed(1)}조`;
  if (turnover >= 100_000_000)
    return `${Math.floor(turnover / 100_000_000).toLocaleString()}억`;
  return `${Math.floor(turnover / 10_000).toLocaleString()}만`;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toLocaleString();
}

function downloadCsv(results: ScreenerResult[], date: string) {
  const headers = [
    "종목코드", "종목명", "시장", "종가", "등락률", "거래량", "거래대금",
    ...CONDITION_KEYS.map((k) => CONDITION_LABELS[k]),
    "통과조건수",
  ];
  const rows = results.map((r) => [
    r.ticker, r.name, r.market, r.close, r.changeRate.toFixed(2),
    r.volume, r.turnover,
    ...CONDITION_KEYS.map((k) => (r.conditions[k] ? "O" : "X")),
    r.passCount,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `screener_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SortIcon({
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

// passCount에 따른 배지 색상
function PassBadge({ count }: { count: number }) {
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

type Props = {
  results: ScreenerResult[];
  date: string;
  totalScanned: number;
  histories: Record<string, StockOHLCV[]>;
};

type ChartState = {
  ticker: string;
  name: string;
} | null;

export default function ScreenerTable({ results, date, totalScanned, histories }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("passCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");
  const [minPass, setMinPass] = useState(0);
  const [chart, setChart] = useState<ChartState>(null);

  const sorted = useMemo(() => {
    const filtered = results.filter((r) => {
      if (marketFilter !== "ALL" && r.market !== marketFilter) return false;
      if (r.passCount < minPass) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const v = sortDir === "desc" ? -1 : 1;
      return (a[sortKey] - b[sortKey]) * v;
    });
  }, [results, sortKey, sortDir, marketFilter, minPass]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function openChart(r: ScreenerResult) {
    setChart({ ticker: r.ticker, name: r.name });
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

            {PASS_FILTERS.map((f) => (
              <button
                key={f.min}
                onClick={() => setMinPass(f.min)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  minPass === f.min
                    ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 우측: 카운트 + CSV */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalScanned.toLocaleString()}종목 중{" "}
              <strong className="text-gray-900 dark:text-gray-100">{sorted.length}종목</strong>
            </span>
            <button
              onClick={() => downloadCsv(sorted, date)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <span>CSV</span>
              <span className="text-xs">↓</span>
            </button>
          </div>
        </div>

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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
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
                    {CONDITION_KEYS.map((k) => (
                      <th key={k} className={th} title={CONDITION_LABELS[k]}>
                        <span className="hidden lg:inline">{CONDITION_LABELS[k]}</span>
                        <span className="lg:hidden">{CONDITION_LABELS[k].slice(0, 2)}</span>
                      </th>
                    ))}
                    <th className={thBtn} onClick={() => handleSort("passCount")}>
                      통과
                      <SortIcon col="passCount" sortKey={sortKey} sortDir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {sorted.map((r) => (
                    <tr
                      key={r.ticker}
                      onClick={() => openChart(r)}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {r.name}
                        </div>
                        <div className="text-gray-400 dark:text-gray-500 text-xs font-mono">
                          {r.ticker}
                        </div>
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
                      {CONDITION_KEYS.map((k) => (
                        <td key={k} className="px-3 py-3 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
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
                  ))}
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
              <div key={k} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {CONDITION_LABELS[k]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 차트 모달 */}
      {chart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setChart(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                  {chart.name}
                </span>
                <span className="text-gray-400 dark:text-gray-500 font-mono text-sm ml-2">
                  {chart.ticker}
                </span>
              </div>
              <button
                onClick={() => setChart(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            {/* 차트 */}
            <div className="p-4">
              {histories[chart.ticker] && histories[chart.ticker].length > 0 ? (
                <StockChartInteractive data={histories[chart.ticker]} />
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                  차트 데이터가 없습니다
                </div>
              )}
            </div>

            <div className="px-5 pb-4 text-xs text-gray-400 dark:text-gray-500 text-right">
              최근 60일 일봉 • Yahoo Finance
            </div>
          </div>
        </div>
      )}
    </>
  );
}

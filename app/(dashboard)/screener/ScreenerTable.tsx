"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
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

// 중요도 순 정렬
const CONDITION_KEYS: Array<keyof ScreenerResult["conditions"]> = [
  "breakout20",
  "sideways",
  "volumeSurge",
  "aboveMA60",
  "turnoverMin",
  "notOverbought5d",
  "noGap",
  "notOverheated",
  "bullish",
  "tailFilter",
];

type ConditionMeta = {
  label: string;
  score: number;
  easy: string;
  detail: string;
};

const CONDITION_META: Record<keyof ScreenerResult["conditions"], ConditionMeta> = {
  breakout20: {
    label: "20일 돌파",
    score: 10,
    easy: "주가가 지난 20일 중 가장 높은 가격을 넘어섰어요! 마치 오랫동안 막혀있던 댐이 드디어 터지는 순간이에요 🚀",
    detail:
      "20일 저항선 돌파는 이 전략의 핵심 진입 시그널입니다. 박스권 상단 돌파 시 매집된 물량이 소화되며 강한 상승 에너지가 분출됩니다. 기관·외국인 매수세가 본격 유입되는 신호로, 추세 전환의 시작점입니다. 역사적으로 가장 높은 수익률을 기록한 진입 패턴 중 하나입니다.",
  },
  sideways: {
    label: "횡보",
    score: 9,
    easy: "주가가 오랫동안 조용히 비슷한 가격 범위에서 움직였어요. 스프링이 꾹 눌려 있다가 튀어오르기 직전 같은 상태예요 🌀",
    detail:
      "돌파 전 충분한 에너지가 응축됐다는 증거입니다. 20일간 주가 변동폭이 ±15% 이내로 유지됐다는 것은 매도 물량이 소화되고 저점 매수자들이 물량을 쌓아왔다는 신호입니다. 횡보 기간이 길수록 돌파 후 상승 폭도 커지는 경향이 있습니다. 갑자기 급등한 종목보다 훨씬 안전한 진입 패턴입니다.",
  },
  volumeSurge: {
    label: "거래량↑",
    score: 9,
    easy: "오늘 거래량이 평소보다 2배 이상 많아요! 많은 사람들이 동시에 '이 주식 사야겠다!'고 판단한 거예요 📊",
    detail:
      "거래량은 돌파의 신뢰성을 검증하는 핵심 필터입니다. 거래량이 20일 평균의 2배 이상이면 개인·기관·외국인 모두가 적극 매수에 참여했다는 증거입니다. 거래량 없는 돌파는 '가짜 돌파(False Breakout)'일 가능성이 높아 곧 되돌림이 발생합니다. 수급이 동반된 돌파만이 지속적인 상승으로 이어집니다.",
  },
  aboveMA60: {
    label: "MA60↑",
    score: 8,
    easy: "주가가 최근 3개월 평균 가격보다 위에 있어요. 비유하자면 성적이 꾸준히 평균 이상을 유지하는 우등생 같은 주식이에요 📈",
    detail:
      "60일 이동평균선은 약 3개월 추세를 나타내며, 중장기 상승 추세 확인에 사용합니다. 이 선 위에 있다는 것은 중기적으로 매수세가 매도세를 압도하고 있다는 의미입니다. MA60 아래에서의 돌파는 하락 추세 중 단순 반등일 가능성이 높습니다. 반드시 MA60 위에서 이뤄지는 돌파만 유효한 신호로 판단합니다.",
  },
  turnoverMin: {
    label: "거래대금",
    score: 8,
    easy: "하루에 500억 원 이상 거래됐어요. 거래가 활발해야 내가 사고 싶을 때 사고, 팔고 싶을 때 팔 수 있어요 💰",
    detail:
      "거래대금 500억 미만 종목은 유동성 부족으로 매수 시 가격이 크게 튀거나 매도 시 원하는 가격에 팔지 못하는 슬리피지가 발생합니다. 기관투자자들이 관심을 갖기 위한 최소 기준이기도 합니다. 거래대금이 낮은 종목은 소수 세력의 시세 조종 위험도 있어 필터링합니다. 실제 매매 가능성을 보장하는 유동성 기준입니다.",
  },
  notOverbought5d: {
    label: "5일급등X",
    score: 7,
    easy: "최근 5일 동안 이미 많이 오르지 않았는지 확인해요. 이미 많이 오른 주식을 뒤늦게 사면 꼭대기에서 사는 꼴이 될 수 있거든요 ⚠️",
    detail:
      "최근 5일간 15% 이상 급등한 종목은 단기 차익실현 매물이 대기 중입니다. 뒤늦게 진입하면 고점 매수가 될 확률이 높습니다. 진정한 돌파 종목은 조용히 횡보하다가 특정 시점에 처음으로 강하게 오르는 것이 이상적입니다. 추격매수의 덫을 피하는 안전장치입니다.",
  },
  noGap: {
    label: "갭X",
    score: 7,
    easy: "아침에 주식시장이 열릴 때 전날 종가와 크게 다르지 않게 시작했어요. 갑자기 훌쩍 높은 가격에서 시작하면 위험할 수 있어요 🕳️",
    detail:
      "시가가 전일 종가보다 3% 이상 높게 시작하면 이미 많은 사람이 매수해있는 상태입니다. 갭 상승은 기대감이 선반영된 것으로 추가 상승 여력이 줄어들고 되돌림 위험이 높습니다. 갭 없이 자연스럽게 상승하는 종목이 안정적인 진입 기회를 제공합니다. 시초가 리스크를 제거하는 필터입니다.",
  },
  notOverheated: {
    label: "과열X",
    score: 6,
    easy: "오늘 하루에만 너무 많이 오르지 않았는지 확인해요. 하루에 8% 넘게 오르면 흥분한 사람들이 무작정 산 것일 수 있어요 🌡️",
    detail:
      "당일 상승률이 8% 이상이면 단기 투기 세력이 몰린 과열 상태입니다. 이런 종목은 다음 날 차익실현 매물로 급락하는 경우가 많습니다. 건강한 돌파는 5~7% 수준에서 안정적으로 마감하는 것이 이상적입니다. 단기 과열에 의한 고점 진입을 방지합니다.",
  },
  bullish: {
    label: "양봉",
    score: 6,
    easy: "오늘 주가가 아침 시작 가격보다 높게 마감했어요. 하루 종일 사려는 사람이 팔려는 사람보다 많았다는 뜻이에요 ✅",
    detail:
      "양봉은 시가보다 종가가 높은 것으로, 당일 매수세가 매도세를 압도했음을 나타냅니다. 장중 내내 매수세가 살아있었다는 직접적인 증거입니다. 음봉 돌파는 장중 한때만 신고가를 찍고 매도 압력에 밀린 것으로 신뢰도가 낮습니다. 당일 매수 우위를 확인하는 기본 필터입니다.",
  },
  tailFilter: {
    label: "윗꼬리",
    score: 5,
    easy: "장 마감 가격이 오늘 최고 가격과 거의 같아요. 끝까지 팔려는 사람 없이 강하게 마감했다는 신호예요 🎯",
    detail:
      "종가가 당일 고가의 99% 이상이면 장 마감까지 매도 압력이 없었다는 뜻입니다. 윗꼬리가 긴 종목은 고점에서 차익실현 매물이 쏟아진 것으로 다음 날 하락 전환 가능성을 시사합니다. 특히 거래량이 많은 날의 긴 윗꼬리는 강한 매도 신호로 해석됩니다. 고점에서의 매도 압력 부재를 확인합니다.",
  },
};

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

function ScoreBadge({ score }: { score: number }) {
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

function ConditionTooltip({ condKey }: { condKey: keyof ScreenerResult["conditions"] }) {
  const meta = CONDITION_META[condKey];
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

function LegendItem({
  condKey,
  index,
}: {
  condKey: keyof ScreenerResult["conditions"];
  index: number;
}) {
  const meta = CONDITION_META[condKey];
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
                      <th key={k} className={th}>
                        <span className="hidden lg:inline">{CONDITION_LABELS[k]}</span>
                        <span className="lg:hidden">{CONDITION_LABELS[k].slice(0, 2)}</span>
                        <ConditionTooltip condKey={k} />
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
              <LegendItem key={k} condKey={k} index={i} />
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

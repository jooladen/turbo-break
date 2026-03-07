"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { ScreenerResult, StockOHLCV, BuyGrade, BuySignal, SignalMetrics } from "@/lib/screener-types";
import StockChartInteractive from "@/components/stock-chart-interactive";

type SortKey = "changeRate" | "turnover" | "volume" | "passCount" | "buyScore";
type SortDir = "asc" | "desc";

function generateKeyPoint(m: SignalMetrics, _grade: BuyGrade, period: number): string {
  if (m.volumeMultiple >= 5) return `거래량 ${m.volumeMultiple.toFixed(1)}배 폭발 💥`;
  if (m.volumeMultiple >= 3) return `거래량 ${m.volumeMultiple.toFixed(1)}배로 큰손 유입 🔥`;
  if (m.sidewaysRange < 6) return `${m.sidewaysRange.toFixed(1)}% 초좁은 횡보 후 돌파 🎯`;
  if (m.breakoutPct > 3) return `${period}일 고가를 ${m.breakoutPct.toFixed(1)}% 강하게 돌파 🚀`;
  if (m.sidewaysRange < 10) return `${m.sidewaysRange.toFixed(1)}% 횡보 끝에 에너지 폭발 ⚡`;
  if (m.ma60Distance < 3) return `60일선 바로 위 황금 자리 ✨`;
  return `${m.volumeMultiple.toFixed(1)}배 거래량으로 상승 확인 📈`;
}

function getConditionLabels(period: number): Record<keyof ScreenerResult["conditions"], string> {
  return {
    breakout20: `${period}일 돌파`,
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
}

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

function getConditionMeta(period: number): Record<keyof ScreenerResult["conditions"], ConditionMeta> {
  const periodLabel = period === 5 ? "일주일" : "한 달";
  return {
  breakout20: {
    label: `${period}일 돌파`,
    score: 10,
    easy: `주가가 지난 ${period}일 중 가장 높은 가격을 넘어섰어요! 마치 오랫동안 막혀있던 댐이 드디어 터지는 순간이에요 🚀`,
    detail:
      `${period}일 저항선 돌파는 이 전략의 핵심 진입 시그널입니다. 박스권 상단 돌파 시 매집된 물량이 소화되며 강한 상승 에너지가 분출됩니다. 기관·외국인 매수세가 본격 유입되는 신호로, 추세 전환의 시작점입니다. 역사적으로 가장 높은 수익률을 기록한 진입 패턴 중 하나입니다.`,
  },
  sideways: {
    label: "횡보",
    score: 9,
    easy: `주가가 ${periodLabel} 동안 조용히 비슷한 가격 범위에서 움직였어요. 스프링이 꾹 눌려 있다가 튀어오르기 직전 같은 상태예요 🌀`,
    detail:
      `돌파 전 충분한 에너지가 응축됐다는 증거입니다. ${period}일간 주가 변동폭이 ±15% 이내로 유지됐다는 것은 매도 물량이 소화되고 저점 매수자들이 물량을 쌓아왔다는 신호입니다. 횡보 기간이 길수록 돌파 후 상승 폭도 커지는 경향이 있습니다. 갑자기 급등한 종목보다 훨씬 안전한 진입 패턴입니다.`,
  },
  volumeSurge: {
    label: "거래량↑",
    score: 9,
    easy: `오늘 거래량이 평소보다 2배 이상 많아요! 많은 사람들이 동시에 '이 주식 사야겠다!'고 판단한 거예요 📊`,
    detail:
      `거래량은 돌파의 신뢰성을 검증하는 핵심 필터입니다. 거래량이 ${period}일 평균의 2배 이상이면 개인·기관·외국인 모두가 적극 매수에 참여했다는 증거입니다. 거래량 없는 돌파는 '가짜 돌파(False Breakout)'일 가능성이 높아 곧 되돌림이 발생합니다. 수급이 동반된 돌파만이 지속적인 상승으로 이어집니다.`,
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
}

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

function downloadCsv(results: ScreenerResult[], date: string, period: number) {
  const labels = getConditionLabels(period);
  const headers = [
    "종목코드", "종목명", "시장", "종가", "등락률", "거래량", "거래대금",
    ...CONDITION_KEYS.map((k) => labels[k]),
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

function ConditionTooltip({ condKey, period }: { condKey: keyof ScreenerResult["conditions"]; period: number }) {
  const meta = getConditionMeta(period)[condKey];
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
  period,
}: {
  condKey: keyof ScreenerResult["conditions"];
  index: number;
  period: number;
}) {
  const meta = getConditionMeta(period)[condKey];
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

function GradeBadge({ grade, score }: { grade: BuyGrade; score: number }) {
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

const GRADE_CONFIG: Record<
  BuyGrade,
  {
    emoji: string; bigEmoji: string; label: string;
    verdict: string; verdictSub: string;
    bg: string; ring: string; bar: string; verdictBg: string;
  }
> = {
  A: {
    emoji: "🔥", bigEmoji: "🚀",
    label: "강력 추천",
    verdict: "지금 살 수 있어요!",
    verdictSub: "조건을 거의 다 통과한 아주 좋은 종목이에요. 마치 시험에서 100점 맞은 것처럼요! 😄",
    bg: "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20",
    ring: "ring-red-400 dark:ring-red-500",
    bar: "bg-gradient-to-r from-red-400 to-orange-400",
    verdictBg: "bg-red-500",
  },
  B: {
    emoji: "👍", bigEmoji: "😊",
    label: "괜찮아요",
    verdict: "살 만한 종목이에요",
    verdictSub: "대부분의 조건을 통과했어요. 시험으로 치면 80점대 우등생! 조심만 하면 괜찮아요 👌",
    bg: "bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/20",
    ring: "ring-orange-400 dark:ring-orange-500",
    bar: "bg-gradient-to-r from-orange-400 to-yellow-400",
    verdictBg: "bg-orange-400",
  },
  C: {
    emoji: "🤔", bigEmoji: "⏳",
    label: "좀 더 기다려요",
    verdict: "아직은 애매해요",
    verdictSub: "몇 가지 조건이 부족해요. 서두르지 말고 조금 더 지켜보는 게 좋겠어요 🙏",
    bg: "bg-gradient-to-br from-yellow-50 to-gray-50 dark:from-yellow-900/20 dark:to-gray-800/30",
    ring: "ring-yellow-300 dark:ring-yellow-700",
    bar: "bg-gradient-to-r from-yellow-400 to-gray-400",
    verdictBg: "bg-yellow-500",
  },
  F: {
    emoji: "🚫", bigEmoji: "😬",
    label: "사지 마세요",
    verdict: "지금은 위험해요",
    verdictSub: "여러 조건이 빠져 있어요. 지금 샀다가는 손해볼 가능성이 높아요. 패스! ✋",
    bg: "bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/30",
    ring: "ring-gray-300 dark:ring-gray-600",
    bar: "bg-gray-300 dark:bg-gray-600",
    verdictBg: "bg-gray-500",
  },
};

// ── 초딩용 긍정 설명 ──
function toKidText(raw: string, period: number): { icon: string; title: string; story: string } {
  const periodLabel = period === 5 ? "일주일" : "한 달";
  const map: Array<[RegExp, (m: RegExpMatchArray) => { icon: string; title: string; story: string }]> = [
    [
      new RegExp(`${period}일 고가를 ([\\d.]+)% 상향 돌파`),
      (m) => ({
        icon: "🚀",
        title: `${periodLabel} 동안 못 넘던 가격 벽을 오늘 드디어 뚫었어요! (+${m[1]}%)`,
        story: `비유하면 이래요: 우리 동네에 아주 유명한 떡볶이 가게가 있는데, 항상 줄이 너무 길어서 못 들어갔어요. 그런데 오늘 드디어 줄이 없어서 바로 들어갈 수 있게 된 거예요! 주식도 마찬가지예요. ${period}일 동안 "이 가격이면 팔겠다"는 사람들이 막고 있던 벽이 오늘 완전히 뚫렸어요. 이걸 전문용어로 "저항선 돌파"라고 해요. 이 앱에서 가장 중요한 신호예요 🏆`,
      }),
    ],
    [
      /거래량 평균 대비 ([\d.]+)배/,
      (m) => ({
        icon: "🎉",
        title: `오늘 평소보다 ${m[1]}배나 많은 사람들이 이 주식을 샀어요!`,
        story: `평소에 하루 10만 명이 사던 주식을 오늘은 ${Math.round(parseFloat(m[1]) * 10)}만 명이 샀다는 뜻이에요. 마치 평소엔 조용하던 유튜브 영상이 갑자기 알고리즘 추천을 타서 조회수가 터진 것 같은 상황이에요! 많은 사람이 동시에 "이거다!" 하고 달려들었다는 건 가짜 상승이 아닌 진짜 관심이라는 뜻이에요. 특히 기업 임원, 대형 투자자들도 포함됐을 가능성이 높아요 💥`,
      }),
    ],
    [
      new RegExp(`${period}일 박스권 범위 ([\\d.]+)%`),
      (m) => ({
        icon: "🌀",
        title: `${periodLabel} 동안 가격이 ${m[1]}% 범위 안에서 아주 조용히 움직였어요`,
        story: `스프링을 손으로 꾹꾹 누르고 있다고 상상해봐요. 누를수록 나중에 더 세게 튀어오르죠? 이 주식이 딱 그 상태였어요. ${periodLabel} 동안 가격이 별로 안 움직이면서 에너지를 조용히 쌓고 있었던 거예요. 오늘 그 스프링이 풀린 거예요! 오래 조용했던 종목일수록 돌파 후 더 크게 오르는 경우가 많아요 💪`,
      }),
    ],
    [
      /MA60 대비 ([\d.]+)% 위/,
      (m) => ({
        icon: "📈",
        title: `최근 3달 평균 가격보다 ${m[1]}% 위에 있어요 — 꾸준히 오르는 종목!`,
        story: `학교 중간고사 평균 점수가 70점인데 이 학생은 항상 ${m[1]}점 이상 더 받는 우등생 같은 거예요. 3달(60일) 동안 평균적으로 사고판 가격보다 지금 가격이 높다는 건, 이 주식을 3달 전에 산 사람들이 지금 이익을 보고 있다는 뜻이에요. 이익을 보는 사람이 많으면 주식이 더 올라가는 경향이 있어요 🌟`,
      }),
    ],
    [
      /거래대금 500억 이상/,
      () => ({
        icon: "💰",
        title: `오늘 하루에만 500억 원 이상 거래됐어요 — 언제든 팔 수 있어요!`,
        story: `500억 원이 얼마나 큰 돈이냐면, 1만 원짜리 지폐 500만 장을 쌓으면 약 50미터 높이가 돼요! 그만큼 많은 돈이 오늘 하루 이 주식에서 왔다갔다 했어요. 이게 왜 좋냐면, 내가 팔고 싶을 때 바로 팔 수 있거든요. 거래가 적으면 사줄 사람이 없어서 팔리지 않는 경우가 생겨요. 마치 시장에서 인기 많은 물건은 쉽게 팔리지만, 아무도 안 사는 물건은 못 파는 것처럼요 🏪`,
      }),
    ],
    [
      /5일 누적 ([\d.]+)% 상승/,
      (m) => ({
        icon: "✅",
        title: `최근 5일 동안 ${m[1]}%밖에 안 올랐어요 — 아직 기회가 있어요!`,
        story: `주식을 살 때 가장 위험한 건 이미 너무 많이 오른 걸 사는 거예요. 마치 인기 아이돌 콘서트 암표를 정가의 10배에 사는 것처럼요. 이 주식은 최근 5일 동안 ${m[1]}%밖에 안 올랐어요. 아직 많이 안 올랐으니까 지금 사도 늦지 않았다는 신호예요. 버스가 막 출발하려는 순간에 탄 것처럼요! 🚌`,
      }),
    ],
    [
      /당일 등락률 ([\d.]+)%/,
      (m) => ({
        icon: "🌿",
        title: `오늘 딱 ${m[1]}% 올랐어요 — 너무 급하지 않고 건강해요!`,
        story: `하루에 너무 많이(8% 이상) 오르면 오히려 위험해요. 흥분한 사람들이 생각 없이 막 산 거일 수 있거든요. 그런 주식은 다음 날 와르르 떨어지기 쉬워요. 이 주식은 오늘 ${m[1]}% 올랐는데, 이건 마치 100미터 달리기를 전력질주가 아니라 적당한 페이스로 뛰는 것 같아요. 내일도 계속 달릴 여력이 있다는 뜻이에요 🏃‍♂️`,
      }),
    ],
    [
      /갭 없이 자연스러운/,
      () => ({
        icon: "🌅",
        title: `오늘 아침 주식시장이 열릴 때 가격이 갑자기 뛰지 않았어요!`,
        story: `매일 아침 9시에 주식시장이 열려요. 이때 어떤 주식은 전날 마감 가격보다 훨씬 높은 가격에서 갑자기 시작하는 경우가 있어요. 이걸 "갭 상승"이라고 해요. 이러면 이미 너무 늦어요. 이 주식은 갑자기 뛰지 않고 자연스럽게 시작했어요. 마치 인기 있는 가게인데 웨이팅 없이 바로 들어갈 수 있는 것처럼요 😊`,
      }),
    ],
    [
      /양봉 마감/,
      () => ({
        icon: "🟢",
        title: `오늘 하루 내내 사려는 사람이 팔려는 사람보다 더 많았어요!`,
        story: `주식은 사려는 사람이 많으면 가격이 오르고, 팔려는 사람이 많으면 가격이 내려요. 오늘 아침 시작 가격보다 저녁 마감 가격이 더 높다는 건, 하루 종일 "이 주식 갖고 싶다!"는 사람이 "빨리 팔고 싶다!"는 사람보다 많았다는 뜻이에요. 투표로 치면 찬성표가 반대표보다 많이 나온 거예요 🗳️`,
      }),
    ],
    [
      /윗꼬리 없이 강하게 마감/,
      () => ({
        icon: "💪",
        title: `오늘 가장 높은 가격 근처에서 그대로 마감했어요 — 끝까지 강해요!`,
        story: `어떤 주식은 오늘 낮에 높이 올랐다가 마감 때는 다시 내려오는 경우가 있어요. 이걸 "윗꼬리"라고 해요. 이 주식은 높이 올라간 채로 그대로 장을 마쳤어요. 마치 달리기 선수가 결승선 직전에 힘이 빠지지 않고 끝까지 전속력으로 달린 것 같아요. 내일도 이 기세가 이어질 가능성이 높아요 🏅`,
      }),
    ],
  ];

  for (const [pattern, fn] of map) {
    const m = raw.match(pattern);
    if (m) return fn(m);
  }
  return { icon: "✅", title: raw.split(" — ")[0], story: raw.split(" — ")[1] ?? "" };
}

// ── 초딩용 경고 설명 ──
function toKidWarning(raw: string, period: number): { icon: string; title: string; story: string; fix: string } {
  const periodLabel = period === 5 ? "일주일" : "한 달";
  const map: Array<[RegExp, (m: RegExpMatchArray) => { icon: string; title: string; story: string; fix: string }]> = [
    [
      new RegExp(`${period}일 돌파 미달`),
      () => ({
        icon: "🚧",
        title: "아직 가장 중요한 가격 벽을 못 넘었어요",
        story: `${periodLabel} 동안 가장 높은 가격이라는 '담장'이 있는데 아직 그걸 못 넘었어요. 담장 안에 맛있는 과일이 있는데 아직 못 들어간 상태예요. 담장을 넘는 날이 바로 매수 타이밍이에요! 이게 이 앱에서 가장 중요한 조건이에요.`,
        fix: `오늘 종가가 최근 ${period}일 최고가를 넘는 날 다시 확인해보세요!`,
      }),
    ],
    [
      /거래량 부족.*평균 ([\d.]+)배/,
      (m) => ({
        icon: "👻",
        title: `아직 많은 사람들이 관심을 안 가지고 있어요 (평균의 ${m[1]}배)`,
        story: `가격이 올랐는데 거래량이 적으면 위험해요. 마치 아무도 없는 놀이공원에서 갑자기 롤러코스터가 움직이는 것처럼 뭔가 이상해요. 진짜로 많은 사람이 사야 진짜 상승이에요. 지금은 평균의 ${m[1]}배밖에 안 돼서 아직 2배가 안 됐어요.`,
        fix: "거래량이 평소의 2배 이상 되는 날을 기다리세요! 그날이 진짜 신호예요.",
      }),
    ],
    [
      /횡보 범위 초과.*?([\d.]+)%/,
      (m) => ({
        icon: "🎢",
        title: `가격이 최근 ${periodLabel} 동안 ${m[1]}%나 들쑥날쑥했어요`,
        story: `요즘 이 주식 가격이 롤러코스터처럼 오르락내리락 했어요. 좋은 돌파 신호가 나오려면 먼저 가격이 좁은 범위에서 조용히 안정됐다가 한 번에 터져야 해요. 에너지가 충분히 응축되지 않은 상태라 오늘 오른 것도 일시적일 수 있어요.`,
        fix: "가격이 15% 이내 좁은 범위에서 조용히 움직이다가 터지는 날을 기다려요!",
      }),
    ],
    [
      /MA60 하회/,
      () => ({
        icon: "📉",
        title: "3달 평균보다 낮은 가격에 있어요 — 전체 흐름이 하락 중이에요",
        story: "3달 전부터 지금까지 평균 가격보다 현재 가격이 낮아요. 학교 성적으로 치면 최근 3달 평균이 70점인데 지금 60점인 상태예요. 전체적인 방향이 아래로 향하고 있을 때 샀다가는 더 내려갈 수 있어요. 수영장에서 물이 빠져나가는 중인데 수영하려는 것 같아요 🏊",
        fix: "3달 평균 가격(MA60)을 다시 넘어오는 날 다시 체크하세요!",
      }),
    ],
    [
      /거래대금 부족/,
      () => ({
        icon: "🏜️",
        title: "하루 거래 금액이 500억도 안 돼요 — 팔고 싶을 때 못 팔 수 있어요",
        story: "거래가 적으면 내가 팔고 싶어도 사줄 사람이 없을 수 있어요. 마치 사막 한가운데서 아이스크림을 파는 것처럼요. 사는 사람은 없고 나만 있는 거예요. 주식은 살 때뿐만 아니라 팔 때도 쉬워야 해요. 이건 아주 중요해요!",
        fix: "하루 거래금액이 500억 원이 넘는 종목을 기다리세요! 그래야 안전해요.",
      }),
    ],
    [
      /5일 누적 ([\d.]+)% 급등/,
      (m) => ({
        icon: "⚡",
        title: `이미 5일 만에 ${m[1]}%나 올랐어요 — 버스가 이미 떠났을 수 있어요`,
        story: `5일 동안 ${m[1]}%나 올랐다는 건 이미 많이 올라버린 거예요. 인기 드라마 마지막 화를 보고 나서 "이 드라마 대박이래!"하고 1화부터 보러가는 것 같아요. 내용은 알겠는데 이미 끝난 거잖아요. 지금 사면 꼭대기에서 사는 꼴이 될 수 있어요.`,
        fix: "조금 쉬었다가 다시 오르기 시작할 때를 기다려요. 한번 쉬면 더 건강하게 올라요!",
      }),
    ],
    [
      /당일 ([\d.]+)% 급등/,
      (m) => ({
        icon: "🌋",
        title: `오늘 하루에만 ${m[1]}%나 폭발적으로 올랐어요 — 과열 상태예요`,
        story: `${m[1]}%가 얼마나 많냐면, 만약 이 주식을 어제 100만 원어치 샀으면 오늘 하루 만에 ${m[1]}만 원이 늘어난 거예요! 이렇게 하루에 많이 오르면 흥분한 사람들이 생각 없이 산 경우가 많아요. 그 흥분이 가라앉으면 다시 내려와요. 뜨거운 라면처럼 조금 식힌 다음에 먹어야 해요 🍜`,
        fix: "오늘처럼 크게 오른 날 사지 말고, 며칠 지켜보다가 안정될 때 사세요!",
      }),
    ],
    [
      /갭 상승.*\+([\d.]+)%/,
      (m) => ({
        icon: "😱",
        title: `아침에 이미 ${m[1]}% 높은 가격에서 시작했어요 — 기회를 놓쳤을 수 있어요`,
        story: `오늘 아침 9시에 주식시장이 열렸는데, 어젯밤 마감 가격보다 ${m[1]}% 높게 시작했어요. 이 말은 오늘 새벽부터 이미 많은 사람이 이 주식을 사놨다는 뜻이에요. 놀이공원 오픈런처럼 이미 줄 서고 들어간 사람들이 있어요. 지금 사면 이미 오른 가격에 사는 거예요.`,
        fix: "갑자기 높게 시작하지 않고 자연스럽게 시작하는 날 다시 체크하세요!",
      }),
    ],
    [
      /음봉 마감/,
      () => ({
        icon: "😞",
        title: "오늘 팔려는 사람이 사려는 사람보다 더 많았어요",
        story: "오늘 아침 시작 가격보다 저녁 마감 가격이 낮아요. 하루 종일 '이 주식 팔고 싶다'는 사람이 더 많았다는 뜻이에요. 반찬을 보여줬더니 아이들이 손을 안 드는 것 같아요. 오늘만큼은 인기가 없었어요. 주식이 오르려면 사려는 사람이 더 많아야 해요.",
        fix: "시작 가격보다 마감 가격이 높은 날(양봉)이 나올 때 다시 보세요!",
      }),
    ],
    [
      /윗꼬리 존재.*?([\d.]+)%/,
      (m) => ({
        icon: "🎣",
        title: "오늘 높이 올랐다가 마감 때 다시 내려왔어요",
        story: `오늘 낮에 많이 올랐는데, 그 높은 가격(고가)에서 "이 정도면 팔아야지!"하는 사람들이 쏟아져서 가격이 다시 내려왔어요. 지금 종가가 고가의 ${m[1]}% 수준이에요. 낚싯대를 세게 던졌는데 물고기가 도망간 것 같아요. 힘이 조금 빠진 거예요.`,
        fix: "높이 올라가도 안 내려오고 그 가격 근처에서 마감하는 날(고가 대비 99% 이상)을 기다려요!",
      }),
    ],
  ];

  for (const [pattern, fn] of map) {
    const m = raw.match(pattern);
    if (m) return fn(m);
  }
  return {
    icon: "⚠️",
    title: raw.split(" — ")[0],
    story: raw.split(" — ")[1] ?? "",
    fix: "조건이 충족되면 다시 확인해봐요!",
  };
}

// ── 중고급 전문가 패널 ──
type ExpertDef = {
  key: keyof ScreenerResult["conditions"];
  name: string;
  category: "추세" | "수급" | "모멘텀" | "리스크";
  catColor: string;
  target: string;
  getCurrent: (r: ScreenerResult) => string;
  getBarPct: (r: ScreenerResult) => number; // 0~100, 100이 이상적
  what: string;
  why: string;
  good: string;
  bad: string;
  proTip: string;
};

function getExpertDefs(period: number): ExpertDef[] {
  const periodDesc = period === 5 ? "약 1주" : "약 1달";
  return [
  {
    key: "breakout20",
    name: `${period}일 고가 돌파`,
    category: "추세",
    catColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    target: `돌파율 > 0% (종가 > 최근 ${period}일 최고가)`,
    getCurrent: (r) =>
      r.metrics.breakoutPct >= 0
        ? `+${r.metrics.breakoutPct.toFixed(2)}% 돌파 ✅`
        : `${r.metrics.breakoutPct.toFixed(2)}% 미달 ❌`,
    getBarPct: (r) => Math.min(100, Math.max(0, 50 + r.metrics.breakoutPct * 10)),
    what: `최근 ${period}거래일(${periodDesc}) 동안 형성된 가격 저항선을 오늘 종가가 돌파했는지 확인합니다. 종가 기준으로 판단하며, 장중 일시 돌파는 인정하지 않습니다.`,
    why: "윌리엄 오닐의 CAN SLIM 전략에서 핵심 매수 시그널입니다. 가격이 저항선을 돌파할 때는 그동안 해당 가격에서 팔려던 매도세가 완전히 소화된 상태를 의미합니다. 이후 오버헤드 공급(overhead supply)이 없어져 상승이 가속됩니다.",
    good: "돌파율이 1~5%면 이상적. 너무 작으면(0%대) 힘이 약하고, 너무 크면(8%+) 갭 상승과 겹칠 수 있습니다.",
    bad: "음수면 아직 저항선 아래 — 미돌파 상태. 가짜 돌파(false breakout) 방지를 위해 다음 날도 저항선 위에서 마감하는지 확인 권장.",
    proTip: `돌파 당일 거래량이 ${period}일 평균의 2배 이상이어야 신뢰도 상승. 거래량 없는 돌파의 60% 이상은 되돌림 발생.`,
  },
  {
    key: "sideways",
    name: "박스권 횡보 (VCP)",
    category: "추세",
    catColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    target: `${period}일 변동폭 ≤ 15% (고가-저가)/저가`,
    getCurrent: (r) =>
      `변동폭 ${r.metrics.sidewaysRange.toFixed(1)}% (기준: ≤ 15%) ${r.conditions.sideways ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - (r.metrics.sidewaysRange / 15) * 100)),
    what: `최근 ${period}일 동안 최고가와 최저가의 차이가 저가 대비 15% 이내인지 확인합니다. 이를 VCP(Volatility Contraction Pattern) 또는 박스권 패턴이라 합니다.`,
    why: "마크 미너비니가 체계화한 VCP는 돌파 전 변동성이 수축되는 구간입니다. 이 기간 동안 약한 손(weak hands)의 물량이 소화되고, 강한 손(strong hands)이 매집합니다. 수축이 길수록 돌파 후 상승 에너지도 커집니다.",
    good: `5~10% 범위가 이상적. 범위가 좁을수록 에너지가 더 응축된 상태.`,
    bad: "15% 초과 = 변동성 과다, 방향성 없음. 20% 이상이면 하락 추세 중 반등일 가능성 높음.",
    proTip: "횡보 기간 중 거래량이 점차 줄어드는 패턴(Volume Dry-up)이 함께 나타나면 더욱 강력한 신호입니다.",
  },
  {
    key: "volumeSurge",
    name: "거래량 폭증",
    category: "수급",
    catColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    target: `당일 거래량 ≥ ${period}일 평균 × 2배`,
    getCurrent: (r) =>
      `${period}일 평균 대비 ${r.metrics.volumeMultiple.toFixed(1)}배 ${r.conditions.volumeSurge ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, (r.metrics.volumeMultiple / 5) * 100),
    what: `당일 거래량이 ${period}일 평균 거래량의 2배 이상인지 확인합니다. 거래량은 매수·매도 모두 포함한 총 체결량입니다.`,
    why: "거래량은 주가의 연료입니다. 기관·외국인·세력의 대량 매수는 반드시 거래량 증가를 수반합니다. 이를 'Accumulation Day'라 하며, 스탠 와인스타인의 Stage Analysis에서도 Stage 2 상승 구간의 필수 요건입니다.",
    good: "2배는 최소 기준. 3배 이상이면 강한 매수 집중. 5배 이상이면 비정상적 수급 유입 — 대형 이벤트 또는 기관 매집 가능성.",
    bad: "2배 미만 돌파는 'False Breakout' 확률 60% 이상. 다음 1~3거래일 내 되돌림 확인 필요.",
    proTip: "돌파 이후 2~3일 동안 거래량이 평균 이상을 유지하면 'Follow-Through Day' 개념에 부합 — 추세 지속 신뢰도 상승.",
  },
  {
    key: "tailFilter",
    name: "윗꼬리 필터",
    category: "수급",
    catColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    target: "종가 ≥ 당일 고가 × 99% (윗꼬리 최소화)",
    getCurrent: (r) =>
      `종가/고가 = ${r.metrics.tailRatio.toFixed(1)}% (기준: ≥ 99%) ${r.conditions.tailFilter ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, (r.metrics.tailRatio - 95) * 20)),
    what: "캔들차트에서 종가가 당일 고가의 99% 이상인지 확인합니다. 고가 대비 종가 비율이 낮을수록 '윗꼬리(upper shadow)'가 길어집니다.",
    why: "윗꼬리가 길면 장중 고점에서 대량 매도(차익실현)가 발생했다는 의미입니다. 특히 돌파 날에 긴 윗꼬리가 나타나면 저항선 근처에서 공급이 강하다는 경고 신호입니다. 'Shooting Star' 캔들 패턴이 이에 해당합니다.",
    good: "99~100%가 이상적 = 종가 ≈ 고가 = 'Closing Strong'. 강한 매수세가 장 마감까지 유지된 것.",
    bad: "95% 미만이면 위험 신호. 장중 5% 이상 되돌림 = 매도 압력 강함. 특히 거래량 많은 날의 긴 윗꼬리는 천장 신호.",
    proTip: "종가와 고가가 정확히 일치(100%)하면 최고의 신호. '마루보주(Marubozu)' 캔들이 이상적 형태입니다.",
  },
  {
    key: "turnoverMin",
    name: "거래대금 기준",
    category: "수급",
    catColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    target: "일 거래대금 ≥ 500억 원",
    getCurrent: (r) =>
      `${(r.turnover / 1e8).toFixed(0)}억 원 (기준: ≥ 500억) ${r.conditions.turnoverMin ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, (r.turnover / 5e10) * 100),
    what: "당일 총 거래대금(체결금액)이 500억 원 이상인지 확인합니다. 거래대금 = 거래량 × 가격으로, 실제 시장에서 움직인 금액입니다.",
    why: "기관투자자(펀드, 연기금 등)가 한 종목에서 의미 있는 포지션을 구축하려면 최소 수십억 원의 주문이 필요합니다. 거래대금 500억 미만 종목은 기관 참여가 어려워 지속적인 상승 동력이 부족합니다. 또한 슬리피지(slippage) 없이 매매할 수 있는 최소 유동성 기준이기도 합니다.",
    good: "500억~3000억: 적절한 유동성. 3000억 이상: 대형주 수준의 유동성. 기관 수급 유입 가능성 높음.",
    bad: "500억 미만: 소형주·테마주 특성. 세력에 의한 시세 조종 위험. 호가 스프레드가 넓어 매매 비용 증가.",
    proTip: "거래대금이 평소보다 5~10배 폭증하면 '빅 플레이어(Big Player)'의 진입 가능성. 이는 거래량 폭증과 함께 가장 강력한 수급 신호입니다.",
  },
  {
    key: "aboveMA60",
    name: "60일 이동평균선 위",
    category: "추세",
    catColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    target: "종가 > MA60 (이격도 > 0%)",
    getCurrent: (r) =>
      `MA60 대비 ${r.metrics.ma60Distance >= 0 ? "+" : ""}${r.metrics.ma60Distance.toFixed(1)}% ${r.conditions.aboveMA60 ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 50 + r.metrics.ma60Distance * 5)),
    what: "현재 종가가 최근 60거래일 종가의 단순이동평균(SMA60)보다 높은지 확인합니다. MA60은 약 3개월간의 평균 매입 단가를 나타냅니다.",
    why: "스탠 와인스타인의 Stage Analysis에서 Stage 2(상승 구간)의 핵심 조건은 주가가 30주 이동평균선(=MA150) 위에 있는 것입니다. MA60은 그보다 단기적인 중기 추세 확인용입니다. MA60 아래에서의 돌파는 하락 추세 중 일시적 반등(Dead Cat Bounce)일 가능성이 높습니다.",
    good: "0~10%: 건강한 이격. 10~20%: 강한 상승 추세. 단, 20% 이상이면 이격 과다로 조정 가능성 있음.",
    bad: "음수 = MA60 하회 = 중기 하락 추세. 특히 MA60이 기울어져 내려가고 있으면 더욱 위험한 신호.",
    proTip: "MA60과 MA20이 모두 상향 기울기인 상태에서 주가가 두 선 위에 있을 때 돌파가 나오면 최상의 조건입니다. '골든 크로스' 이후 첫 번째 돌파에 주목하세요.",
  },
  {
    key: "notOverheated",
    name: "과열 방지 (당일 상승률)",
    category: "리스크",
    catColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    target: "당일 상승률 < 8% (전일 종가 대비)",
    getCurrent: (r) =>
      `당일 ${r.metrics.changeRate >= 0 ? "+" : ""}${r.metrics.changeRate.toFixed(2)}% (기준: < 8%) ${r.conditions.notOverheated ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - (r.metrics.changeRate / 8) * 100)),
    what: "당일 종가가 전일 종가 대비 8% 미만으로 상승했는지 확인합니다. 8% 이상 급등 종목을 필터링합니다.",
    why: "당일 8% 이상 급등은 단기 투기 세력(스캘퍼, 모멘텀 트레이더)의 과도한 참여를 의미합니다. 이들은 당일 or 익일 차익실현 매물을 대량으로 내놓습니다. 또한 8%+ 종목은 상한가(+30%) 근처에서 거래되는 경우가 많아 다음 날 갭 하락 위험이 있습니다.",
    good: "3~5%: 이상적인 돌파 등락률. 거래량이 충분하다면 5~7%도 허용 가능. 힘 있는 돌파이면서 과열은 아닌 구간.",
    bad: "8% 이상: 단기 과열. 익일 또는 그날 중 되돌림 가능성 높음. 15% 이상: 상한가 접근, 추격 절대 금지.",
    proTip: "돌파 당일 5~6% 상승 + 거래량 3배 이상의 조합이 가장 이상적인 패턴입니다. 이후 2~3% 조정 후 재상승을 매수 기회로 삼을 수 있습니다.",
  },
  {
    key: "bullish",
    name: "양봉 확인",
    category: "모멘텀",
    catColor: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    target: "종가 > 시가 (당일 양봉 마감)",
    getCurrent: (r) =>
      r.conditions.bullish
        ? `양봉 마감 — 종가 > 시가 ✅`
        : `음봉 마감 — 종가 < 시가 ❌`,
    getBarPct: (r) => (r.conditions.bullish ? 100 : 10),
    what: "당일 시가(장 시작 가격)보다 종가(장 마감 가격)가 높은지 확인합니다. 이를 '양봉'이라 하며, 차트에서 붉은색(한국 기준) 캔들로 표시됩니다.",
    why: "양봉은 당일 매수세가 매도세를 압도했다는 직접적인 증거입니다. 돌파 당일 음봉이 나타나면 장중 고점에서 대량 매도가 있었다는 의미로, 돌파의 신뢰도가 크게 떨어집니다. 'Closing Price Reversal'이라고도 합니다.",
    good: "양봉의 실체(body)가 클수록 좋음. 시가 대비 종가 상승폭 5% 이상이면 강한 매수 의지 확인.",
    bad: "음봉 돌파는 장중 매도 압력이 강하다는 신호. 특히 거래량 많은 날의 음봉은 하락 반전 가능성 경고.",
    proTip: "시가에서 거의 변화 없이 종가에 급등하는 'Closing Strong' 패턴이 가장 강력합니다. 이는 장 마감 직전 기관의 대량 매수를 시사합니다.",
  },
  {
    key: "noGap",
    name: "갭 상승 제한",
    category: "리스크",
    catColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    target: "시가 ≤ 전일 종가 × 103% (갭 ≤ 3%)",
    getCurrent: (r) =>
      `갭 ${(r.metrics.gapRatio - 100) >= 0 ? "+" : ""}${(r.metrics.gapRatio - 100).toFixed(1)}% (기준: ≤ 3%) ${r.conditions.noGap ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - ((r.metrics.gapRatio - 100) / 3) * 100)),
    what: "당일 시가가 전일 종가 대비 3% 이상 높게 시작하지 않았는지 확인합니다. 시가/전일종가 × 100 - 100 = 갭 상승률.",
    why: "3% 이상 갭 상승은 전날 밤 또는 아침에 이미 대량 매수가 이루어진 상태입니다. 이 경우 기대감이 가격에 선반영되어 추가 상승 여력이 감소합니다. 또한 갭 상승 후 '갭 메우기(Gap Fill)' 현상으로 되돌림이 발생하는 경우가 많습니다.",
    good: "0~1%: 완벽. 1~2%: 양호. 2~3%: 허용 범위. 갭이 없을수록 추가 상승 여력이 큽니다.",
    bad: "3% 이상: 추격매수 위험 구간. 5% 이상: 과도한 선반영 — 익일 갭 하락 가능성. 특히 급락 후 단기 반등 시 갭 상승은 함정.",
    proTip: "3% 이상 갭 상승한 날 매수를 참고, 갭을 메우고 다시 올라오는 날(Pull-back after Gap)이 더 안전한 매수 타이밍입니다.",
  },
  {
    key: "notOverbought5d",
    name: "5일 누적 상승 제한",
    category: "리스크",
    catColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    target: "직전 5거래일 누적 상승률 ≤ 15%",
    getCurrent: (r) =>
      `5일 누적 ${r.metrics.gain5d >= 0 ? "+" : ""}${r.metrics.gain5d.toFixed(1)}% (기준: ≤ 15%) ${r.conditions.notOverbought5d ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - (r.metrics.gain5d / 15) * 100)),
    what: "직전 5거래일(약 1주일) 동안 누적 상승률이 15% 이하인지 확인합니다. 5일 전 종가 대비 어제 종가 기준으로 계산합니다.",
    why: "단기간 급등 후 진입은 가장 흔한 실수 중 하나입니다. 15% 이상 단기 급등 종목은 단기 차익실현 매물이 대기하고 있으며, 기술적 저항선(이동평균선 이격 과다)도 형성됩니다. '추격매수'라 불리며 손실 확률이 통계적으로 높습니다.",
    good: "0~7%: 건강한 상승. 7~12%: 약간 과열, 주의 필요. 12~15%: 경계 구간, 신중하게 접근.",
    bad: "15% 초과: 단기 과매수. RSI 70+ 구간과 유사. 평균 3~7거래일 내 조정 발생 가능성 높음.",
    proTip: "15% 이상 급등 후 3~5일 조정(가격 또는 시간 조정)을 거친 뒤 다시 상승 시도가 나타날 때가 더 안전한 매수 기회입니다. 이를 'Pullback Entry'라 합니다.",
  },
  ];
}

function ExpertPanel({ result, period }: { result: ScreenerResult; period: number }) {
  const passCount = result.passCount;
  const total = 10;
  // 메인 화면(CONDITION_KEYS)과 동일한 순서로 정렬
  const expertDefs = getExpertDefs(period);
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
        {/* 10칸 통과 바 */}
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
              {/* 카드 헤더 */}
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

              {/* 현재값 vs 기준 */}
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
                {/* 게이지 바 */}
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pass ? "bg-green-400" : "bg-red-400"
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>

              {/* 교육 콘텐츠 */}
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

      {/* 하단 안내 */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          📚 이 스크리너는 윌리엄 오닐(CAN SLIM), 마크 미너비니(VCP), 스탠 와인스타인(Stage Analysis)의<br />
          전략을 기반으로 설계되었습니다. 투자 결정은 항상 본인의 판단과 책임 하에 이루어져야 합니다.
        </p>
      </div>
    </div>
  );
}

// raw 텍스트 → 조건 번호·이름 (CONDITION_KEYS 순서 기준)
function getConditionRawPatterns(period: number): Record<keyof ScreenerResult["conditions"], RegExp> {
  return {
    breakout20: new RegExp(`${period}일 고가를|${period}일 돌파 미달`),
    sideways: /박스권 범위|횡보 범위/,
    volumeSurge: /거래량 평균 대비|거래량 부족/,
    aboveMA60: /MA60/,
    turnoverMin: /500억/,
    notOverbought5d: /5일 누적/,
    noGap: /갭 없이|갭 상승/,
    notOverheated: /당일 등락률|당일.*급등/,
    bullish: /양봉 마감|음봉 마감/,
    tailFilter: /윗꼬리 없이|윗꼬리 존재/,
  };
}

function getConditionInfo(raw: string, period: number): { idx: number; name: string } {
  const patterns = getConditionRawPatterns(period);
  const labels = getConditionLabels(period);
  for (const [i, key] of CONDITION_KEYS.entries()) {
    if (patterns[key].test(raw)) {
      return { idx: i + 1, name: labels[key] };
    }
  }
  return { idx: 0, name: "" };
}

function BuySignalPanel({ signal, period }: { signal: BuySignal; period: number }) {
  const cfg = GRADE_CONFIG[signal.grade];
  const totalConditions = signal.positives.length + signal.warnings.length;

  return (
    <div className="p-5 space-y-6">
      {/* ── 히어로 판정 카드 ── */}
      <div className={`rounded-2xl p-5 ring-2 ${cfg.ring} ${cfg.bg}`}>
        {/* 상단: 이모지 + 판정 */}
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
          {/* 등급 구간 표시 */}
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
                  {/* 번호 + 조건명 헤더 */}
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
              const { icon, title, story, fix } = toKidWarning(raw, period);
              const info = getConditionInfo(raw, period);
              return (
                <div
                  key={i}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-2xl overflow-hidden"
                >
                  {/* 번호 + 조건명 헤더 */}
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
              const { icon, fix } = toKidWarning(raw, period);
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

// ── 조건 수치 툴팁 ──────────────────────────────────────────────
function getMetricTooltip(
  condKey: keyof ScreenerResult["conditions"],
  r: ScreenerResult,
): string {
  const m = r.metrics;
  switch (condKey) {
    case "breakout20":
      return `${m.breakoutPct >= 0 ? "+" : ""}${m.breakoutPct.toFixed(1)}% 돌파 / 기준: 0% 초과`;
    case "sideways":
      return `범위 ${m.sidewaysRange.toFixed(1)}% / 기준: 15% 이하`;
    case "volumeSurge":
      return `${m.volumeMultiple.toFixed(1)}배 / 기준: 2배 이상`;
    case "aboveMA60":
      return `MA60 대비 ${m.ma60Distance >= 0 ? "+" : ""}${m.ma60Distance.toFixed(1)}% / 기준: 0% 초과`;
    case "turnoverMin":
      return `${(r.turnover / 1e8).toFixed(0)}억 / 기준: 500억`;
    case "notOverbought5d":
      return `5일 누적 ${m.gain5d >= 0 ? "+" : ""}${m.gain5d.toFixed(1)}% / 기준: 15% 이하`;
    case "notOverheated":
      return `당일 ${m.changeRate >= 0 ? "+" : ""}${m.changeRate.toFixed(1)}% / 기준: 8% 미만`;
    case "noGap":
      return `갭 ${(m.gapRatio - 100) >= 0 ? "+" : ""}${(m.gapRatio - 100).toFixed(1)}% / 기준: 3% 이하`;
    case "bullish":
      return r.conditions.bullish ? "종가 > 시가 (양봉)" : "종가 ≤ 시가 (음봉)";
    case "tailFilter":
      return `윗꼬리 비율 ${m.tailRatio.toFixed(1)}% / 기준: 99% 이상`;
  }
}

// ── 스파크라인 ────────────────────────────────────────────────────
function Sparkline({
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

type Props = {
  results: ScreenerResult[];
  date: string;
  totalScanned: number;
  histories: Record<string, StockOHLCV[]>;
  period: number;
};

type ModalTab = "chart" | "beginner" | "expert";

type ChartState = {
  ticker: string;
  name: string;
  result: ScreenerResult;
} | null;

export default function ScreenerTable({ results, date, totalScanned, histories, period }: Props) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("buyScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [marketFilter, setMarketFilter] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL");
  const [minPass, setMinPass] = useState(5);
  const [chart, setChart] = useState<ChartState>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("chart");
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("screener-watchlist") ?? "[]") as string[];
      setWatchlist(saved);
    } catch {
      // ignore
    }
  }, []);

  function toggleWatchlist(ticker: string) {
    setWatchlist((prev) => {
      const next = prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      localStorage.setItem("screener-watchlist", JSON.stringify(next));
      return next;
    });
  }

  const sorted = useMemo(() => {
    const filtered = results.filter((r) => {
      if (marketFilter !== "ALL" && r.market !== marketFilter) return false;
      if (r.passCount < minPass) return false;
      if (watchlistOnly && !watchlist.includes(r.ticker)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      // 1차: 돌파 종목 우선
      const aB = a.conditions.breakout20 ? 1 : 0;
      const bB = b.conditions.breakout20 ? 1 : 0;
      if (aB !== bB) return bB - aB;
      // 2차: 선택된 정렬 기준
      const v = sortDir === "desc" ? -1 : 1;
      if (sortKey === "buyScore") {
        return (a.buySignal.score - b.buySignal.score) * v;
      }
      return (a[sortKey] - b[sortKey]) * v;
    });
  }, [results, sortKey, sortDir, marketFilter, minPass, watchlistOnly, watchlist]);

  const topStocks = useMemo(
    () =>
      sorted
        .filter((r) => r.conditions.breakout20 && (r.buySignal.grade === "A" || r.buySignal.grade === "B"))
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

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />

            <button
              onClick={() => setWatchlistOnly((w) => !w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                watchlistOnly
                  ? "bg-yellow-400 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              ⭐ 관심{watchlist.length > 0 ? ` (${watchlist.length})` : ""}
            </button>
          </div>

          {/* 우측: 카운트 + CSV */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalScanned.toLocaleString()}종목 중{" "}
              <strong className="text-gray-900 dark:text-gray-100">{sorted.length}종목</strong>
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
                          <ConditionTooltip condKey={k} period={period} />
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
                    const isBreakout = r.conditions.breakout20;
                    const prevIsBreakout = idx > 0 && sorted[idx - 1].conditions.breakout20;
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
                              title={getMetricTooltip(k, r)}
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
              <LegendItem key={k} condKey={k} index={i} period={period} />
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
                      <StockChartInteractive data={histories[chart.ticker]} period={period} queryDate={date} />
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
                <BuySignalPanel signal={chart.result.buySignal} period={period} />
              )}
              {activeTab === "expert" && (
                <ExpertPanel result={chart.result} period={period} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

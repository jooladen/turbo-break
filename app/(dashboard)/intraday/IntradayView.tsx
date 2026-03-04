"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import type { MinuteBar } from "@/lib/intraday-types";
import { calculateVwap, calculateOrb, detectOrbBreakout, calcAvgVolume } from "@/lib/intraday-calc";

const KST_OFFSET_SEC = 9 * 3600; // UTC+9

/** "HH:MM" → Unix timestamp (KST 오늘 기준) */
function timeToTs(timeStr: string): UTCTimestamp {
  const [hh, mm] = timeStr.split(":").map(Number);
  const now = new Date();
  const todayKst = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // KST 기준 오늘 시작 → UTC로 변환
  const utcStart = todayKst - KST_OFFSET_SEC * 1000;
  return Math.floor((utcStart + (hh * 3600 + (mm ?? 0) * 60) * 1000) / 1000) as UTCTimestamp;
}

const ORB_PERIOD_OPTIONS = [5, 15, 30] as const;
type OrbPeriod = (typeof ORB_PERIOD_OPTIONS)[number];

type Props = {
  ticker: string;
  name: string;
  bars: MinuteBar[];
  orbPeriod: number;
};

export default function IntradayView({ ticker, name, bars, orbPeriod: initialPeriod }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [orbPeriod, setOrbPeriod] = useState<OrbPeriod>(
    (ORB_PERIOD_OPTIONS.includes(initialPeriod as OrbPeriod)
      ? initialPeriod
      : 5) as OrbPeriod,
  );

  // ── 계산 ──────────────────────────────────────────────────────────
  const vwap = calculateVwap(bars);
  const orb = calculateOrb(bars, orbPeriod);
  const avgVol = calcAvgVolume(bars);
  const signal = detectOrbBreakout(bars, orb, avgVol);

  const lastBar = bars[bars.length - 1];
  const currentVwap = vwap[vwap.length - 1]?.value ?? 0;
  // 신호 시점의 VWAP (진입 봉 기준)
  const vwapAtSignal = signal ? (vwap.find((v) => v.time === signal.time)?.value ?? 0) : 0;

  // ── 진입 후 최고가 수익률 계산 ──────────────────────────────────
  const maxProfitInfo = (() => {
    if (!signal) return null;
    const postBars = bars.filter((b) => b.time >= signal.time);
    if (postBars.length === 0) return null;
    if (signal.type === "LONG") {
      const maxHigh = Math.max(...postBars.map((b) => b.high));
      const peakBar = postBars.find((b) => b.high === maxHigh)!;
      const pct = ((maxHigh - signal.price) / signal.price) * 100;
      return { extremePrice: maxHigh, peakTime: peakBar.time, pct, label: "진입 → 당일 최고가" };
    } else {
      const minLow = Math.min(...postBars.map((b) => b.low));
      const peakBar = postBars.find((b) => b.low === minLow)!;
      const pct = ((minLow - signal.price) / signal.price) * 100; // 음수
      return { extremePrice: minLow, peakTime: peakBar.time, pct, label: "진입 → 당일 최저가" };
    }
  })();

  // ── 차트 렌더링 ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? "#111827" : "#ffffff",
        },
        textColor: isDark ? "#9ca3af" : "#374151",
      },
      grid: {
        vertLines: { color: isDark ? "#1f2937" : "#f3f4f6" },
        horzLines: { color: isDark ? "#1f2937" : "#f3f4f6" },
      },
      rightPriceScale: {
        borderColor: isDark ? "#374151" : "#e5e7eb",
      },
      timeScale: {
        borderColor: isDark ? "#374151" : "#e5e7eb",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (ts: number) => {
          const d = new Date((ts + KST_OFFSET_SEC) * 1000);
          const h = String(d.getUTCHours()).padStart(2, "0");
          const m = String(d.getUTCMinutes()).padStart(2, "0");
          return `${h}:${m}`;
        },
      },
    });

    // ── 캔들스틱 ──────────────────────────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#3b82f6",
      borderUpColor: "#ef4444",
      borderDownColor: "#3b82f6",
      wickUpColor: "#ef4444",
      wickDownColor: "#3b82f6",
    });

    candleSeries.setData(
      bars.map((b) => ({
        time: timeToTs(b.time),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      })),
    );

    // ── ORB 고가 점선 (초록) ──────────────────────────────────────
    candleSeries.createPriceLine({
      price: orb.high,
      color: "#22c55e",
      lineWidth: 1,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: `ORB 고가`,
    });

    // ── ORB 저가 점선 (빨강) ──────────────────────────────────────
    candleSeries.createPriceLine({
      price: orb.low,
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `ORB 저가`,
    });

    // ── VWAP 라인 (파랑) ─────────────────────────────────────────
    const vwapSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false,
      title: "VWAP",
    });

    vwapSeries.setData(
      vwap.map((v) => ({
        time: timeToTs(v.time),
        value: v.value,
      })),
    );

    // ── 돌파 시그널 마커 ─────────────────────────────────────────
    if (signal) {
      createSeriesMarkers(candleSeries, [
        {
          time: timeToTs(signal.time),
          position: signal.type === "LONG" ? "belowBar" : "aboveBar",
          color: signal.type === "LONG" ? "#22c55e" : "#ef4444",
          shape: signal.type === "LONG" ? "arrowUp" : "arrowDown",
          text: signal.type === "LONG" ? "▲ LONG" : "▼ SHORT",
          size: 2,
        },
      ]);
    }

    // ── 거래량 히스토그램 ─────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeries.setData(
      bars.map((b) => {
        const isOrb = b.time <= orb.endTime;
        const isSurge = avgVol > 0 && b.volume >= avgVol * 1.5;
        let color: string;
        if (isOrb) {
          color = "#94a3b880"; // ORB 구간: 회색 반투명
        } else if (isSurge) {
          color = "#f9731690"; // surge: 주황
        } else {
          color = b.close >= b.open ? "#ef444430" : "#3b82f630";
        }
        return { time: timeToTs(b.time), value: b.volume, color };
      }),
    );

    chart.timeScale().fitContent();

    // ── OHLCV + 수익률 툴팁 ──────────────────────────────────────
    // effect 시작 시 진입 정보를 로컬에 고정 (클로저 stale 방지)
    const entryPrice = signal?.price ?? null;
    const signalType = signal?.type ?? null;
    const signalTime = signal?.time ?? null;

    function renderTooltip(
      time: string,
      open: number,
      high: number,
      low: number,
      close: number,
      volume: number,
      showProfit = true,
    ): string {
      const isUp = close >= open;
      const c = isUp ? "#ef4444" : "#3b82f6";
      const chg = open > 0 ? (((close - open) / open) * 100).toFixed(2) : "0.00";
      const sign = close >= open ? "+" : "";
      const g = "#6b7280";

      const ohlcPart =
        `<span style="color:${g}">${time}&nbsp;&nbsp;</span>`
        + `<span style="color:${g}">시가&nbsp;</span><span style="color:${c};font-weight:600">${open.toLocaleString()}&nbsp;&nbsp;</span>`
        + `<span style="color:${g}">고가&nbsp;</span><span style="color:${c};font-weight:600">${high.toLocaleString()}&nbsp;&nbsp;</span>`
        + `<span style="color:${g}">저가&nbsp;</span><span style="color:${c};font-weight:600">${low.toLocaleString()}&nbsp;&nbsp;</span>`
        + `<span style="color:${g}">종가&nbsp;</span><span style="color:${c};font-weight:600">${close.toLocaleString()}&nbsp;&nbsp;</span>`
        + `<span style="color:${g}">등락&nbsp;</span><span style="color:${c};font-weight:600">${sign}${chg}%&nbsp;&nbsp;</span>`
        + `<span style="color:${g}">거래량&nbsp;</span><span style="color:#9ca3af">${volume.toLocaleString()}</span>`;

      // 진입 이후 봉 + 크로스헤어 활성 상태일 때만 수익률 표시
      if (
        showProfit &&
        entryPrice !== null &&
        signalType !== null &&
        signalTime !== null &&
        time >= signalTime
      ) {
        // LONG: 이 봉의 고가에서 팔면 몇 %?  SHORT: 이 봉의 저가에서 청산하면 몇 %?
        const sellPrice = signalType === "LONG" ? high : low;
        const pct = signalType === "LONG"
          ? ((sellPrice - entryPrice) / entryPrice) * 100
          : ((entryPrice - sellPrice) / entryPrice) * 100;
        const pctSign = pct >= 0 ? "+" : "";
        const pctColor = pct >= 0 ? "#ef4444" : "#3b82f6";
        const profitPart =
          `&nbsp;&nbsp;<span style="background:${pctColor}20;padding:1px 6px;border-radius:4px;`
          + `color:${pctColor};font-weight:700">${pctSign}${pct.toFixed(2)}%</span>`;
        return ohlcPart + profitPart;
      }

      return ohlcPart;
    }

    // 초기값: 시그널 봉 우선, 없으면 마지막 봉
    const lastB = bars[bars.length - 1];
    const defaultB = signalTime
      ? (bars.find((b) => b.time === signalTime) ?? lastB)
      : lastB;
    if (tooltipRef.current && defaultB) {
      tooltipRef.current.innerHTML = renderTooltip(
        defaultB.time, defaultB.open, defaultB.high, defaultB.low, defaultB.close, defaultB.volume,
        false, // 초기값: 수익률 미표시
      );
    }

    // timestamp → bars 원본 데이터 룩업맵 (seriesData 대신 사용)
    const barByTs = new Map<number, MinuteBar>();
    bars.forEach((b) => barByTs.set(timeToTs(b.time), b));

    chart.subscribeCrosshairMove((param) => {
      const el = tooltipRef.current;
      if (!el) return;
      if (!param.time) {
        if (defaultB) {
          el.innerHTML = renderTooltip(
            defaultB.time, defaultB.open, defaultB.high, defaultB.low, defaultB.close, defaultB.volume,
            false, // 크로스헤어 없을 때: 수익률 미표시
          );
        }
        return;
      }
      const ts = typeof param.time === "number" ? param.time : 0;
      const bar = barByTs.get(ts);
      if (!bar) return;
      el.innerHTML = renderTooltip(bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume);
    });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, orbPeriod]);

  function handlePeriodChange(p: OrbPeriod) {
    setOrbPeriod(p);
    router.push(`/intraday?ticker=${ticker}&period=${p}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* 헤더 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              ← 돌아가기
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {name}
                <span className="ml-2 text-sm font-mono text-gray-400 dark:text-gray-500">
                  {ticker}
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">인트라데이 ORB + VWAP 분석</p>
            </div>
          </div>

          {/* ORB 기간 선택 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">ORB 기간:</span>
            {ORB_PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  orbPeriod === p
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                {p}분
              </button>
            ))}
          </div>
        </div>

        {/* 지표 요약 바 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="현재가" value={lastBar ? `${lastBar.close.toLocaleString()}원` : "-"} />
          <MetricCard
            label="VWAP"
            value={currentVwap > 0 ? `${currentVwap.toLocaleString()}원` : "-"}
            sub={
              lastBar && currentVwap > 0
                ? lastBar.close > currentVwap
                  ? "VWAP 위 ▲"
                  : "VWAP 아래 ▼"
                : undefined
            }
            subColor={lastBar && currentVwap > 0 ? (lastBar.close > currentVwap ? "green" : "red") : undefined}
          />
          <MetricCard
            label={`ORB 고가 (${orbPeriod}분)`}
            value={`${orb.high.toLocaleString()}원`}
            sub={`~${orb.endTime}`}
          />
          <MetricCard
            label={`ORB 저가 (${orbPeriod}분)`}
            value={`${orb.low.toLocaleString()}원`}
          />
        </div>

        {/* 차트 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* 범례 */}
          {/* OHLCV 툴팁 바 */}
          <div
            ref={tooltipRef}
            className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 min-h-[36px] font-mono text-xs text-gray-700 dark:text-gray-300"
          />
          {/* 차트 */}
          <div ref={containerRef} className="w-full" />
          {/* 범례 */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <LegendItem color="#3b82f6" label="VWAP" />
            <LegendItem color="#22c55e" label="ORB 고가" dashed />
            <LegendItem color="#ef4444" label="ORB 저가" dashed />
            <LegendItem color="#94a3b8" label="ORB 구간 거래량" />
          </div>
        </div>

        {/* 시그널 요약 카드 */}
        <SignalCard signal={signal} orb={orb} currentVwap={currentVwap} vwapAtSignal={vwapAtSignal} lastPrice={lastBar?.close} maxProfitInfo={maxProfitInfo} />

        {/* ORB 구간 정보 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            📊 ORB 구간 정보 ({orbPeriod}분)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <InfoRow label="구간" value={`09:00 ~ ${orb.endTime}`} />
            <InfoRow label="ORB 고가" value={`${orb.high.toLocaleString()}원`} highlight="green" />
            <InfoRow label="ORB 저가" value={`${orb.low.toLocaleString()}원`} highlight="red" />
            <InfoRow
              label="구간 범위"
              value={`${(((orb.high - orb.low) / orb.low) * 100).toFixed(2)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: "green" | "red";
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-base font-bold text-gray-900 dark:text-gray-100">{value}</div>
      {sub && (
        <div
          className={`text-xs font-medium mt-0.5 ${
            subColor === "green"
              ? "text-green-600 dark:text-green-400"
              : subColor === "red"
                ? "text-red-500 dark:text-red-400"
                : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-0.5 w-5"
        style={{
          background: dashed ? "transparent" : color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
        } as React.CSSProperties}
      />
      <span>{label}</span>
    </span>
  );
}

function SignalCard({
  signal,
  orb,
  currentVwap,
  vwapAtSignal,
  lastPrice,
  maxProfitInfo,
}: {
  signal: ReturnType<typeof detectOrbBreakout>;
  orb: ReturnType<typeof calculateOrb>;
  currentVwap: number;
  vwapAtSignal: number;
  lastPrice: number | undefined;
  maxProfitInfo: { extremePrice: number; peakTime: string; pct: number; label: string } | null;
}) {
  if (!signal) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          📊 시그널 요약
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          ORB 돌파 시그널 없음 — 레인지 내 횡보 중
        </div>
      </div>
    );
  }

  const isLong = signal.type === "LONG";
  // 진입 시점의 진입가 vs 그 시점 VWAP 비교
  const aboveVwapAtSignal = vwapAtSignal > 0 && signal.price > vwapAtSignal;
  const vwapConfirm = isLong ? aboveVwapAtSignal : !aboveVwapAtSignal;
  const isPositive = maxProfitInfo !== null && maxProfitInfo.pct > 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        isLong
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
      }`}
    >
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        📊 시그널 요약
      </h2>
      <div className="flex items-start gap-4 flex-wrap">
        {/* 방향 배지 */}
        <div
          className={`px-4 py-2 rounded-lg text-white font-bold text-lg ${
            isLong ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isLong ? "🟢 LONG" : "🔴 SHORT"}
        </div>

        {/* 상세 */}
        <div className="flex-1 min-w-0 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">진입</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{signal.time}</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
              {signal.price.toLocaleString()}원
            </span>
            <span className={`text-xs font-medium ${signal.volumeMultiple >= 2 ? "text-orange-500" : "text-gray-400 dark:text-gray-500"}`}>
              거래량 {signal.volumeMultiple.toFixed(1)}배
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">VWAP</span>
            <span className={`font-medium text-xs ${vwapConfirm ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
              {vwapConfirm ? "위에서 돌파 ✅" : "조건 불일치 ⚠️"}
            </span>
          </div>
        </div>

        {/* 진입→최고/최저가 수익률 */}
        {maxProfitInfo && (
          <div
            className={`flex flex-col items-end justify-center px-4 py-2 rounded-xl border ${
              isPositive
                ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700"
                : "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700"
            }`}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              {maxProfitInfo.label}
            </div>
            <div
              className={`text-2xl font-bold tabular-nums ${
                isPositive ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
              }`}
            >
              {maxProfitInfo.pct > 0 ? "+" : ""}{maxProfitInfo.pct.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {signal.price.toLocaleString()} → {maxProfitInfo.extremePrice.toLocaleString()}원
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {isLong ? "고가" : "저가"} 도달 {maxProfitInfo.peakTime}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "green" | "red";
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div
        className={`text-sm font-semibold ${
          highlight === "green"
            ? "text-green-600 dark:text-green-400"
            : highlight === "red"
              ? "text-red-500 dark:text-red-400"
              : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

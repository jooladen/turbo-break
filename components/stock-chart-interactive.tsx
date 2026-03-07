"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from "lightweight-charts";
import type { StockOHLCV } from "@/lib/screener-types";

type Props = {
  data: StockOHLCV[];
  period?: number;
  queryDate?: string; // 기준일 — 이후 봉은 반투명 "미래" 처리
  volMultiplier?: number; // 거래량 배수 기준 (기본 2)
};

function calcMA(data: StockOHLCV[], period: number) {
  return data
    .map((_, i) => {
      if (i < period - 1) return null;
      const avg =
        data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.close, 0) /
        period;
      return {
        time: data[i].date as `${number}-${number}-${number}`,
        value: Math.round(avg),
      };
    })
    .filter(
      (v): v is { time: `${number}-${number}-${number}`; value: number } =>
        v !== null,
    );
}

function fmt(n: number): string {
  return n.toLocaleString();
}

/** queryDate가 데이터에 없을 때 (휴일·날짜 밀림 등) 직전 가장 가까운 거래일 인덱스 반환 */
function findPivotIdx(candles: StockOHLCV[], queryDate: string | undefined, fallback: number): number {
  if (!queryDate) return fallback;
  const exact = candles.findIndex((d) => d.date === queryDate);
  if (exact >= 0) return exact;
  // 가장 가까운 이전 거래일 (candles는 oldest→newest 순)
  let best = -1;
  for (let i = 0; i < candles.length; i++) {
    if (candles[i].date <= queryDate) best = i;
  }
  return best >= 0 ? best : fallback;
}

export default function StockChartInteractive({ data, period = 20, queryDate, volMultiplier = 2 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const isDark = document.documentElement.classList.contains("dark");

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 420,
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
      crosshair: {
        vertLine: {
          color: isDark ? "#4b5563" : "#9ca3af",
          width: 1,
          style: 2,
        },
        horzLine: {
          color: isDark ? "#4b5563" : "#9ca3af",
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: isDark ? "#374151" : "#e5e7eb",
      },
      timeScale: {
        borderColor: isDark ? "#374151" : "#e5e7eb",
        timeVisible: false,
        tickMarkFormatter: (time: string) => {
          const [y, m, d] = time.split("-");
          return `${m}/${d}`;
        },
      },
      localization: {
        dateFormat: "yyyy-MM-dd",
      },
    });

    // 최신→과거 순 데이터를 과거→최신 순으로 뒤집기
    const candles = [...data].reverse();
    const n = candles.length;

    // ── N일 구간 계산 (기준일 기반) ─────────────────────────────
    const effectiveEnd = findPivotIdx(candles, queryDate, n - 1);
    const rangeStart = Math.max(0, effectiveEnd - period);
    const rangeEnd = Math.max(0, effectiveEnd - 1);
    const range20 = candles.slice(rangeStart, rangeEnd + 1);
    const high20 = Math.max(...range20.map((d) => d.high));

    // ── 캔들스틱 ────────────────────────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",
      downColor: "#3b82f6",
      borderUpColor: "#ef4444",
      borderDownColor: "#3b82f6",
      wickUpColor: "#ef4444",
      wickDownColor: "#3b82f6",
      priceScaleId: "right",
    });

    candleSeries.setData(
      candles.map((d) => {
        const isFuture = queryDate !== undefined && d.date > queryDate;
        return {
          time: d.date as `${number}-${number}-${number}`,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          ...(isFuture && {
            color: d.close >= d.open ? "#ef444440" : "#3b82f640",
            borderColor: d.close >= d.open ? "#ef444460" : "#3b82f660",
            wickColor: d.close >= d.open ? "#ef444440" : "#3b82f640",
          }),
        };
      }),
    );

    // ── N일 최고가 수평선 ───────────────────────────────────────
    candleSeries.createPriceLine({
      price: high20,
      color: "#f97316",
      lineWidth: 1,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: "",
    });

    // ── N일 범위 마커 (시작 / 끝) + 돌파 마커 + 기준일 마커 ────────
    const pivotCandle = candles[effectiveEnd];
    const avg20volUE = range20.length > 0
      ? range20.reduce((s, d) => s + d.volume, 0) / range20.length
      : 0;
    const isBreakout = pivotCandle !== undefined && pivotCandle.close > high20 && avg20volUE > 0 && pivotCandle.volume >= avg20volUE * volMultiplier;
    const hasFuture = queryDate !== undefined && effectiveEnd < n - 1;

    createSeriesMarkers(candleSeries, [
      {
        time: candles[rangeStart].date as `${number}-${number}-${number}`,
        position: "belowBar",
        color: "#f97316",
        shape: "arrowUp",
        text: `◀ ${period}일`,
        size: 1,
      },
      {
        time: candles[rangeEnd].date as `${number}-${number}-${number}`,
        position: "belowBar",
        color: "#f97316",
        shape: "arrowUp",
        text: `${period}일 ▶`,
        size: 1,
      },
      ...(isBreakout && pivotCandle
        ? [
            {
              time: pivotCandle.date as `${number}-${number}-${number}`,
              position: "aboveBar" as const,
              color: "#ef4444",
              shape: "arrowDown" as const,
              text: "돌파 ▲",
              size: 2,
            },
          ]
        : []),
      ...(hasFuture && pivotCandle
        ? [
            {
              time: pivotCandle.date as `${number}-${number}-${number}`,
              position: "belowBar" as const,
              color: "#10b981",
              shape: "arrowUp" as const,
              text: "기준일",
              size: 1,
            },
          ]
        : []),
    ]);

    // ── 거래량 히스토그램 ────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const avg20vol = range20.length > 0
      ? range20.reduce((s, d) => s + d.volume, 0) / range20.length
      : 0;

    // queryDate가 있으면 그 날이 "기준일", 없으면 마지막 봉이 기준일
    const pivotDate = queryDate ?? candles[candles.length - 1]?.date;

    volumeSeries.setData(
      candles.map((d) => {
        const isFuture = queryDate !== undefined && d.date > queryDate;
        const isPivot = d.date === pivotDate;
        const isSurge = avg20vol > 0 && d.volume >= avg20vol * volMultiplier;
        let color: string;
        if (isFuture) {
          color = d.close >= d.open ? "#ef444418" : "#3b82f618"; // 미래: 매우 연한
        } else if (isPivot && isSurge) {
          color = "#f97316"; // 기준일 + surge: solid 주황
        } else if (isPivot) {
          color = d.close >= d.open ? "#ef4444" : "#3b82f6"; // 기준일 일반: solid 색
        } else if (isSurge) {
          color = "#f9731680"; // surge: 반투명 주황
        } else {
          color = d.close >= d.open ? "#ef444428" : "#3b82f628"; // 일반: 연한
        }
        return {
          time: d.date as `${number}-${number}-${number}`,
          value: d.volume,
          color,
        };
      }),
    );

    // ── MA 시리즈 ────────────────────────────────────────────────
    const ma5Series = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ma5Series.setData(calcMA(candles, 5));

    const ma20Series = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 1,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ma20Series.setData(calcMA(candles, 20));

    const ma60Series = chart.addSeries(LineSeries, {
      color: "#a78bfa",
      lineWidth: 2,
      priceScaleId: "right",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ma60Series.setData(calcMA(candles, 60));

    chart.timeScale().fitContent();

    // ── OHLCV 툴팁 (크로스헤어 연동, DOM 직접 업데이트) ─────────
    const tooltipBg = isDark ? "#1f2937" : "#f9fafb";
    const tooltipBorder = isDark ? "#374151" : "#e5e7eb";

    function setTooltipDefault() {
      const el = tooltipRef.current;
      if (!el) return;
      const last = candles[n - 1];
      if (!last) return;
      const isUp = last.close >= last.open;
      const c = isUp ? "#ef4444" : "#3b82f6";
      el.innerHTML = buildTooltipHtml(
        last.date,
        last.open,
        last.high,
        last.low,
        last.close,
        last.volume,
        c,
        tooltipBg,
        tooltipBorder,
      );
    }

    setTooltipDefault();

    chart.subscribeCrosshairMove((param) => {
      const el = tooltipRef.current;
      if (!el) return;

      if (!param.time) {
        setTooltipDefault();
        return;
      }

      type OhlcData = { open: number; high: number; low: number; close: number };
      type VolData = { value: number };

      const ohlc = param.seriesData.get(candleSeries) as OhlcData | undefined;
      const vol = param.seriesData.get(volumeSeries) as VolData | undefined;

      if (!ohlc) {
        setTooltipDefault();
        return;
      }

      const isUp = ohlc.close >= ohlc.open;
      const c = isUp ? "#ef4444" : "#3b82f6";
      const dateStr = typeof param.time === "string" ? param.time : "";

      el.innerHTML = buildTooltipHtml(
        dateStr,
        ohlc.open,
        ohlc.high,
        ohlc.low,
        ohlc.close,
        vol?.value ?? 0,
        c,
        tooltipBg,
        tooltipBorder,
      );
    });

    // ── 리사이즈 대응 ────────────────────────────────────────────
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
  }, [data, period, queryDate, volMultiplier]);

  // N일 구간 정보 (render용 — data prop에서 계산)
  const candles = data.length > 0 ? [...data].reverse() : [];
  const n = candles.length;
  // 기준일 인덱스 (미래 봉 제외, 정확한 날짜 없으면 직전 거래일)
  const effectiveEnd = findPivotIdx(candles, queryDate, n - 1);
  const futureBars = candles.slice(effectiveEnd + 1);
  const rangeStart = Math.max(0, effectiveEnd - period);
  const rangeEnd = Math.max(0, effectiveEnd - 1);
  const range20 = candles.slice(rangeStart, rangeEnd + 1);
  const high20 = range20.length > 0 ? Math.max(...range20.map((d) => d.high)) : 0;
  const avgVol20 =
    range20.length > 0
      ? Math.round(range20.reduce((s, d) => s + d.volume, 0) / range20.length)
      : 0;
  const pivotCandle = candles[effectiveEnd];
  const todayClose = pivotCandle?.close ?? 0;
  const todayVol = pivotCandle?.volume ?? 0;
  const isBreakout = high20 > 0 && todayClose > high20 && avgVol20 > 0 && todayVol >= avgVol20 * volMultiplier;
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="relative">
      {/* OHLCV 툴팁 */}
      <div
        ref={tooltipRef}
        className="absolute top-2 left-2 z-10 pointer-events-none"
      />

      {/* N일 최고가 + MA 범례 (상단 중앙, 세로 정렬) */}
      {high20 > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-orange-500 bg-white/80 dark:bg-gray-900/80 px-2 py-0.5 rounded border border-orange-300 dark:border-orange-700 whitespace-nowrap">
            {period}일 고가 {fmt(high20)}
          </span>
          <div className="flex items-center gap-3 text-xs bg-white/70 dark:bg-gray-900/70 px-2 py-0.5 rounded">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-[#f59e0b]" />
              <span className="text-gray-500 dark:text-gray-400">MA5</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-[#60a5fa]" />
              <span className="text-gray-500 dark:text-gray-400">MA20</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 bg-[#a78bfa]" />
              <span className="text-gray-500 dark:text-gray-400">MA60</span>
            </span>
          </div>
          {isBreakout && (
            <span className="text-xs font-bold text-red-500 bg-white/80 dark:bg-gray-900/80 px-2 py-0.5 rounded border border-red-300 dark:border-red-700 whitespace-nowrap">
              ▲ {period}일 고가 돌파
            </span>
          )}
          {futureBars.length > 0 && (() => {
            const lastFuture = futureBars[futureBars.length - 1]!;
            const gain = todayClose > 0 ? ((lastFuture.close - todayClose) / todayClose * 100) : 0;
            return (
              <span className={`text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap bg-white/80 dark:bg-gray-900/80 ${gain >= 0 ? "text-red-500 border-red-300 dark:border-red-700" : "text-blue-500 border-blue-300 dark:border-blue-700"}`}>
                {futureBars.length}일 후 {gain >= 0 ? "+" : ""}{gain.toFixed(1)}%
              </span>
            );
          })()}
        </div>
      )}

      <div ref={containerRef} className="w-full" />

      {/* N일 구간 정보 바 */}
      {range20.length > 0 && (
        <div className="mt-1 px-2 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "#f97316" }}
            />
            <span className="font-medium text-orange-500">{period}일 구간</span>
          </span>
          <span>
            {candles[rangeStart]?.date} ~ {candles[rangeEnd]?.date}
          </span>
          <span className="text-orange-500 font-semibold">최고가 {fmt(high20)}</span>
          <span className="text-gray-400 dark:text-gray-500">|</span>
          <span>평균거래량 <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(avgVol20)}</span></span>
          {avgVol20 > 0 && pivotCandle && (() => {
            const multiple = todayVol / avgVol20;
            const isSurge = multiple >= volMultiplier;
            return (
              <>
                <span className="text-gray-400 dark:text-gray-500">|</span>
                <span>
                  📊 오늘 거래량{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(todayVol)}</span>
                  <span className="text-gray-400 dark:text-gray-500 mx-0.5">/</span>
                  <span className="text-gray-400 dark:text-gray-500">평균</span>{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(avgVol20)}</span>
                  <span className="text-gray-400 dark:text-gray-500 mx-0.5">=</span>
                  <span className={`font-semibold ${isSurge ? "text-orange-500" : "text-gray-500 dark:text-gray-400"}`}>
                    {multiple.toFixed(1)}배
                  </span>
                  {isSurge && <span className="ml-1 text-orange-500 font-bold">🔥 SURGE</span>}
                </span>
              </>
            );
          })()}
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {showDebug ? "검증 닫기" : "검증 보기"}
          </button>
        </div>
      )}

      {/* 엑셀식 검증 테이블 */}
      {showDebug && range20.length > 0 && (
        <div className="mt-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <th className="px-2 py-1 text-left font-semibold">#</th>
                <th className="px-2 py-1 text-left font-semibold">날짜</th>
                <th className="px-2 py-1 text-right font-semibold">고가</th>
                <th className="px-2 py-1 text-right font-semibold">저가</th>
                <th className="px-2 py-1 text-right font-semibold">종가</th>
                <th className="px-2 py-1 text-right font-semibold">거래량</th>
                <th className="px-2 py-1 text-center font-semibold">구간</th>
              </tr>
            </thead>
            <tbody>
              {range20.map((d, i) => (
                <tr
                  key={d.date}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 py-0.5 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-2 py-0.5 text-gray-600 dark:text-gray-300">{d.date}</td>
                  <td className={`px-2 py-0.5 text-right font-mono ${d.high === high20 ? "text-orange-500 font-bold" : "text-gray-600 dark:text-gray-400"}`}>
                    {fmt(d.high)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">
                    {fmt(d.low)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">
                    {fmt(d.close)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">
                    {fmt(d.volume)}
                  </td>
                  <td className="px-2 py-0.5 text-center text-orange-400">
                    {period}일
                  </td>
                </tr>
              ))}
              {/* 기준일 (구간 밖) — queryDate가 있으면 pivotCandle, 없으면 마지막 봉 */}
              {pivotCandle && (
                <tr className="border-t-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10">
                  <td className="px-2 py-0.5 text-orange-500 font-bold font-mono">T</td>
                  <td className="px-2 py-0.5 text-orange-600 dark:text-orange-400 font-semibold">{pivotCandle.date}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(pivotCandle.high)}</td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(pivotCandle.low)}</td>
                  <td className={`px-2 py-0.5 text-right font-mono font-bold ${isBreakout ? "text-red-500" : "text-blue-500"}`}>
                    {fmt(pivotCandle.close)}
                  </td>
                  <td className="px-2 py-0.5 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(todayVol)}</td>
                  <td className="px-2 py-0.5 text-center text-orange-500 font-bold">오늘</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
                <td colSpan={2} className="px-2 py-1.5 font-bold text-gray-700 dark:text-gray-200">
                  합계 ({range20.length}일)
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-orange-500">
                  MAX {fmt(high20)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                  MIN {fmt(range20.length > 0 ? Math.min(...range20.map(d => d.low)) : 0)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500">—</td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-700 dark:text-gray-200">
                  {fmt(range20.reduce((s, d) => s + d.volume, 0))}
                </td>
                <td className="px-2 py-1.5 text-center text-gray-400">SUM</td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800">
                <td colSpan={2} className="px-2 py-1.5 font-bold text-gray-700 dark:text-gray-200">
                  평균 ({range20.length}일)
                </td>
                <td colSpan={3} className="px-2 py-1.5 text-right font-mono text-gray-400">
                  {fmt(range20.reduce((s, d) => s + d.volume, 0))} ÷ {range20.length} =
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-700 dark:text-gray-200">
                  {fmt(avgVol20)}
                </td>
                <td className="px-2 py-1.5 text-center text-gray-400">AVG</td>
              </tr>
              <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-gray-200 dark:border-gray-700">
                <td colSpan={5} className="px-2 py-1.5 text-right text-gray-500 dark:text-gray-400">
                  오늘 거래량 <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{fmt(todayVol)}</span> / {period}일 평균 <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{fmt(avgVol20)}</span> =
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-orange-500">
                  {avgVol20 > 0 ? (todayVol / avgVol20).toFixed(2) : "—"}배
                </td>
                <td className="px-2 py-1.5 text-center">
                  {avgVol20 > 0 && todayVol / avgVol20 >= volMultiplier
                    ? <span className="text-orange-500 font-bold">PASS</span>
                    : <span className="text-gray-400">FAIL</span>
                  }
                </td>
              </tr>
              <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-t border-gray-100 dark:border-gray-800">
                <td colSpan={5} className="px-2 py-1.5 text-right text-gray-500 dark:text-gray-400">
                  오늘 종가 vs {period}일 최고가 =
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold" style={{ color: isBreakout ? "#ef4444" : "#3b82f6" }}>
                  {high20 > 0 ? (((todayClose - high20) / high20) * 100).toFixed(2) : "—"}%
                </td>
                <td className="px-2 py-1.5 text-center">
                  {isBreakout
                    ? <span className="text-red-500 font-bold">PASS</span>
                    : <span className="text-gray-400">FAIL</span>
                  }
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function buildTooltipHtml(
  date: string,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  color: string,
  bg: string,
  border: string,
): string {
  const chg = open > 0 ? (((close - open) / open) * 100).toFixed(2) : "0.00";
  const sign = close >= open ? "+" : "";
  return `
    <div style="
      background:${bg};
      border:1px solid ${border};
      border-radius:6px;
      padding:6px 10px;
      font-size:11px;
      line-height:1.8;
      font-family:monospace;
      white-space:nowrap;
    ">
      <div style="color:#6b7280;margin-bottom:2px">${date}</div>
      <div style="display:grid;grid-template-columns:auto auto;gap:0 12px">
        <span style="color:#6b7280">시가</span>
        <span style="color:${color};font-weight:600">${fmt(open)}</span>
        <span style="color:#6b7280">고가</span>
        <span style="color:${color};font-weight:600">${fmt(high)}</span>
        <span style="color:#6b7280">저가</span>
        <span style="color:${color};font-weight:600">${fmt(low)}</span>
        <span style="color:#6b7280">종가</span>
        <span style="color:${color};font-weight:600">${fmt(close)}</span>
        <span style="color:#6b7280">등락</span>
        <span style="color:${color}">${sign}${chg}%</span>
        <span style="color:#6b7280">거래량</span>
        <span style="color:#9ca3af">${fmt(volume)}</span>
      </div>
    </div>
  `;
}

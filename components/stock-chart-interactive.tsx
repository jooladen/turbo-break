"use client";

import { useEffect, useRef } from "react";
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

export default function StockChartInteractive({ data }: Props) {
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
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // 최신→과거 순 데이터를 과거→최신 순으로 뒤집기
    const candles = [...data].reverse();
    const n = candles.length;

    // ── 20일 구간 계산 ──────────────────────────────────────────
    // breakout20 조건: 오늘(index n-1)의 고가 > 직전 20봉(n-21 ~ n-2)의 최고가
    const rangeStart = Math.max(0, n - 21);
    const rangeEnd = Math.max(0, n - 2);
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
      candles.map((d) => ({
        time: d.date as `${number}-${number}-${number}`,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })),
    );

    // ── 20일 최고가 수평선 ───────────────────────────────────────
    candleSeries.createPriceLine({
      price: high20,
      color: "#f97316",
      lineWidth: 1,
      lineStyle: 2, // dashed
      axisLabelVisible: true,
      title: "",
    });

    // ── 20일 범위 마커 (시작 / 끝) + 돌파 마커 ────────────────────
    const todayCandle = candles[n - 1];
    const isBreakout = todayCandle !== undefined && todayCandle.close > high20;
    createSeriesMarkers(candleSeries, [
      {
        time: candles[rangeStart].date as `${number}-${number}-${number}`,
        position: "belowBar",
        color: "#f97316",
        shape: "arrowUp",
        text: "◀ 20일",
        size: 1,
      },
      {
        time: candles[rangeEnd].date as `${number}-${number}-${number}`,
        position: "belowBar",
        color: "#f97316",
        shape: "arrowUp",
        text: "20일 ▶",
        size: 1,
      },
      ...(isBreakout && todayCandle
        ? [
            {
              time: todayCandle.date as `${number}-${number}-${number}`,
              position: "aboveBar" as const,
              color: "#ef4444",
              shape: "arrowDown" as const,
              text: "돌파 ▲",
              size: 2,
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

    const avg20vol =
      candles.slice(-21, -1).reduce((s, d) => s + d.volume, 0) / 20;

    volumeSeries.setData(
      candles.map((d, i) => {
        const isSurge = avg20vol > 0 && d.volume >= avg20vol * 2;
        const isToday = i === candles.length - 1;
        let color: string;
        if (isToday && isSurge) {
          color = "#f97316"; // 오늘 + surge: solid 주황
        } else if (isToday) {
          color = d.close >= d.open ? "#ef4444" : "#3b82f6"; // 오늘 일반: solid 색
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
  }, [data]);

  // 20일 구간 정보 (render용 — data prop에서 계산)
  const candles = data.length > 0 ? [...data].reverse() : [];
  const n = candles.length;
  const rangeStart = Math.max(0, n - 21);
  const rangeEnd = Math.max(0, n - 2);
  const range20 = candles.slice(rangeStart, rangeEnd + 1);
  const high20 = range20.length > 0 ? Math.max(...range20.map((d) => d.high)) : 0;
  const avgVol20 =
    range20.length > 0
      ? Math.round(range20.reduce((s, d) => s + d.volume, 0) / range20.length)
      : 0;
  const todayClose = candles[n - 1]?.close ?? 0;
  const isBreakout = high20 > 0 && todayClose > high20;

  return (
    <div className="relative">
      {/* OHLCV 툴팁 */}
      <div
        ref={tooltipRef}
        className="absolute top-2 left-2 z-10 pointer-events-none"
      />

      {/* 20일 최고가 + MA 범례 (상단 중앙, 세로 정렬) */}
      {high20 > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-orange-500 bg-white/80 dark:bg-gray-900/80 px-2 py-0.5 rounded border border-orange-300 dark:border-orange-700 whitespace-nowrap">
            20일 고가 {fmt(high20)}
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
              ▲ 20일 고가 돌파
            </span>
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full" />

      {/* 20일 구간 정보 바 */}
      {range20.length > 0 && (
        <div className="mt-1 px-2 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "#f97316" }}
            />
            <span className="font-medium text-orange-500">20일 구간</span>
          </span>
          <span>
            {candles[rangeStart]?.date} ~ {candles[rangeEnd]?.date}
          </span>
          <span className="text-orange-500 font-semibold">최고가 {fmt(high20)}</span>
          <span className="text-gray-400 dark:text-gray-500">|</span>
          <span>평균거래량 <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(avgVol20)}</span></span>
          {avgVol20 > 0 && candles[n - 1] && (() => {
            const todayVol = candles[n - 1]!.volume;
            const multiple = todayVol / avgVol20;
            const isSurge = multiple >= 2;
            return (
              <>
                <span className="text-gray-400 dark:text-gray-500">|</span>
                <span>
                  📊 오늘 거래량{" "}
                  <span className={`font-semibold ${isSurge ? "text-orange-500" : "text-gray-500 dark:text-gray-400"}`}>
                    {multiple.toFixed(1)}배
                  </span>
                  {isSurge && <span className="ml-1 text-orange-500 font-bold">🔥 SURGE</span>}
                </span>
              </>
            );
          })()}
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

import type { MinuteBar, OrbLevel, OrbSignal, VwapPoint } from "./intraday-types";

/** VWAP = Σ(typical × vol) / Σ(vol) — 09:00부터 누적 */
export function calculateVwap(bars: MinuteBar[]): VwapPoint[] {
  let cumTypicalVol = 0;
  let cumVol = 0;
  return bars.map((bar) => {
    const typical = (bar.high + bar.low + bar.close) / 3;
    cumTypicalVol += typical * bar.volume;
    cumVol += bar.volume;
    return {
      time: bar.time,
      value: cumVol === 0 ? bar.close : Math.round(cumTypicalVol / cumVol),
    };
  });
}

/** ORB 고가/저가 = 첫 periodMinutes 분봉들의 max/min */
export function calculateOrb(bars: MinuteBar[], periodMinutes: number): OrbLevel {
  const orbBars = bars.slice(0, periodMinutes);
  const high = Math.max(...orbBars.map((b) => b.high));
  const low = Math.min(...orbBars.map((b) => b.low));
  const lastBar = orbBars[orbBars.length - 1];
  return {
    high,
    low,
    periodMinutes,
    endTime: lastBar?.time ?? "09:05",
  };
}

/**
 * 돌파 감지: ORB 레인지 종료 이후 봉에서
 * - LONG: close가 ORB 고가 위로 올라감 + 거래량 1.5배 이상
 * - SHORT: close가 ORB 저가 아래로 내려감 + 거래량 1.5배 이상
 * 첫 번째 돌파만 반환
 */
export function detectOrbBreakout(
  bars: MinuteBar[],
  orb: OrbLevel,
  avgVolume: number,
): OrbSignal | null {
  const postOrbBars = bars.filter((b) => b.time > orb.endTime);

  for (const bar of postOrbBars) {
    const volMultiple = avgVolume === 0 ? 0 : bar.volume / avgVolume;
    if (volMultiple < 1.5) continue;

    if (bar.close > orb.high) {
      return {
        type: "LONG",
        time: bar.time,
        price: bar.close,
        volumeMultiple: volMultiple,
      };
    }
    if (bar.close < orb.low) {
      return {
        type: "SHORT",
        time: bar.time,
        price: bar.close,
        volumeMultiple: volMultiple,
      };
    }
  }
  return null;
}

/** 평균 거래량 계산 (ORB 구간 이후 전체 봉 기준) */
export function calcAvgVolume(bars: MinuteBar[]): number {
  if (bars.length === 0) return 0;
  return bars.reduce((s, b) => s + b.volume, 0) / bars.length;
}

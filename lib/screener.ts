import type {
  StockData,
  StockOHLCV,
  ScreenerConditions,
  ScreenerResult,
  SignalMetrics,
  BuySignal,
  BuyGrade,
} from "./screener-types";

const TURNOVER_MIN = 50_000_000_000; // 500억 원
const DEFAULT_VOL_MULTIPLIER = 2;
const SIDEWAYS_MAX_RANGE = 0.15; // 15%
const TAIL_FILTER_RATIO = 0.99;
const MA60_PERIOD = 60;
const OVERHEAT_MAX_RATE = 8; // %
const GAP_MAX_RATIO = 1.03;
const OVERBOUGHT_5D_MAX = 0.15; // 15%
const DEFAULT_PERIOD = 5;

/**
 * N일 고가 돌파 (조건 1)
 * 오늘 종가 > history[1..N] 중 최고가 AND 거래량 ≥ N일 평균 × multiplier
 */
function checkBreakout20(today: StockOHLCV, prior20: StockOHLCV[], period: number, volMultiplier: number): boolean {
  if (prior20.length < period) return false;
  const slice = prior20.slice(0, period);
  const high20 = Math.max(...slice.map((d) => d.high));
  const avgVolume = slice.reduce((sum, d) => sum + d.volume, 0) / period;
  return today.close > high20 && today.volume >= avgVolume * volMultiplier;
}

/**
 * 횡보 필터 (조건 2)
 * (20일 최고가 - 20일 최저가) / 20일 최저가 ≤ 15%
 */
function checkSideways(prior20: StockOHLCV[], period: number): boolean {
  if (prior20.length < period) return false;
  const slice = prior20.slice(0, period);
  const high20 = Math.max(...slice.map((d) => d.high));
  const low20 = Math.min(...slice.map((d) => d.low));
  if (low20 === 0) return false;
  return (high20 - low20) / low20 <= SIDEWAYS_MAX_RANGE;
}

/**
 * 거래량 폭증 (조건 3)
 * 당일 거래량 ≥ 20일 평균 거래량 × 2
 */
function checkVolumeSurge(today: StockOHLCV, prior20: StockOHLCV[], period: number, multiplier: number): boolean {
  if (prior20.length < period) return false;
  const avgVolume =
    prior20.slice(0, period).reduce((sum, d) => sum + d.volume, 0) /
    period;
  return today.volume >= avgVolume * multiplier;
}

/**
 * 윗꼬리 제거 (조건 4)
 * 종가 ≥ 당일 고가 × 0.99
 */
function checkTailFilter(today: StockOHLCV): boolean {
  if (today.high === 0) return false;
  return today.close >= today.high * TAIL_FILTER_RATIO;
}

/**
 * 거래대금 최소 기준 (조건 5)
 * 거래대금 ≥ 500억
 */
function checkTurnoverMin(today: StockOHLCV): boolean {
  return today.turnover >= TURNOVER_MIN;
}

/**
 * 60일 이동평균 위 (조건 6)
 * 종가 > 60일 MA
 */
function checkAboveMA60(today: StockOHLCV, history: StockOHLCV[]): boolean {
  // history[1..60]을 사용 (오늘 제외한 이전 60일)
  const slice = history.slice(1, MA60_PERIOD + 1);
  if (slice.length < MA60_PERIOD) return false;
  const ma60 = slice.reduce((sum, d) => sum + d.close, 0) / MA60_PERIOD;
  return today.close > ma60;
}

/**
 * 과열 방지 (조건 7)
 * 당일 상승률 < 8%
 */
function checkNotOverheated(today: StockOHLCV, yesterday: StockOHLCV): boolean {
  if (yesterday.close === 0) return false;
  const changeRate = ((today.close - yesterday.close) / yesterday.close) * 100;
  return changeRate < OVERHEAT_MAX_RATE;
}

/**
 * 양봉 (조건 8)
 * 종가 > 시가
 */
function checkBullish(today: StockOHLCV): boolean {
  return today.close > today.open;
}

/**
 * 갭 제한 (조건 9)
 * 시가 ≤ 전일 종가 × 1.03
 */
function checkNoGap(today: StockOHLCV, yesterday: StockOHLCV): boolean {
  return today.open <= yesterday.close * GAP_MAX_RATIO;
}

/**
 * 연속 상승 제한 (조건 10)
 * 직전 5일 누적 상승률 ≤ 15%
 * history[1] = 어제, history[5] = 5일 전
 */
function checkNotOverbought5d(history: StockOHLCV[]): boolean {
  if (history.length < 7) return false;
  const yesterday = history[1];
  const fiveDaysAgo = history[6];
  if (fiveDaysAgo.close === 0) return false;
  const gain5d = (yesterday.close - fiveDaysAgo.close) / fiveDaysAgo.close;
  return gain5d <= OVERBOUGHT_5D_MAX;
}

/**
 * 당일 상승률 계산 (%)
 */
function calcChangeRate(today: StockOHLCV, yesterday: StockOHLCV): number {
  if (yesterday.close === 0) return 0;
  return ((today.close - yesterday.close) / yesterday.close) * 100;
}

/**
 * SignalMetrics 계산
 */
function calcSignalMetrics(
  today: StockOHLCV,
  yesterday: StockOHLCV,
  prior20: StockOHLCV[],
  history: StockOHLCV[],
  period: number,
): SignalMetrics {
  const slice20 = prior20.slice(0, period);

  const high20 = slice20.length > 0 ? Math.max(...slice20.map((d) => d.high)) : 0;
  const low20 = slice20.length > 0 ? Math.min(...slice20.map((d) => d.low)) : 0;
  const avgVolume =
    slice20.length > 0
      ? slice20.reduce((sum, d) => sum + d.volume, 0) / slice20.length
      : 0;

  const ma60Slice = history.slice(1, MA60_PERIOD + 1);
  const ma60 =
    ma60Slice.length >= MA60_PERIOD
      ? ma60Slice.reduce((sum, d) => sum + d.close, 0) / MA60_PERIOD
      : 0;

  const fiveDaysAgo = history.length >= 7 ? history[6] : null;
  const gain5d =
    fiveDaysAgo && fiveDaysAgo.close > 0
      ? ((history[1].close - fiveDaysAgo.close) / fiveDaysAgo.close) * 100
      : 0;

  return {
    volumeMultiple: avgVolume > 0 ? today.volume / avgVolume : 0,
    breakoutPct: high20 > 0 ? ((today.close - high20) / high20) * 100 : 0,
    sidewaysRange: low20 > 0 ? ((high20 - low20) / low20) * 100 : 0,
    gain5d,
    changeRate: yesterday.close > 0 ? ((today.close - yesterday.close) / yesterday.close) * 100 : 0,
    tailRatio: today.high > 0 ? (today.close / today.high) * 100 : 0,
    gapRatio: yesterday.close > 0 ? (today.open / yesterday.close) * 100 : 100,
    ma60Distance: ma60 > 0 ? ((today.close - ma60) / ma60) * 100 : 0,
  };
}

/**
 * 매수 적합도 평가 — 점수/등급/이유 생성
 */
function evaluateBuySignal(
  conditions: ScreenerConditions,
  m: SignalMetrics,
  period: number,
  volMultiplier: number,
): BuySignal {
  let raw = 0;
  const positives: string[] = [];
  const warnings: string[] = [];

  // breakout (max 32 = 22 base + 10 bonus)
  if (conditions.breakout) {
    const bonus = Math.min(10, (m.breakoutPct / 3) * 10);
    raw += 22 + bonus;
    positives.push(
      `${period}일 고가를 ${m.breakoutPct.toFixed(1)}% 상향 돌파 — 저항선 전환 신호`,
    );
  } else {
    warnings.push(
      `${period}일 돌파 미달 (현재 ${m.breakoutPct.toFixed(1)}% — 기준: 0% 초과) — 진입 시그널 없음`,
    );
  }

  // sideways (max 28 = 20 base + 8 bonus)
  if (conditions.sideways) {
    const bonus = Math.max(0, 8 - (m.sidewaysRange / 15) * 8);
    raw += 20 + bonus;
    positives.push(
      `${period}일 박스권 범위 ${m.sidewaysRange.toFixed(1)}% — 충분한 에너지 응축`,
    );
  } else {
    warnings.push(
      `횡보 범위 초과 (${m.sidewaysRange.toFixed(1)}% — 기준: 15% 이하) — 변동성 과다`,
    );
  }

  // volumeSurge (max 20 = 20 bonus)
  if (conditions.volumeSurge) {
    const vm = m.volumeMultiple;
    const bonus = vm >= 5 ? 20 : vm >= 3 ? 16 : 10;
    raw += bonus;
    positives.push(
      `거래량 평균 대비 ${m.volumeMultiple.toFixed(1)}배 폭증 — 강한 수급 유입 확인`,
    );
  } else {
    warnings.push(
      `거래량 부족 (평균 ${m.volumeMultiple.toFixed(1)}배 — 기준: ${volMultiplier}배 이상) — 가짜 돌파 위험`,
    );
  }

  // aboveMA60 (max 21 = 15 base + 6 bonus)
  if (conditions.aboveMA60) {
    const bonus = Math.min(6, (m.ma60Distance / 5) * 6);
    raw += 15 + bonus;
    positives.push(
      `MA60 대비 ${m.ma60Distance.toFixed(1)}% 위 — 중기 상승 추세 확인`,
    );
  } else {
    warnings.push(
      `MA60 하회 (${m.ma60Distance.toFixed(1)}% — 기준: 0% 초과) — 중기 추세 미확인`,
    );
  }

  // turnoverMin (13, binary)
  if (conditions.turnoverMin) {
    raw += 13;
    positives.push("거래대금 500억 이상 — 충분한 유동성 확보");
  } else {
    warnings.push("거래대금 부족 (기준: 500억 이상) — 유동성 리스크");
  }

  // notOverbought5d (10, binary)
  if (conditions.notOverbought5d) {
    raw += 10;
    positives.push(
      `5일 누적 ${m.gain5d.toFixed(1)}% 상승 — 추격매수 위험 없음`,
    );
  } else {
    warnings.push(
      `5일 누적 ${m.gain5d.toFixed(1)}% 급등 (기준: 15% 이하) — 추격매수 위험`,
    );
  }

  // notOverheated (8, binary)
  if (conditions.notOverheated) {
    raw += 8;
    positives.push(
      `당일 등락률 ${m.changeRate.toFixed(1)}% — 과열 없이 안정적 상승`,
    );
  } else {
    warnings.push(
      `당일 ${m.changeRate.toFixed(1)}% 급등 (기준: 8% 미만) — 단기 과열 주의`,
    );
  }

  // noGap (8, binary)
  if (conditions.noGap) {
    raw += 8;
    positives.push(
      `갭 없이 자연스러운 시초가 (전일비 +${(m.gapRatio - 100).toFixed(1)}%) — 안정적 진입`,
    );
  } else {
    warnings.push(
      `갭 상승 시초가 (전일비 +${(m.gapRatio - 100).toFixed(1)}% — 기준: 3% 이하) — 고점 진입 위험`,
    );
  }

  // bullish (6, binary)
  if (conditions.bullish) {
    raw += 6;
    positives.push("양봉 마감 — 당일 매수세 우위 확인");
  } else {
    warnings.push("음봉 마감 — 장중 매도 압력 우세");
  }

  // tailFilter (0–5 based on tailRatio)
  if (conditions.tailFilter) {
    const bonus = Math.round(((m.tailRatio - 99) / 1) * 5);
    raw += Math.min(5, Math.max(0, bonus));
    positives.push(
      `윗꼬리 없이 강하게 마감 (고가 대비 ${m.tailRatio.toFixed(1)}%) — 매도 압력 없음`,
    );
  } else {
    warnings.push(
      `윗꼬리 존재 (고가 대비 ${m.tailRatio.toFixed(1)}% — 기준: 99% 이상) — 차익실현 신호`,
    );
  }

  const MAX_RAW = 133;
  const score = Math.min(100, Math.round((raw / MAX_RAW) * 100));

  const grade: BuyGrade =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "F";

  const summary =
    grade === "A"
      ? `강력 매수 신호 — ${conditions.breakout ? `${period}일 돌파` : ""}${conditions.volumeSurge ? "+거래량 폭증" : ""} 복합 확인`
      : grade === "B"
        ? "양호한 매수 신호 — 핵심 조건 대부분 충족"
        : grade === "C"
          ? "조건 부분 충족 — 추가 확인 후 진입 고려"
          : "매수 신호 미달 — 대기 또는 관망 권고";

  return { score, grade, summary, positives, warnings };
}

/**
 * 단일 종목 평가
 */
export function evaluateStock(stock: StockData, period = DEFAULT_PERIOD, volMultiplier = DEFAULT_VOL_MULTIPLIER): ScreenerResult {
  const history = stock.history;
  const today = history[0];
  const yesterday = history[1];
  const prior20 = history.slice(1); // 오늘 제외한 이전 데이터

  const conditions: ScreenerConditions = {
    breakout: checkBreakout20(today, prior20, period, volMultiplier),
    sideways: checkSideways(prior20, period),
    volumeSurge: checkVolumeSurge(today, prior20, period, volMultiplier),
    tailFilter: checkTailFilter(today),
    turnoverMin: checkTurnoverMin(today),
    aboveMA60: checkAboveMA60(today, history),
    notOverheated: checkNotOverheated(today, yesterday),
    bullish: checkBullish(today),
    noGap: checkNoGap(today, yesterday),
    notOverbought5d: checkNotOverbought5d(history),
  };

  const passCount = Object.values(conditions).filter(Boolean).length;
  const metrics = calcSignalMetrics(today, yesterday, prior20, history, period);
  const buySignal = evaluateBuySignal(conditions, metrics, period, volMultiplier);

  return {
    ticker: stock.ticker,
    name: stock.name,
    market: stock.market,
    close: today.close,
    changeRate: calcChangeRate(today, yesterday),
    volume: today.volume,
    turnover: today.turnover,
    conditions,
    passCount,
    metrics,
    buySignal,
    period,
  };
}

/**
 * 스크리너 실행: 10가지 조건 모두 통과한 종목만 반환 (API 용)
 */
export function runScreener(stocks: StockData[], period = DEFAULT_PERIOD, volMultiplier = DEFAULT_VOL_MULTIPLIER): ScreenerResult[] {
  return stocks
    .map((s) => evaluateStock(s, period, volMultiplier))
    .filter((r) => r.passCount === 10)
    .sort((a, b) => b.changeRate - a.changeRate);
}

/**
 * 전체 종목 평가 반환: passCount 내림차순, 동점이면 등락률 내림차순 (UI 용)
 * requiredConditions가 주어지면 해당 조건들을 모두 통과한 종목만 반환
 */
export function evaluateAllStocks(
  stocks: StockData[],
  period = DEFAULT_PERIOD,
  requiredConditions?: Array<keyof ScreenerConditions>,
  volMultiplier = DEFAULT_VOL_MULTIPLIER,
): ScreenerResult[] {
  const evaluated = stocks.map((s) => evaluateStock(s, period, volMultiplier));

  const filtered = requiredConditions
    ? evaluated.filter((r) =>
        requiredConditions.every((key) => r.conditions[key]),
      )
    : evaluated;

  return filtered.sort(
    (a, b) => b.passCount - a.passCount || b.changeRate - a.changeRate,
  );
}

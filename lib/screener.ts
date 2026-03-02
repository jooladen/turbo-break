import type {
  StockData,
  StockOHLCV,
  ScreenerConditions,
  ScreenerResult,
} from "./screener-types";

const TURNOVER_MIN = 50_000_000_000; // 500억 원
const VOLUME_SURGE_MULTIPLIER = 2;
const SIDEWAYS_MAX_RANGE = 0.15; // 15%
const TAIL_FILTER_RATIO = 0.99;
const MA60_PERIOD = 60;
const OVERHEAT_MAX_RATE = 8; // %
const GAP_MAX_RATIO = 1.03;
const OVERBOUGHT_5D_MAX = 0.15; // 15%
const LOOKBACK_DAYS = 20;

/**
 * 20일 고가 돌파 (조건 1)
 * 오늘 종가 > history[1..20] 중 최고가
 */
function checkBreakout20(today: StockOHLCV, prior20: StockOHLCV[]): boolean {
  if (prior20.length < LOOKBACK_DAYS) return false;
  const high20 = Math.max(...prior20.slice(0, LOOKBACK_DAYS).map((d) => d.high));
  return today.close > high20;
}

/**
 * 횡보 필터 (조건 2)
 * (20일 최고가 - 20일 최저가) / 20일 최저가 ≤ 15%
 */
function checkSideways(prior20: StockOHLCV[]): boolean {
  if (prior20.length < LOOKBACK_DAYS) return false;
  const slice = prior20.slice(0, LOOKBACK_DAYS);
  const high20 = Math.max(...slice.map((d) => d.high));
  const low20 = Math.min(...slice.map((d) => d.low));
  if (low20 === 0) return false;
  return (high20 - low20) / low20 <= SIDEWAYS_MAX_RANGE;
}

/**
 * 거래량 폭증 (조건 3)
 * 당일 거래량 ≥ 20일 평균 거래량 × 2
 */
function checkVolumeSurge(today: StockOHLCV, prior20: StockOHLCV[]): boolean {
  if (prior20.length < LOOKBACK_DAYS) return false;
  const avgVolume =
    prior20.slice(0, LOOKBACK_DAYS).reduce((sum, d) => sum + d.volume, 0) /
    LOOKBACK_DAYS;
  return today.volume >= avgVolume * VOLUME_SURGE_MULTIPLIER;
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
 * 단일 종목 평가
 */
export function evaluateStock(stock: StockData): ScreenerResult {
  const history = stock.history;
  const today = history[0];
  const yesterday = history[1];
  const prior20 = history.slice(1); // 오늘 제외한 이전 데이터

  const conditions: ScreenerConditions = {
    breakout20: checkBreakout20(today, prior20),
    sideways: checkSideways(prior20),
    volumeSurge: checkVolumeSurge(today, prior20),
    tailFilter: checkTailFilter(today),
    turnoverMin: checkTurnoverMin(today),
    aboveMA60: checkAboveMA60(today, history),
    notOverheated: checkNotOverheated(today, yesterday),
    bullish: checkBullish(today),
    noGap: checkNoGap(today, yesterday),
    notOverbought5d: checkNotOverbought5d(history),
  };

  const passCount = Object.values(conditions).filter(Boolean).length;

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
  };
}

/**
 * 스크리너 실행: 10가지 조건 모두 통과한 종목만 반환 (API 용)
 */
export function runScreener(stocks: StockData[]): ScreenerResult[] {
  return stocks
    .map(evaluateStock)
    .filter((r) => r.passCount === 10)
    .sort((a, b) => b.changeRate - a.changeRate);
}

/**
 * 전체 종목 평가 반환: passCount 내림차순, 동점이면 등락률 내림차순 (UI 용)
 */
export function evaluateAllStocks(stocks: StockData[]): ScreenerResult[] {
  return stocks
    .map(evaluateStock)
    .sort((a, b) => b.passCount - a.passCount || b.changeRate - a.changeRate);
}

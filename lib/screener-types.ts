export type StockOHLCV = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number; // 거래대금 (원)
};

export type StockData = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  history: StockOHLCV[]; // history[0] = 오늘, history[1] = 어제, ... (최소 60일치)
};

export type ScreenerConditions = {
  breakout20: boolean; // 조건 1: 20일 고가 돌파
  sideways: boolean; // 조건 2: 횡보 필터 (박스권 범위 ≤ 15%)
  volumeSurge: boolean; // 조건 3: 거래량 폭증 (≥ 20일 평균 × 2)
  tailFilter: boolean; // 조건 4: 윗꼬리 제거 (종가 ≥ 당일 고가 × 0.99)
  turnoverMin: boolean; // 조건 5: 거래대금 ≥ 500억
  aboveMA60: boolean; // 조건 6: 60일 이동평균 위
  notOverheated: boolean; // 조건 7: 과열 방지 (당일 상승률 < 8%)
  bullish: boolean; // 조건 8: 양봉 (종가 > 시가)
  noGap: boolean; // 조건 9: 갭 제한 (시가 ≤ 전일 종가 × 1.03)
  notOverbought5d: boolean; // 조건 10: 연속 상승 제한 (5일 누적 ≤ 15%)
};

export type BuyGrade = "A" | "B" | "C" | "F";

export type SignalMetrics = {
  volumeMultiple: number; // 당일거래량 / 20일평균거래량
  breakoutPct: number; // (종가 - 20일고가) / 20일고가 × 100
  sidewaysRange: number; // (20일고가 - 20일저가) / 20일저가 × 100
  gain5d: number; // 5일 누적 상승률 (%)
  changeRate: number; // 당일 등락률 (%)
  tailRatio: number; // 종가 / 당일고가 × 100
  gapRatio: number; // 시가 / 전일종가 × 100
  ma60Distance: number; // (종가 - MA60) / MA60 × 100
};

export type BuySignal = {
  score: number; // 0-100 정수
  grade: BuyGrade; // A(≥80) / B(≥65) / C(≥45) / F(<45)
  summary: string; // 한줄 요약
  positives: string[]; // 통과 조건별 수치 포함 긍정 이유
  warnings: string[]; // 미통과 조건별 현재값+기준값 경고
};

export type ScreenerResult = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  close: number;
  changeRate: number; // 당일 상승률 (%)
  volume: number;
  turnover: number; // 거래대금 (원)
  conditions: ScreenerConditions;
  passCount: number; // 통과한 조건 수 (10 = 완전 통과)
  metrics: SignalMetrics;
  buySignal: BuySignal;
};

export type ScreenerApiResponse = {
  date: string;
  market: "KOSPI" | "KOSDAQ" | "ALL";
  totalScanned: number;
  passed: ScreenerResult[];
};

import type { MinuteBar } from "../intraday-types";
import { lookupNameFromTickers } from "./kr-tickers";

/** 간단한 seeded 랜덤 (Mulberry32) */
function createRng(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 종목 코드를 숫자 seed로 변환 */
function tickerToSeed(ticker: string): number {
  return ticker
    .split("")
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0x1234abcd);
}

/** HH:MM 문자열로 변환 */
function toTimeStr(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * KRX 09:00~15:30 분봉 합성 데이터 생성 (390봉)
 *
 * 특징:
 * - GBM(기하 브라운 운동) 기반 현실적 분봉
 * - 09:00~09:30 오프닝: 변동성 2배 + 거래량 3배
 * - 오프닝 레인지 돌파 패턴 의도적 삽입 (seed 기반 재현)
 * - 점심(12:00~13:00) 거래량 감소
 * - 종가(15:20~15:30) 거래량 증가
 */
export function generateIntradayMock(ticker: string, basePrice?: number): MinuteBar[] {
  const rng = createRng(tickerToSeed(ticker));

  // 기준가: 종목 seed로 결정 (10,000 ~ 200,000)
  const base = basePrice ?? Math.round(10000 + rng() * 190000);
  const bars: MinuteBar[] = [];

  let price = base;
  let time = { hour: 9, minute: 0 };

  // 오프닝 레인지 고가/저가 추적
  let orbHigh = -Infinity;
  let orbLow = Infinity;
  let orbDone = false;
  const ORB_MINUTES = 30;

  // 돌파 패턴 결정 (seed 기반)
  const willBreakout = rng() > 0.25; // 75% 확률로 ORB 돌파
  const breakoutType = rng() > 0.5 ? "LONG" : "SHORT";
  const breakoutMinute = ORB_MINUTES + Math.floor(rng() * 60); // 돌파 예정 분봉 (ORB 이후 60분 이내)

  let minuteIndex = 0;

  while (!(time.hour === 15 && time.minute > 30)) {
    const timeStr = toTimeStr(time.hour, time.minute);
    const isOpening = minuteIndex < ORB_MINUTES;
    const isLunch = time.hour >= 12 && time.hour < 13;
    const isClose = time.hour === 15 && time.minute >= 20;

    // 변동성 / 거래량 배율 결정
    const volMultiplier = isOpening ? 3.0 : isLunch ? 0.4 : isClose ? 1.8 : 1.0;
    const volatility = isOpening ? 0.004 : 0.0015;

    // GBM 단계
    const drift = 0; // 중립 드리프트
    const shock = volatility * (rng() * 2 - 1) * Math.sqrt(1);
    const ret = drift + shock;

    const open = price;
    let close = Math.round(open * (1 + ret));

    // ORB 돌파 패턴 주입
    if (!isOpening && !orbDone && willBreakout && minuteIndex === breakoutMinute) {
      if (breakoutType === "LONG") {
        close = Math.round(orbHigh * (1 + 0.005 + rng() * 0.01));
      } else {
        close = Math.round(orbLow * (1 - 0.005 - rng() * 0.01));
      }
      orbDone = true;
    }

    // 봉 고가/저가 생성
    const intraRange = Math.abs(close - open) * (0.5 + rng() * 1.5);
    const high = Math.round(Math.max(open, close) + intraRange * rng());
    const low = Math.round(Math.min(open, close) - intraRange * rng());

    // 거래량 생성
    const baseVolume = Math.round(base * 0.5 + rng() * base * 2); // 가격 기반 거래량
    const volume = Math.max(1, Math.round(baseVolume * volMultiplier * (0.5 + rng())));

    // ORB 구간 고/저가 추적
    if (isOpening) {
      orbHigh = Math.max(orbHigh, high);
      orbLow = Math.min(orbLow, low);
    }

    bars.push({ time: timeStr, open, high, low, close, volume });

    // 다음 봉으로
    price = close;
    minuteIndex++;

    time.minute++;
    if (time.minute >= 60) {
      time.minute = 0;
      time.hour++;
    }

    // 11:30~12:00 건너뜀 (런치브레이크는 없지만 데이터는 생성)
    // KRX는 점심도 거래 있음
  }

  return bars;
}

/** 종목 기본 정보 (이름) 반환 */
export function getMockStockName(ticker: string): string {
  const names: Record<string, string> = {
    "005930": "삼성전자",
    "000660": "SK하이닉스",
    "035420": "NAVER",
    "005380": "현대차",
    "051910": "LG화학",
    "068270": "셀트리온",
    "005490": "POSCO홀딩스",
    "028260": "삼성물산",
    "012330": "현대모비스",
    "066570": "LG전자",
    "003550": "LG",
    "017670": "SK텔레콤",
    "096770": "SK이노베이션",
    "034730": "SK",
    "000270": "기아",
    "326030": "S&T모티브",
    "247540": "에코프로비엠",
    "086520": "에코프로",
    "091990": "셀트리온헬스케어",
    "373220": "LG에너지솔루션",
  };
  return names[ticker] ?? lookupNameFromTickers(ticker) ?? `종목 ${ticker}`;
}

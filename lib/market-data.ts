import type { StockData, StockOHLCV } from "./screener-types";
import { yahooFinanceAdapter } from "./adapters/yahoo-finance-adapter";
import { kiwoomAdapter } from "./adapters/kiwoom-adapter";

// ─────────────────────────────────────────────
// 어댑터 인터페이스
// ─────────────────────────────────────────────

export type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};

// ─────────────────────────────────────────────
// MockAdapter (개발/테스트용)
// ─────────────────────────────────────────────

/** 재현 가능한 시드 기반 난수 생성기 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * 일별 OHLCV 생성
 * - trend: 양수 = 상승 추세, 음수 = 하락 추세
 * - volatility: 일별 변동폭 (0.01 = 1%)
 */
function generateHistory(
  seed: number,
  basePrice: number,
  days: number,
  trend: number,
  volatility: number,
  baseTurnover: number,
): StockOHLCV[] {
  const rand = seededRandom(seed);
  const history: StockOHLCV[] = [];

  let price = basePrice;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date("2026-03-03");
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const dailyReturn = trend + (rand() - 0.5) * volatility * 2;
    const open = price * (1 + (rand() - 0.5) * 0.005);
    const close = price * (1 + dailyReturn);
    const high = Math.max(open, close) * (1 + rand() * 0.008);
    const low = Math.min(open, close) * (1 - rand() * 0.008);
    const volume = Math.floor((baseTurnover / close) * (0.7 + rand() * 0.6));
    const turnover = Math.floor(volume * close);

    history.unshift({
      date: dateStr,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
      turnover,
    });

    price = close;
  }

  return history;
}

/**
 * 20일 고가 돌파 패턴을 가진 종목 히스토리 생성
 * - 1~60일 전: 박스권 횡보 (≤15% 범위)
 * - 오늘(0): 박스권 돌파 + 거래량 폭증
 */
function generateBreakoutStock(
  seed: number,
  basePrice: number,
  marketCap: number,
): StockOHLCV[] {
  const rand = seededRandom(seed);
  const history: StockOHLCV[] = [];
  const sidewaysVolatility = 0.006; // 박스권 내 변동
  const avgTurnover = marketCap;

  let price = basePrice * 0.97;

  // 60일 전 ~ 1일 전: 박스권 횡보
  for (let i = 61; i >= 1; i--) {
    const date = new Date("2026-03-03");
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const dailyReturn = (rand() - 0.5) * sidewaysVolatility * 2;
    // 박스권 유지: 기준가의 ±7% 내
    const clampedReturn = Math.max(-0.007, Math.min(0.007, dailyReturn));
    const open = price * (1 + (rand() - 0.5) * 0.003);
    const close = price * (1 + clampedReturn);
    const high = Math.max(open, close) * (1 + rand() * 0.005);
    const low = Math.min(open, close) * (1 - rand() * 0.005);
    const volume = Math.floor((avgTurnover / close) * (0.5 + rand() * 0.4));
    const turnover = Math.floor(volume * close);

    history.push({
      date: dateStr,
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume,
      turnover,
    });

    price = close;
  }

  // 오늘: 돌파 캔들
  const yesterday = history[history.length - 1];
  const changeRate = 0.04 + rand() * 0.03; // 4~7% 상승
  const todayOpen = yesterday.close * (1 + rand() * 0.01); // 소폭 갭 (1% 이내)
  const todayClose = yesterday.close * (1 + changeRate);
  const todayHigh = todayClose * (1 + rand() * 0.005); // 윗꼬리 최소화
  const todayLow = Math.min(todayOpen, todayClose) * (1 - rand() * 0.005);
  // 거래량 폭증: 평균의 2.5~4배
  const avgVol =
    history.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  const todayVolume = Math.floor(avgVol * (2.5 + rand() * 1.5));
  const todayTurnover = Math.floor(todayVolume * todayClose);

  history.push({
    date: "2026-03-03",
    open: Math.round(todayOpen),
    high: Math.round(todayHigh),
    low: Math.round(todayLow),
    close: Math.round(todayClose),
    volume: todayVolume,
    turnover: todayTurnover,
  });

  // history[0] = 오늘 순서로 역순 정렬
  return history.reverse();
}

const MOCK_KOSPI: Array<{ ticker: string; name: string }> = [
  { ticker: "005930", name: "삼성전자" },
  { ticker: "000660", name: "SK하이닉스" },
  { ticker: "005380", name: "현대차" },
  { ticker: "035420", name: "NAVER" },
  { ticker: "051910", name: "LG화학" },
  { ticker: "006400", name: "삼성SDI" },
  { ticker: "035720", name: "카카오" },
  { ticker: "207940", name: "삼성바이오로직스" },
  { ticker: "005490", name: "POSCO홀딩스" },
  { ticker: "028260", name: "삼성물산" },
  { ticker: "068270", name: "셀트리온" },
  { ticker: "012330", name: "현대모비스" },
  { ticker: "105560", name: "KB금융" },
  { ticker: "055550", name: "신한지주" },
  { ticker: "066570", name: "LG전자" },
  { ticker: "003550", name: "LG" },
  { ticker: "015760", name: "한국전력" },
  { ticker: "034730", name: "SK" },
  { ticker: "018260", name: "삼성에스디에스" },
  { ticker: "032830", name: "삼성생명" },
];

const MOCK_KOSDAQ: Array<{ ticker: string; name: string }> = [
  { ticker: "247540", name: "에코프로비엠" },
  { ticker: "086520", name: "에코프로" },
  { ticker: "373220", name: "LG에너지솔루션" },
  { ticker: "196170", name: "알테오젠" },
  { ticker: "091990", name: "셀트리온헬스케어" },
  { ticker: "112040", name: "위메이드" },
  { ticker: "293490", name: "카카오게임즈" },
  { ticker: "259960", name: "크래프톤" },
  { ticker: "352820", name: "하이브" },
  { ticker: "214150", name: "클래시스" },
  { ticker: "039030", name: "이오테크닉스" },
  { ticker: "263750", name: "펄어비스" },
  { ticker: "357780", name: "솔브레인" },
  { ticker: "036930", name: "주성엔지니어링" },
  { ticker: "095660", name: "네오위즈" },
];

// 돌파 패턴 종목 인덱스 (MockAdapter에서 이 종목들은 돌파 패턴으로 생성)
const BREAKOUT_INDICES_KOSPI = [2, 7, 11, 14]; // 현대차, 삼성바이오, 현대모비스, LG전자
const BREAKOUT_INDICES_KOSDAQ = [3, 9, 11]; // 알테오젠, 클래시스, 펄어비스

export class MockAdapter implements MarketDataAdapter {
  async getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]> {
    const list = market === "KOSPI" ? MOCK_KOSPI : MOCK_KOSDAQ;
    return list.map((s) => s.ticker);
  }

  async getStockName(ticker: string): Promise<string> {
    const all = [...MOCK_KOSPI, ...MOCK_KOSDAQ];
    return all.find((s) => s.ticker === ticker)?.name ?? ticker;
  }

  async getHistory(ticker: string, days: number): Promise<StockOHLCV[]> {
    const kospiIdx = MOCK_KOSPI.findIndex((s) => s.ticker === ticker);
    const kosdaqIdx = MOCK_KOSDAQ.findIndex((s) => s.ticker === ticker);
    const idx = kospiIdx !== -1 ? kospiIdx : kosdaqIdx;
    const isBreakout =
      (kospiIdx !== -1 && BREAKOUT_INDICES_KOSPI.includes(kospiIdx)) ||
      (kosdaqIdx !== -1 && BREAKOUT_INDICES_KOSDAQ.includes(kosdaqIdx));

    const seed = parseInt(ticker) % 9999 || idx + 1;
    const basePrice = 10000 + (seed * 37) % 290000;
    const baseTurnover = 60_000_000_000 + (seed * 13) % 940_000_000_000; // 600억~1조

    if (isBreakout) {
      return generateBreakoutStock(seed, basePrice, baseTurnover);
    }

    // 일반 종목: 다양한 패턴
    const trend = ((seed % 7) - 3) * 0.0002;
    const volatility = 0.01 + (seed % 5) * 0.003;
    return generateHistory(seed, basePrice, days, trend, volatility, baseTurnover);
  }
}

// ─────────────────────────────────────────────
// 어댑터 팩토리 + 전체 종목 데이터 조회
// ─────────────────────────────────────────────

export function createAdapter(
  type?: string,
): MarketDataAdapter {
  // URL 파라미터 > 환경변수 > mock 순으로 우선순위
  const adapterType = type ?? process.env["MARKET_DATA_ADAPTER"] ?? "mock";

  switch (adapterType) {
    case "yahoo":
      return yahooFinanceAdapter;
    case "kiwoom":
      return kiwoomAdapter;
    default:
      return new MockAdapter();
  }
}

export async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days = 65,
): Promise<StockData[]> {
  const markets: Array<"KOSPI" | "KOSDAQ"> =
    market === "ALL" ? ["KOSPI", "KOSDAQ"] : [market];

  const results: StockData[] = [];

  for (const m of markets) {
    const tickers = await adapter.getStockList(m);
    const settled = await Promise.allSettled(
      tickers.map(async (ticker) => {
        const [history, name] = await Promise.all([
          adapter.getHistory(ticker, days),
          adapter.getStockName(ticker),
        ]);
        return { ticker, name, market: m, history } satisfies StockData;
      }),
    );
    // 실패한 종목(상장폐지 등)은 건너뜀
    for (const s of settled) {
      if (s.status === "fulfilled") results.push(s.value);
    }
  }

  return results;
}

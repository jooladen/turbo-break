import YahooFinance from "yahoo-finance2";
import type { MarketDataAdapter } from "../market-data";
import type { StockOHLCV } from "../screener-types";
import logger from "../logger";
import {
  KOSDAQ_TICKERS,
  KOSPI_TICKERS,
  lookupNameFromTickers,
  toYahooTicker,
} from "./kr-tickers";

// historical()은 Yahoo API 제거로 deprecated → chart() 직접 사용
const yf = new YahooFinance({ suppressNotices: ["ripHistorical"] });

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type ChartQuote = {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

function quoteToStockOHLCV(q: ChartQuote): StockOHLCV | null {
  if (
    q.open === null ||
    q.high === null ||
    q.low === null ||
    q.close === null ||
    q.volume === null
  ) {
    return null;
  }
  return {
    date: q.date.toISOString().slice(0, 10),
    open: Math.round(q.open),
    high: Math.round(q.high),
    low: Math.round(q.low),
    close: Math.round(q.close),
    volume: q.volume,
    // Yahoo Finance는 거래대금을 제공하지 않아 volume * close로 추정
    turnover: Math.round(q.volume * q.close),
  };
}

export const yahooFinanceAdapter: MarketDataAdapter = {
  async getStockList(market) {
    if (market === "KOSPI") return Object.keys(KOSPI_TICKERS);
    if (market === "KOSDAQ") return Object.keys(KOSDAQ_TICKERS);
    return [...Object.keys(KOSPI_TICKERS), ...Object.keys(KOSDAQ_TICKERS)];
  },

  async getHistory(ticker, days) {
    const yahooTicker = toYahooTicker(ticker);
    logger.info(`[Yahoo] ${yahooTicker} 요청중...`);
    const result = await yf.chart(yahooTicker, {
      period1: daysAgoStr(days),
      interval: "1d",
    });
    logger.info(`[Yahoo] ${yahooTicker} 완료 (${(result.quotes as ChartQuote[]).length}봉)`);

    const quotes = (result.quotes as ChartQuote[])
      .map(quoteToStockOHLCV)
      .filter((q): q is StockOHLCV => q !== null);

    // history[0] = 오늘 순서로 역순 정렬
    return quotes.reverse();
  },

  async getStockName(ticker) {
    // 매핑 테이블 우선 (API 호출 없이 빠르게 반환)
    const mapped = lookupNameFromTickers(ticker);
    if (mapped) return mapped;

    const yahooTicker = toYahooTicker(ticker);
    const result = await yf.chart(yahooTicker, {
      period1: new Date().toISOString().slice(0, 10),
      interval: "1d",
    });
    return result.meta.longName ?? result.meta.shortName ?? ticker;
  },
};

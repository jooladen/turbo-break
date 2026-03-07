import type { MarketDataAdapter } from "../market-data";
import type { StockOHLCV } from "../screener-types";
import { lookupNameFromTickers } from "./kr-tickers";

// 키움 REST API (openapi.kiwoom.com) 기반 어댑터
// 2025년 3월 정식 출시된 키움 REST API 사용
// API Key + IP 화이트리스트 등록 필수

function getKiwoomConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env["KIWOOM_API_KEY"];
  const baseUrl =
    process.env["KIWOOM_API_BASE_URL"] ?? "https://openapi.kiwoom.com";

  if (!apiKey) {
    throw new Error(
      "키움 REST API 어댑터 사용 시 KIWOOM_API_KEY 환경변수가 필요합니다.",
    );
  }

  return { apiKey, baseUrl };
}

// 키움 API 응답 → StockOHLCV 변환
// 실제 응답 구조는 openapi.kiwoom.com 문서 확인 후 업데이트 필요
function parseKiwoomOhlcv(raw: unknown): StockOHLCV {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("dt" in raw) ||
    !("open" in raw) ||
    !("high" in raw) ||
    !("low" in raw) ||
    !("close" in raw) ||
    !("vol" in raw)
  ) {
    throw new Error("키움 API 응답 형식이 예상과 다릅니다.");
  }

  const r = raw as Record<string, unknown>;
  const close = Number(r["close"]);
  const volume = Number(r["vol"]);

  return {
    date: String(r["dt"]).slice(0, 10),
    open: Number(r["open"]),
    high: Number(r["high"]),
    low: Number(r["low"]),
    close,
    volume,
    // 거래대금 필드명은 API 문서 확인 후 업데이트 (임시: volume * close)
    turnover: Number(r["turnover"] ?? volume * close),
  };
}

export const kiwoomAdapter: MarketDataAdapter = {
  async getStockList(market) {
    const { apiKey, baseUrl } = getKiwoomConfig();
    const res = await fetch(`${baseUrl}/stock/list?market=${market}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      throw new Error(
        `키움 API 종목 목록 조회 실패: ${res.status} ${res.statusText}`,
      );
    }

    const data: unknown = await res.json();

    if (
      !Array.isArray(data) &&
      (typeof data !== "object" || data === null || !("items" in data))
    ) {
      throw new Error("키움 API 종목 목록 응답 형식이 예상과 다릅니다.");
    }

    const items: unknown[] = Array.isArray(data)
      ? data
      : (data as { items: unknown[] }).items;

    return items
      .map((item) => {
        if (typeof item === "object" && item !== null && "ticker" in item) {
          return String((item as { ticker: unknown }).ticker);
        }
        return null;
      })
      .filter((t): t is string => t !== null);
  },

  async getHistory(ticker, days, endDate?) {
    const { apiKey, baseUrl } = getKiwoomConfig();
    const res = await fetch(
      `${baseUrl}/stock/history?ticker=${ticker}&days=${days}${endDate ? `&endDate=${endDate}` : ""}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    if (!res.ok) {
      throw new Error(
        `키움 API 히스토리 조회 실패 (${ticker}): ${res.status} ${res.statusText}`,
      );
    }

    const data: unknown = await res.json();

    const items: unknown[] = Array.isArray(data)
      ? data
      : (typeof data === "object" && data !== null && "items" in data)
        ? (data as { items: unknown[] }).items
        : [];

    // history[0] = 오늘 순서로 역순 정렬
    return items.map(parseKiwoomOhlcv).reverse();
  },

  async getStockName(ticker) {
    // 매핑 테이블 우선
    const mapped = lookupNameFromTickers(ticker);
    if (mapped) return mapped;

    const { apiKey, baseUrl } = getKiwoomConfig();
    const res = await fetch(`${baseUrl}/stock/info?ticker=${ticker}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) return ticker;

    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && "name" in data) {
      return String((data as { name: unknown }).name);
    }

    return ticker;
  },
};

// KOSPI/KOSDAQ 종목 → Yahoo Finance 티커 매핑
// KOSPI: {종목코드}.KS, KOSDAQ: {종목코드}.KQ

export type KrTickerInfo = {
  yahoo: string;
  name: string;
};

export const KOSPI_TICKERS: Record<string, KrTickerInfo> = {
  "005930": { yahoo: "005930.KS", name: "삼성전자" },
  "000660": { yahoo: "000660.KS", name: "SK하이닉스" },
  "005380": { yahoo: "005380.KS", name: "현대차" },
  "035420": { yahoo: "035420.KS", name: "NAVER" },
  "051910": { yahoo: "051910.KS", name: "LG화학" },
  "006400": { yahoo: "006400.KS", name: "삼성SDI" },
  "035720": { yahoo: "035720.KS", name: "카카오" },
  "207940": { yahoo: "207940.KS", name: "삼성바이오로직스" },
  "005490": { yahoo: "005490.KS", name: "POSCO홀딩스" },
  "028260": { yahoo: "028260.KS", name: "삼성물산" },
  "068270": { yahoo: "068270.KS", name: "셀트리온" },
  "012330": { yahoo: "012330.KS", name: "현대모비스" },
  "105560": { yahoo: "105560.KS", name: "KB금융" },
  "055550": { yahoo: "055550.KS", name: "신한지주" },
  "066570": { yahoo: "066570.KS", name: "LG전자" },
  "003550": { yahoo: "003550.KS", name: "LG" },
  "015760": { yahoo: "015760.KS", name: "한국전력" },
  "034730": { yahoo: "034730.KS", name: "SK" },
  "018260": { yahoo: "018260.KS", name: "삼성에스디에스" },
  "032830": { yahoo: "032830.KS", name: "삼성생명" },
};

export const KOSDAQ_TICKERS: Record<string, KrTickerInfo> = {
  "247540": { yahoo: "247540.KQ", name: "에코프로비엠" },
  "086520": { yahoo: "086520.KQ", name: "에코프로" },
  "373220": { yahoo: "373220.KQ", name: "LG에너지솔루션" },
  "196170": { yahoo: "196170.KQ", name: "알테오젠" },
  // 091990 셀트리온헬스케어 → 셀트리온과 합병(2024), 상장폐지로 제거
  "112040": { yahoo: "112040.KQ", name: "위메이드" },
  "293490": { yahoo: "293490.KQ", name: "카카오게임즈" },
  "259960": { yahoo: "259960.KQ", name: "크래프톤" },
  "352820": { yahoo: "352820.KQ", name: "하이브" },
  "214150": { yahoo: "214150.KQ", name: "클래시스" },
  "039030": { yahoo: "039030.KQ", name: "이오테크닉스" },
  "263750": { yahoo: "263750.KQ", name: "펄어비스" },
  "357780": { yahoo: "357780.KQ", name: "솔브레인" },
  "036930": { yahoo: "036930.KQ", name: "주성엔지니어링" },
  "095660": { yahoo: "095660.KQ", name: "네오위즈" },
};

export function toYahooTicker(ticker: string): string {
  return (
    KOSPI_TICKERS[ticker]?.yahoo ??
    KOSDAQ_TICKERS[ticker]?.yahoo ??
    `${ticker}.KS`
  );
}

export function lookupNameFromTickers(ticker: string): string | undefined {
  return KOSPI_TICKERS[ticker]?.name ?? KOSDAQ_TICKERS[ticker]?.name;
}

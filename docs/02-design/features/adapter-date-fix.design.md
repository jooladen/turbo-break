# Design: 전체 어댑터 날짜 반영

> **Feature**: adapter-date-fix
> **Phase**: Design ✅
> **Created**: 2026-03-07
> **Version**: 1.0
> **Author**: frontend-architect

---

## 1. 아키텍처 개요

```
[스크리너 페이지]
  app/(dashboard)/screener/page.tsx
    ← searchParams.date ("YYYY-MM-DD")
    → fetchAllStocks(adapter, market, 65, date)   ← endDate 전달 (신규)

[fetchAllStocks]
  lib/market-data.ts
    → adapter.getHistory(ticker, days, endDate)    ← endDate 전달 (신규)

[어댑터별 처리]
  MockAdapter     → referenceDate = endDate ?? today → generateHistory / generateBreakoutStock
  YahooAdapter    → period1 = endDate - days, period2 = endDate → yf.chart()
  KiwoomAdapter   → URL query &endDate=YYYY-MM-DD → fetch()
```

---

## 2. 인터페이스 변경

### 2.1 MarketDataAdapter (lib/market-data.ts)

```ts
// Before
export type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};

// After
export type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number, endDate?: string): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};
```

- `endDate`: `"YYYY-MM-DD"` 형식, optional
- 미지정 시 오늘 날짜 사용 (하위 호환)

### 2.2 fetchAllStocks (lib/market-data.ts)

```ts
// Before
export async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days = 65,
): Promise<StockData[]>

// After
export async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days = 65,
  endDate?: string,
): Promise<StockData[]>
```

---

## 3. 어댑터별 구현 상세

### 3.1 MockAdapter

**데이터 생성 함수에 `referenceDate: Date` 파라미터 추가:**

```ts
function generateHistory(
  seed, basePrice, days, trend, volatility, baseTurnover,
  referenceDate: Date,  // 추가
): StockOHLCV[]

function generateBreakoutStock(
  seed, basePrice, marketCap,
  referenceDate: Date,  // 추가
): StockOHLCV[]
```

**변환 로직:**
```ts
const refDate = endDate ? new Date(endDate + "T00:00:00") : new Date();
```

- `"T00:00:00"` 접미사로 로컬 타임존 기준 파싱 보장
- `new Date(referenceDate)`로 원본 Date 객체 보호 (방어적 복사)

### 3.2 Yahoo Finance 어댑터

```ts
async getHistory(ticker, days, endDate?) {
  const end = endDate ? new Date(endDate + "T00:00:00") : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const result = await yf.chart(yahooTicker, {
    period1: start.toISOString().slice(0, 10),
    period2: end.toISOString().slice(0, 10),
    interval: "1d",
  });
}
```

- 기존 `daysAgoStr()` 함수는 `getHistory` 내에서만 사용되므로 더 이상 호출하지 않음
- `period2` 설정으로 종료일 기준 고정

### 3.3 Kiwoom 어댑터

```ts
async getHistory(ticker, days, endDate?) {
  const url = `${baseUrl}/stock/history?ticker=${ticker}&days=${days}${
    endDate ? `&endDate=${endDate}` : ""
  }`;
}
```

- 서버 측에서 `endDate` 쿼리 파라미터를 지원한다고 가정
- 미지정 시 쿼리에 포함하지 않아 기존 동작 유지

---

## 4. 데이터 흐름

```
사용자: /screener?date=2026-03-05&adapter=mock
  │
  ▼
page.tsx: date = "2026-03-05"
  │
  ▼
fetchAllStocks(adapter, "ALL", 65, "2026-03-05")
  │
  ▼
MockAdapter.getHistory("005930", 65, "2026-03-05")
  │
  ├─ refDate = new Date("2026-03-05T00:00:00")
  ├─ isBreakout? → generateBreakoutStock(seed, price, turnover, refDate)
  └─ else       → generateHistory(seed, price, 65, trend, vol, turnover, refDate)
       │
       ├─ today = new Date(refDate)  ← 2026-03-05 기준
       ├─ for i = 64..0 → date = today - i days
       └─ 시드 기반 OHLCV 생성 (날짜가 다르면 결과도 다름)
```

---

## 5. 영향 범위

### 5.1 변경 파일 (4개)

| 파일 | 변경 범위 | 위험도 |
|------|-----------|--------|
| `lib/market-data.ts` | 인터페이스 + MockAdapter + fetchAllStocks | 낮음 |
| `lib/adapters/yahoo-finance-adapter.ts` | getHistory 시그니처 + period 계산 | 낮음 |
| `lib/adapters/kiwoom-adapter.ts` | getHistory 시그니처 + URL 파라미터 | 낮음 |
| `app/(dashboard)/screener/page.tsx` | fetchAllStocks 호출 인자 추가 | 낮음 |

### 5.2 미변경 파일

| 파일 | 이유 |
|------|------|
| `lib/screener.ts` | history 배열만 소비, 날짜 무관 |
| `lib/screener-types.ts` | 타입 정의 변경 불필요 |
| `ScreenerControls.tsx` | 이미 date를 form으로 전송 중 |
| `ScreenerTable.tsx` | props만 받아서 렌더링 |

---

## 6. 구현 순서

| 순서 | 작업 | 의존성 |
|------|------|--------|
| 1 | `MarketDataAdapter` 인터페이스에 `endDate?` 추가 | 없음 |
| 2 | `generateHistory`, `generateBreakoutStock`에 `referenceDate` 추가 | 1 |
| 3 | `MockAdapter.getHistory`에서 `endDate` → `referenceDate` 변환 | 1, 2 |
| 4 | `fetchAllStocks`에 `endDate?` 추가 및 전달 | 1 |
| 5 | Yahoo 어댑터 `getHistory` 수정 | 1 |
| 6 | Kiwoom 어댑터 `getHistory` 수정 | 1 |
| 7 | `page.tsx`에서 `date` → `fetchAllStocks` 전달 | 4 |

---

## 7. 검증 계획

| # | 항목 | 방법 | 기대 결과 |
|---|------|------|-----------|
| 1 | 타입 안전성 | `pnpm type-check` | 에러 0 |
| 2 | 빌드 | `pnpm build` | 성공 |
| 3 | 날짜별 결과 차이 | `?date=2026-03-05` vs `?date=2026-03-04` | 결과 상이 |
| 4 | 기본값 동작 | 날짜 미지정 접속 | 오늘 기준 동작 |
| 5 | 하위 호환 | `endDate` 없이 `getHistory(ticker, 65)` 호출 | 정상 동작 |

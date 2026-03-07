# Gap Analysis: 전체 어댑터 날짜 반영 + toISOString UTC 버그 수정

> **Feature**: adapter-date-fix
> **Phase**: Check (Gap Analysis)
> **Analyzed**: 2026-03-07 (v2 업데이트)
> **Match Rate**: 100%
> **Author**: gap-detector

---

## 1. 분석 요약

| 항목 | 값 |
|------|-----|
| 디자인 요구사항 (endDate 전달) | 7개 |
| toISOString UTC 버그 수정 | 7곳 |
| 구현 완료 | 14개 |
| 미구현 | 0개 |
| 부분 구현 | 0개 |
| Match Rate | **100%** |

---

## 2. 항목별 비교

### 2.1 MarketDataAdapter 인터페이스 변경 (Design 2.1)

| 항목 | 상태 | 비고 |
|------|------|------|
| `getHistory` 시그니처에 `endDate?: string` 추가 | ✅ 완료 | `market-data.ts:11` |
| optional 파라미터로 하위 호환 유지 | ✅ 완료 | `endDate?` 물음표 확인 |

**디자인:**
```ts
getHistory(ticker: string, days: number, endDate?: string): Promise<StockOHLCV[]>;
```

**구현 (market-data.ts:11):**
```ts
getHistory(ticker: string, days: number, endDate?: string): Promise<StockOHLCV[]>;
```

**결과: 100% 일치**

---

### 2.2 fetchAllStocks 시그니처 변경 (Design 2.2)

| 항목 | 상태 | 비고 |
|------|------|------|
| `endDate?: string` 4번째 파라미터 추가 | ✅ 완료 | `market-data.ts:261` |
| `adapter.getHistory` 호출 시 `endDate` 전달 | ✅ 완료 | `market-data.ts:273` |

**디자인:**
```ts
export async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days = 65,
  endDate?: string,
): Promise<StockData[]>
```

**구현 (market-data.ts:257-262):**
```ts
export async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days = 65,
  endDate?: string,
): Promise<StockData[]>
```

**결과: 100% 일치**

---

### 2.3 MockAdapter — generateHistory (Design 3.1)

| 항목 | 상태 | 비고 |
|------|------|------|
| `referenceDate: Date` 파라미터 추가 | ✅ 완료 | `market-data.ts:40` |
| `const today = new Date(referenceDate)` 방어적 복사 | ✅ 완료 | `market-data.ts:47` |

**디자인:**
```ts
function generateHistory(
  seed, basePrice, days, trend, volatility, baseTurnover,
  referenceDate: Date,
): StockOHLCV[]
```

**구현 (market-data.ts:33-41):**
```ts
function generateHistory(
  seed: number, basePrice: number, days: number,
  trend: number, volatility: number, baseTurnover: number,
  referenceDate: Date,
): StockOHLCV[]
```

**결과: 100% 일치**

---

### 2.4 MockAdapter — generateBreakoutStock (Design 3.1)

| 항목 | 상태 | 비고 |
|------|------|------|
| `referenceDate: Date` 파라미터 추가 | ✅ 완료 | `market-data.ts:88` |
| `const today = new Date(referenceDate)` 방어적 복사 | ✅ 완료 | `market-data.ts:97` |

**결과: 100% 일치**

---

### 2.5 MockAdapter.getHistory — endDate 변환 (Design 3.1)

| 항목 | 상태 | 비고 |
|------|------|------|
| `endDate?: string` 파라미터 수신 | ✅ 완료 | `market-data.ts:213` |
| `new Date(endDate + "T00:00:00")` 변환 | ✅ 완료 | `market-data.ts:224` |
| 미지정 시 `new Date()` 사용 | ✅ 완료 | `market-data.ts:224` |
| `generateBreakoutStock` 호출 시 `refDate` 전달 | ✅ 완료 | `market-data.ts:227` |
| `generateHistory` 호출 시 `refDate` 전달 | ✅ 완료 | `market-data.ts:233` |

**디자인:**
```ts
const refDate = endDate ? new Date(endDate + "T00:00:00") : new Date();
```

**구현 (market-data.ts:224):**
```ts
const refDate = endDate ? new Date(endDate + "T00:00:00") : new Date();
```

**결과: 100% 일치**

---

### 2.6 Yahoo Finance 어댑터 (Design 3.2)

| 항목 | 상태 | 비고 |
|------|------|------|
| `endDate?` 파라미터 수신 | ✅ 완료 | `yahoo-finance-adapter.ts:59` |
| `end` = endDate 기반 Date 생성 | ✅ 완료 | `yahoo-finance-adapter.ts:62` |
| `start` = end - days 계산 | ✅ 완료 | `yahoo-finance-adapter.ts:63-64` |
| `period1` 설정 | ✅ 완료 | `yahoo-finance-adapter.ts:66` |
| `period2` 설정 | ✅ 완료 | `yahoo-finance-adapter.ts:67` |

**디자인:**
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

**구현 (yahoo-finance-adapter.ts:59-69):**
```ts
async getHistory(ticker, days, endDate?) {
  const yahooTicker = toYahooTicker(ticker);
  logger.info(`[Yahoo] ${yahooTicker} 요청중...`);
  const end = endDate ? new Date(endDate + "T00:00:00") : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const result = await yf.chart(yahooTicker, {
    period1: start.toISOString().slice(0, 10),
    period2: end.toISOString().slice(0, 10),
    interval: "1d",
  });
```

**결과: 100% 일치** (로깅 코드는 기존 코드 유지, 핵심 로직 동일)

---

### 2.7 Kiwoom 어댑터 (Design 3.3)

| 항목 | 상태 | 비고 |
|------|------|------|
| `endDate?` 파라미터 수신 | ✅ 완료 | `kiwoom-adapter.ts:91` |
| URL에 `&endDate=` 조건부 추가 | ✅ 완료 | `kiwoom-adapter.ts:94` |

**디자인:**
```ts
`${baseUrl}/stock/history?ticker=${ticker}&days=${days}${endDate ? `&endDate=${endDate}` : ""}`
```

**구현 (kiwoom-adapter.ts:94):**
```ts
`${baseUrl}/stock/history?ticker=${ticker}&days=${days}${endDate ? `&endDate=${endDate}` : ""}`
```

**결과: 100% 일치**

---

### 2.8 page.tsx — date 전달 (Design 4 데이터 흐름)

| 항목 | 상태 | 비고 |
|------|------|------|
| `fetchAllStocks(adapter, market, 65, date)` 호출 | ✅ 완료 | `page.tsx:42` |

**디자인:**
```
fetchAllStocks(adapter, "ALL", 65, "2026-03-05")
```

**구현 (page.tsx:42):**
```ts
const stocks = await fetchAllStocks(adapter, market, 65, date);
```

**결과: 100% 일치**

---

## 3. toISOString() UTC 밀림 버그 수정 (v2 추가)

### 3.1 버그 원인

```
KST 2026-03-05 00:00:00 → UTC 2026-03-04 15:00:00
→ toISOString() = "2026-03-04T15:00:00.000Z"
→ .slice(0, 10) = "2026-03-04"  ← 하루 밀림!
```

### 3.2 수정 방법: 공용 헬퍼 `lib/date-utils.ts` 신규 생성

```ts
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

### 3.3 수정 대상 7곳 전수 검사

| # | 파일 | 라인 | Before | After | 상태 |
|---|------|------|--------|-------|------|
| 1 | `lib/market-data.ts` | 54 | `date.toISOString().slice(0, 10)` | `toLocalDateStr(date)` | ✅ |
| 2 | `lib/market-data.ts` | 100 | `today.toISOString().slice(0, 10)` | `toLocalDateStr(today)` | ✅ |
| 3 | `lib/market-data.ts` | 106 | `date.toISOString().slice(0, 10)` | `toLocalDateStr(date)` | ✅ |
| 4 | `yahoo-finance-adapter.ts` | 67 | `start.toISOString().slice(0, 10)` | `toLocalDateStr(start)` | ✅ |
| 5 | `yahoo-finance-adapter.ts` | 68 | `end.toISOString().slice(0, 10)` | `toLocalDateStr(end)` | ✅ |
| 6 | `screener/page.tsx` | 34 | `new Date().toISOString().slice(0, 10)` | `toLocalDateStr(new Date())` | ✅ |
| 7 | `app/api/screener/route.ts` | 30 | `new Date().toISOString().slice(0, 10)` | `toLocalDateStr(new Date())` | ✅ |

### 3.4 수정 불필요 확인 (4곳)

| # | 파일 | 라인 | 이유 | 상태 |
|---|------|------|------|------|
| 8 | `yahoo-finance-adapter.ts` | 19 | `daysAgoStr()` — dead code, 미사용 | ✅ 무해 |
| 9 | `yahoo-finance-adapter.ts` | 42 | `quoteToStockOHLCV` — Yahoo가 UTC 자정 Date를 주므로 정확 | ✅ 무해 |
| 10 | `yahoo-finance-adapter.ts` | 88 | `getStockName` — 날짜 정밀도 무관 | ✅ 무해 |
| 11 | `kiwoom-adapter.ts` | 전체 | `toISOString` 미사용, 서버 응답 문자열 직접 사용 | ✅ 무해 |

---

## 4. 검증 결과

| # | 검증 항목 | 결과 |
|---|-----------|------|
| 1 | `pnpm type-check` 통과 | ✅ 에러 0 |
| 2 | `pnpm build` 성공 | ✅ 성공 |
| 3 | 미변경 파일 확인 (screener.ts, types, Controls, Table, kiwoom-adapter) | ✅ 변경 없음 |
| 4 | 신규 파일 `lib/date-utils.ts` 생성 | ✅ 확인 |
| 5 | 3개 파일에서 import 추가 (market-data, yahoo-adapter, page.tsx, route.ts) | ✅ 확인 |

---

## 5. 미사용 코드 참고

| 항목 | 상태 | 비고 |
|------|------|------|
| `daysAgoStr()` 함수 (yahoo-finance-adapter.ts:16-19) | 잔존 | dead code. 내부에 `toISOString` 패턴 잔존하나 미호출이므로 무해. 향후 정리 대상 |

---

## 6. 최종 판정

```
Match Rate: 100% (14/14 항목 완전 일치)
─────────────────────────────────────────────────
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ → [Report] ⏳
─────────────────────────────────────────────────
판정: PASS
  - endDate 파라미터 전달: 7/7 완전 일치
  - toISOString UTC 버그 수정: 7/7 완전 수정
다음 단계: /pdca report adapter-date-fix
```

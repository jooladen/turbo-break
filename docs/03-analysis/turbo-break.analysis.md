# turbo-break (20일 고가 돌파 스크리너) Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: turbo-break
> **Analyst**: gap-detector
> **Date**: 2026-03-03
> **Status**: Completed
> **Design Doc**: [turbo-break.design.md](../02-design/features/turbo-break.design.md)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

설계 문서(`turbo-break.design.md`)와 실제 구현 코드 간의 차이를 식별하여 Match Rate를 산출한다.
특히 이번 세션에서 추가된 실시간 데이터 어댑터(Yahoo Finance, 키움 REST API) 확장이 설계 원칙을 준수했는지 평가한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/turbo-break.design.md`
- **Implementation Path**: `lib/`, `lib/adapters/`, `app/api/screener/`, `app/(dashboard)/screener/`
- **Analysis Date**: 2026-03-03

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 File Structure

| Design | Implementation | Status | Notes |
|--------|----------------|--------|-------|
| `lib/screener-types.ts` | `lib/screener-types.ts` | Match | |
| `lib/screener.ts` | `lib/screener.ts` | Match | |
| `lib/market-data.ts` | `lib/market-data.ts` | Match | |
| `app/api/screener/route.ts` | `app/api/screener/route.ts` | Match | |
| `app/(dashboard)/screener/page.tsx` | `app/(dashboard)/screener/page.tsx` | Match | |
| `app/(dashboard)/screener/ScreenerTable.tsx` | `app/(dashboard)/screener/ScreenerTable.tsx` | Match | |
| - | `lib/adapters/kr-tickers.ts` | Added | 종목 매핑 테이블 (설계에 없음) |
| - | `lib/adapters/yahoo-finance-adapter.ts` | Added | Yahoo Finance 어댑터 (설계에 없음) |
| - | `lib/adapters/kiwoom-adapter.ts` | Added | 키움 REST API 어댑터 (설계에 없음) |

**파일 구조 Match Rate: 100% (6/6 설계 항목 구현), 추가 파일 3개**

### 2.2 Type Definitions (`screener-types.ts`)

#### StockOHLCV

| Field | Design | Implementation | Status |
|-------|--------|----------------|--------|
| date | `string` | `date: string` | Match |
| open | `number` | `open: number` | Match |
| high | `number` | `high: number` | Match |
| low | `number` | `low: number` | Match |
| close | `number` | `close: number` | Match |
| volume | `number` | `volume: number` | Match |
| turnover | `number` | `turnover: number` | Match |

#### StockData

| Field | Design | Implementation | Status |
|-------|--------|----------------|--------|
| ticker | `string` | `ticker: string` | Match |
| name | `string` | `name: string` | Match |
| market | `"KOSPI" \| "KOSDAQ"` | `"KOSPI" \| "KOSDAQ"` | Match |
| history | `StockOHLCV[]` (min 60) | `StockOHLCV[]` (주석: 최소 60일치) | Match |

#### ScreenerConditions (10 boolean fields)

| Field | Design | Implementation | Status |
|-------|--------|----------------|--------|
| breakout20 | boolean | boolean | Match |
| sideways | boolean | boolean | Match |
| volumeSurge | boolean | boolean | Match |
| tailFilter | boolean | boolean | Match |
| turnoverMin | boolean | boolean | Match |
| aboveMA60 | boolean | boolean | Match |
| notOverheated | boolean | boolean | Match |
| bullish | boolean | boolean | Match |
| noGap | boolean | boolean | Match |
| notOverbought5d | boolean | boolean | Match |

#### ScreenerResult

| Field | Design | Implementation | Status |
|-------|--------|----------------|--------|
| ticker | `string` | `string` | Match |
| name | `string` | `string` | Match |
| market | `"KOSPI" \| "KOSDAQ"` | `"KOSPI" \| "KOSDAQ"` | Match |
| close | `number` | `number` | Match |
| changeRate | `number` | `number` | Match |
| volume | `number` | `number` | Match |
| turnover | `number` | `number` | Match |
| conditions | `ScreenerConditions` | `ScreenerConditions` | Match |
| passCount | `number` | `number` | Match |

#### ScreenerApiResponse

| Field | Design | Implementation | Status |
|-------|--------|----------------|--------|
| date | `string` | `string` | Match |
| market | `"KOSPI" \| "KOSDAQ" \| "ALL"` | `"KOSPI" \| "KOSDAQ" \| "ALL"` | Match |
| totalScanned | `number` | `number` | Match |
| passed | `ScreenerResult[]` | `ScreenerResult[]` | Match |

**타입 정의 Match Rate: 100% (35/35 fields)**

### 2.3 Screening Constants (`screener.ts`)

| Constant | Design Value | Implementation Value | Status |
|----------|-------------|---------------------|--------|
| `TURNOVER_MIN` | `50_000_000_000` | `50_000_000_000` | Match |
| `VOLUME_SURGE_MULTIPLIER` | `2` | `2` | Match |
| `SIDEWAYS_MAX_RANGE` | `0.15` | `0.15` | Match |
| `TAIL_FILTER_RATIO` | `0.99` | `0.99` | Match |
| `MA60_PERIOD` | `60` | `60` | Match |
| `OVERHEAT_MAX_RATE` | `8` | `8` | Match |
| `GAP_MAX_RATIO` | `1.03` | `1.03` | Match |
| `OVERBOUGHT_5D_MAX` | `0.15` | `0.15` | Match |
| `LOOKBACK_DAYS` | `20` | `20` | Match |

**상수 Match Rate: 100% (9/9)**

### 2.4 Screening Condition Functions

| # | Function | Design Logic | Implementation Logic | Status |
|---|----------|-------------|---------------------|--------|
| 1 | `checkBreakout20` | `today.close > max(prior20[0..19].high)` | `today.close > Math.max(...prior20.slice(0, 20).map(d => d.high))` | Match |
| 2 | `checkSideways` | `(max.high - min.low) / min.low <= 0.15` | `(high20 - low20) / low20 <= SIDEWAYS_MAX_RANGE` | Match |
| 3 | `checkVolumeSurge` | `today.volume >= avg(prior20) * 2` | `today.volume >= avgVolume * VOLUME_SURGE_MULTIPLIER` | Match |
| 4 | `checkTailFilter` | `today.close >= today.high * 0.99` | `today.close >= today.high * TAIL_FILTER_RATIO` | Match |
| 5 | `checkTurnoverMin` | `today.turnover >= 50_000_000_000` | `today.turnover >= TURNOVER_MIN` | Match |
| 6 | `checkAboveMA60` | `today.close > avg(history[1..60].close)` | `today.close > slice.reduce(...) / MA60_PERIOD` | Match |
| 7 | `checkNotOverheated` | `changeRate < 8` | `changeRate < OVERHEAT_MAX_RATE` | Match |
| 8 | `checkBullish` | `today.close > today.open` | `today.close > today.open` | Match |
| 9 | `checkNoGap` | `today.open <= yesterday.close * 1.03` | `today.open <= yesterday.close * GAP_MAX_RATIO` | Match |
| 10 | `checkNotOverbought5d` | `(history[1].close - history[6].close) / history[6].close <= 0.15` | `gain5d <= OVERBOUGHT_5D_MAX` | Match |

**조건 함수 Match Rate: 100% (10/10)**

### 2.5 Entry Point Functions

| Design | Implementation | Status |
|--------|----------------|--------|
| `evaluateStock(stock: StockData): ScreenerResult` | `export function evaluateStock(stock: StockData): ScreenerResult` | Match |
| `runScreener(stocks: StockData[]): ScreenerResult[]` (passCount === 10, changeRate desc) | `stocks.map(evaluateStock).filter(r => r.passCount === 10).sort((a,b) => b.changeRate - a.changeRate)` | Match |

**진입점 함수 Match Rate: 100% (2/2)**

### 2.6 Adapter Interface & Factory (`market-data.ts`)

| Design | Implementation | Status |
|--------|----------------|--------|
| `MarketDataAdapter` type 정의 | `export type MarketDataAdapter = { ... }` | Match |
| `getStockList(market)` | `getStockList(market: "KOSPI" \| "KOSDAQ"): Promise<string[]>` | Match |
| `getHistory(ticker, days)` | `getHistory(ticker: string, days: number): Promise<StockOHLCV[]>` | Match |
| `getStockName(ticker)` | `getStockName(ticker: string): Promise<string>` | Match |
| `MockAdapter` 구현체 | `class MockAdapter implements MarketDataAdapter` | Match |
| `createAdapter()` 팩토리 | `export function createAdapter(): MarketDataAdapter` | Match |
| `fetchAllStocks()` 헬퍼 | `export async function fetchAllStocks(...)` | Match |
| 어댑터 교체 지원 (팩토리 패턴) | `switch (adapterType) { case "yahoo" / "kiwoom" / default }` | Extended |

**어댑터 인터페이스 Match Rate: 100% (7/7), 교체 기능 확장 구현**

### 2.7 API Route (`route.ts`)

| Design | Implementation | Status |
|--------|----------------|--------|
| `GET /api/screener` | `export async function GET(request)` | Match |
| `?market` Zod 검증 | `z.enum(["KOSPI", "KOSDAQ", "ALL"]).default("ALL")` | Match |
| `?date` 정규식 검증 | `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` | Match |
| 400 Bad Request | `{ error, details: parsed.error.flatten() }` | Match |
| 500 Internal Error | `{ error, message }` | Match |
| Cache-Control 5분 | `"public, s-maxage=300, stale-while-revalidate=600"` | Match |

**API Route Match Rate: 100% (6/6)**

### 2.8 UI - Server Component (`page.tsx`)

| Design | Implementation | Status |
|--------|----------------|--------|
| Server Component (async) | `export default async function ScreenerPage` | Match |
| 브레드크럼 (대시보드 > 스크리너) | `<a href="/dashboard">대시보드</a> / 스크리너` | Match |
| 페이지 헤더 (제목 + 설명) | `<h1>20일 고가 돌파 스크리너</h1>` + `<p>` 설명 | Match |
| 요약 카드 3개 (기준일, 시장, 통과 종목) | 3개 `grid-cols-3` 카드 | Match |
| `<details>` 조건 상세 설명 (10가지) | `<details>` 내 10개 조건 리스트 | Match |
| `<ScreenerTable />` 전달 | `<ScreenerTable results={results} date={date} totalScanned={stocks.length} />` | Match |
| `revalidate = 300` ISR | `export const revalidate = 300` | Match |
| 데이터 흐름: searchParams -> createAdapter -> fetchAllStocks -> runScreener | 구현 일치 | Match |

**Server Component Match Rate: 100% (8/8)**

### 2.9 UI - Client Component (`ScreenerTable.tsx`)

| Design | Implementation | Status |
|--------|----------------|--------|
| `"use client"` 지시어 | 첫 줄 `"use client"` | Match |
| sortKey state | `useState<SortKey>("changeRate")` | Match |
| sortDir state | `useState<SortDir>("desc")` | Match |
| marketFilter state | `useState<"ALL" \| "KOSPI" \| "KOSDAQ">("ALL")` | Match |
| 시장 필터 버튼 3개 | `["ALL", "KOSPI", "KOSDAQ"].map(...)` | Match |
| 결과 카운트 | `{sorted.length}종목 통과` | Match |
| CSV 다운로드 버튼 | `downloadCsv(sorted, date)` | Match |
| 종목 컬럼 (종목명 + 코드) | `{r.name}` + `{r.ticker}` | Match |
| 시장 배지 (KOSPI/KOSDAQ) | 조건부 배지 스타일 | Match |
| 종가 컬럼 | `{r.close.toLocaleString()}` | Match |
| 등락률 정렬 | `handleSort("changeRate")` + SortIcon | Match |
| 거래대금 정렬 | `handleSort("turnover")` + SortIcon | Match |
| 거래량 정렬 | `handleSort("volume")` + SortIcon | Match |
| 조건 10개 컬럼 | `CONDITION_KEYS.map(...)` | Match |
| 빈 결과 상태 UI | "조건을 통과한 종목이 없습니다" | Match |
| 조건 범례 | 하단 grid 범례 | Match |
| SortIcon 파일 최상위 선언 | `function SortIcon(...)` 컴포넌트 최상위 | Match |
| CSV UTF-8 BOM | `"\uFEFF" + csv` | Match |
| CSV 파일명 | `screener_${date}.csv` | Match |
| CSV O/X 형식 | `r.conditions[k] ? "O" : "X"` | Match |

**Client Component Match Rate: 100% (20/20)**

### 2.10 Environment Variables

| Design (env.ts) | .env.local.example | Status |
|-----------------|-------------------|--------|
| `DATABASE_URL` | `DATABASE_URL=file:./bknd.db` | Match |
| `APP_SECRET` | `APP_SECRET=change-this-...` | Match |
| `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_APP_URL=http://localhost:3000` | Match |
| `NODE_ENV` | (런타임 자동) | Match |
| `MARKET_DATA_ADAPTER` | `MARKET_DATA_ADAPTER=mock` | Match (확장) |
| `KIWOOM_API_KEY` | `# KIWOOM_API_KEY=...` | Match (확장) |
| `KIWOOM_SECRET_KEY` | `# KIWOOM_SECRET_KEY=...` | Match (확장) |
| `KIWOOM_API_BASE_URL` | `# KIWOOM_API_BASE_URL=...` | Match (확장) |

**환경변수 Match Rate: 100%**

---

## 3. Adapter Extension Analysis (신규)

설계 문서는 `MockAdapter`만 정의했으나, 구현에서 2개의 실시간 어댑터가 추가되었다.
설계 원칙 준수 여부를 평가한다.

### 3.1 Interface Consistency

| Adapter | `getStockList` | `getHistory` | `getStockName` | MarketDataAdapter 준수 |
|---------|:--------------:|:------------:|:--------------:|:---------------------:|
| MockAdapter | O | O | O | Match |
| yahooFinanceAdapter | O | O | O | Match |
| kiwoomAdapter | O | O | O | Match |

모든 어댑터가 `MarketDataAdapter` 타입을 완전히 구현한다.

### 3.2 Adapter Swappability (교체 가능성)

| 항목 | 평가 | Status |
|------|------|--------|
| 팩토리 패턴 (`createAdapter()`) | 환경변수(`MARKET_DATA_ADAPTER`)로 전환 | Match |
| 전환 방식 | `"mock"` / `"yahoo"` / `"kiwoom"` switch 분기 | Match |
| 호출부 변경 없음 | `page.tsx`, `route.ts`의 `createAdapter()` 호출 코드 변경 불필요 | Match |
| 설계 문서 예측 | "추후 KisAdapter 등으로 교체 가능" 명시 | Match |

**교체 가능성: 설계 원칙 완벽 준수**

### 3.3 Adapter Code Quality

#### Yahoo Finance Adapter (`lib/adapters/yahoo-finance-adapter.ts`)

| 항목 | 평가 | Notes |
|------|------|-------|
| 타입 안전성 | 양호 | `rowToStockOHLCV`로 외부 데이터 변환, 타입 명시 |
| `any` 사용 | 없음 | 다만 `as string \| undefined` 타입 단언 2건 (L65, L68) |
| history 정렬 순서 | 올바름 | `.reverse()`로 `history[0] = 오늘` 규칙 준수 |
| 매핑 테이블 우선 조회 | 올바름 | API 호출 절감 |
| 거래대금 추정 | 주의 필요 | `volume * close` 추정값 (Yahoo 미제공) |

**주의 사항**: `quote.longName as string | undefined` (L65), `quote.shortName as string | undefined` (L68) - 외부 라이브러리 타입 불완전으로 인한 타입 단언. `any` 사용은 아니지만 `as` 단언이 존재한다. yahoo-finance2 라이브러리의 quote 반환 타입이 정확하지 않아 불가피한 상황으로 판단된다.

#### Kiwoom Adapter (`lib/adapters/kiwoom-adapter.ts`)

| 항목 | 평가 | Notes |
|------|------|-------|
| 타입 안전성 | 우수 | `unknown` 타입 + 타입 가드 패턴 철저히 적용 |
| `any` 사용 | 없음 | 모든 외부 데이터를 `unknown`으로 수신 후 가드 |
| API Key 검증 | 올바름 | `getKiwoomConfig()`에서 필수값 검증 후 throw |
| 응답 파싱 | 방어적 | `parseKiwoomOhlcv`에서 필드별 존재 확인 |
| history 정렬 순서 | 올바름 | `.reverse()`로 `history[0] = 오늘` 규칙 준수 |

#### kr-tickers.ts (종목 매핑 테이블)

| 항목 | 평가 | Notes |
|------|------|-------|
| 타입 정의 | `type KrTickerInfo` 사용 | `interface` 아닌 `type` 사용 (컨벤션 준수) |
| KOSPI 종목 수 | 20개 | MockAdapter와 동일 |
| KOSDAQ 종목 수 | 15개 | MockAdapter와 동일 |
| Yahoo 티커 변환 | `.KS` / `.KQ` 접미사 | 표준 Yahoo Finance 규칙 |
| 유틸리티 함수 | `toYahooTicker`, `lookupNameFromTickers` | 재사용 가능한 순수 함수 |

---

## 4. Convention Compliance

### 4.1 Naming Convention Check

| Category | Convention | Files Checked | Compliance | Violations |
|----------|-----------|:-------------:|:----------:|------------|
| Components | PascalCase | 2 | 100% | - |
| Functions | camelCase | 모든 함수 | 100% | - |
| Constants | UPPER_SNAKE_CASE | 15+ | 100% | `TURNOVER_MIN`, `MOCK_KOSPI`, `KOSPI_TICKERS` 등 |
| Files (component) | PascalCase.tsx | 1 | 100% | `ScreenerTable.tsx` |
| Files (utility) | kebab-case.ts | 5 | 100% | `screener-types.ts`, `market-data.ts`, `kr-tickers.ts`, `yahoo-finance-adapter.ts`, `kiwoom-adapter.ts` |
| Folders | kebab-case | 2 | 100% | `adapters/`, `screener/` |

### 4.2 Code Style Check

| Rule | Compliance | Evidence |
|------|:----------:|---------|
| `any` 타입 금지 | Pass | 프로젝트 소스 코드에서 `any` 미사용. `unknown` + 타입 가드 일관 사용 |
| `enum` 금지 | Pass | `z.enum()`은 Zod API 메서드명이지 TypeScript enum이 아님 |
| `console.log` 금지 | Pass | 프로젝트 소스 코드에서 `console.*` 미사용 |
| `// @ts-ignore` 금지 | Pass | 미사용 |
| `type` 선호 (`interface` 자제) | Pass | 모든 타입 정의에 `type` 사용 |
| Zod 외부 데이터 검증 | Pass | `route.ts` querySchema, `env.ts` envSchema |
| Server Component 기본 | Pass | `page.tsx`는 Server, `ScreenerTable.tsx`만 Client |
| 환경변수 중앙 관리 | Pass | `lib/env.ts`에서 Zod로 검증 |

### 4.3 Import Order Check

검사 대상 파일별 import 분석:

| File | External | Internal(@/) | Relative(./) | Type imports | Status |
|------|:--------:|:------------:|:------------:|:------------:|--------|
| `screener.ts` | - | - | `./screener-types` | `import type` 사용 | Pass |
| `market-data.ts` | - | - | `./screener-types`, `./adapters/*` | `import type` 사용 | Pass |
| `route.ts` | `next/server`, `zod` | `@/lib/market-data`, `@/lib/screener` | - | `import type` 사용 | Pass |
| `page.tsx` | - | `@/lib/market-data`, `@/lib/screener` | `./ScreenerTable` | - | Pass |
| `ScreenerTable.tsx` | `react` | `@/lib/screener-types` | - | `import type` 사용 | Pass |
| `yahoo-finance-adapter.ts` | `yahoo-finance2` | - | `../market-data`, `./kr-tickers` | `import type` 사용 | Pass |
| `kiwoom-adapter.ts` | - | - | `../market-data`, `./kr-tickers` | `import type` 사용 | Pass |

### 4.4 Convention Score

```
Convention Compliance: 100%

  Naming:          100%
  Code Style:      100%
  Import Order:    100%
  Type Safety:     100%
  Env Variables:   100%
```

---

## 5. Architecture Compliance

### 5.1 Layer Structure (Starter Level)

| Expected | Actual | Status |
|----------|--------|--------|
| `lib/` (유틸리티, 타입, 비즈니스 로직) | `lib/screener-types.ts`, `lib/screener.ts`, `lib/market-data.ts` | Match |
| `lib/adapters/` (인프라 확장) | `lib/adapters/kr-tickers.ts`, `yahoo-finance-adapter.ts`, `kiwoom-adapter.ts` | Match |
| `app/api/` (API 라우트) | `app/api/screener/route.ts` | Match |
| `app/(dashboard)/` (페이지) | `app/(dashboard)/screener/page.tsx`, `ScreenerTable.tsx` | Match |

### 5.2 Dependency Direction

```
screener-types.ts  (Domain: 타입 정의)
    ^           ^
screener.ts     market-data.ts  (Application: 비즈니스 로직 + 어댑터 인터페이스)
    ^               ^      ^
    |               |      +-- adapters/yahoo-finance-adapter.ts  (Infrastructure)
    |               |      +-- adapters/kiwoom-adapter.ts         (Infrastructure)
    |               |      +-- adapters/kr-tickers.ts             (Infrastructure)
    |               |
    +---- route.ts -+  (Presentation: API)
              ^
           page.tsx --> ScreenerTable.tsx  (Presentation: UI)
```

| From | To | Direction | Status |
|------|----|-----------|--------|
| `route.ts` | `lib/market-data`, `lib/screener` | Presentation -> Application | Pass |
| `page.tsx` | `lib/market-data`, `lib/screener` | Presentation -> Application | Pass |
| `ScreenerTable.tsx` | `lib/screener-types` | Presentation -> Domain(Types) | Pass |
| `screener.ts` | `screener-types` | Application -> Domain | Pass |
| `market-data.ts` | `screener-types`, `adapters/*` | Application -> Domain, Infrastructure | Pass |
| `yahoo-finance-adapter.ts` | `market-data`(type), `screener-types`, `kr-tickers` | Infrastructure -> Domain | Pass |
| `kiwoom-adapter.ts` | `market-data`(type), `screener-types`, `kr-tickers` | Infrastructure -> Domain | Pass |
| `kr-tickers.ts` | (none) | Independent | Pass |

순환 의존성 없음. 단방향 의존성 완전 준수. 어댑터 확장도 설계 문서의 의존성 그래프 원칙을 준수한다.

### 5.3 Architecture Score

```
Architecture Compliance: 100%

  Layer Placement:       100% (9/9 files)
  Dependency Direction:  100% (0 violations)
  Circular Dependencies: 0
```

---

## 6. Overall Score

### 6.1 Match Rate Summary

```
+---------------------------------------------------+
|  Overall Match Rate: 97%                           |
+---------------------------------------------------+
|  File Structure:        100% (6/6)                 |
|  Type Definitions:      100% (35/35 fields)        |
|  Constants:             100% (9/9)                  |
|  Condition Functions:   100% (10/10)                |
|  Entry Point Functions: 100% (2/2)                  |
|  Adapter Interface:     100% (7/7)                  |
|  API Route:             100% (6/6)                  |
|  Server Component:      100% (8/8)                  |
|  Client Component:      100% (20/20)                |
|  Environment Variables: 100%                        |
|  Convention:            100%                        |
|  Architecture:          100%                        |
+---------------------------------------------------+
|  Deduction: -3% (설계 문서 미갱신: 어댑터 확장 미반영) |
+---------------------------------------------------+
```

### 6.2 Category Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | Pass |
| Architecture Compliance | 100% | Pass |
| Convention Compliance | 100% | Pass |
| Adapter Extension Quality | 95% | Pass |
| **Overall** | **97%** | **Pass** |

---

## 7. Differences Found

### 7.1 Missing Features (Design O, Implementation X)

| Item | Design Location | Description |
|------|-----------------|-------------|
| (없음) | - | 설계 문서의 모든 항목이 구현됨 |

### 7.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| Yahoo Finance Adapter | `lib/adapters/yahoo-finance-adapter.ts` | Yahoo Finance API 기반 실시간 데이터 어댑터 | Positive - 실데이터 지원 |
| Kiwoom REST Adapter | `lib/adapters/kiwoom-adapter.ts` | 키움 REST API 기반 실시간 데이터 어댑터 | Positive - 국내 실시간 지원 |
| KR Tickers Map | `lib/adapters/kr-tickers.ts` | 종목코드-Yahoo 티커-종목명 매핑 테이블 | Positive - API 호출 절감 |
| `MARKET_DATA_ADAPTER` 환경변수 | `lib/env.ts:9`, `lib/market-data.ts:232` | 어댑터 전환 환경변수 | Positive - 교체 가능성 |
| Kiwoom 환경변수 3개 | `lib/env.ts:11-13`, `.env.local.example` | KIWOOM_API_KEY, KIWOOM_SECRET_KEY, KIWOOM_API_BASE_URL | Positive - 보안 설정 |

### 7.3 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| `createAdapter()` 반환 로직 | `MockAdapter` 고정 반환 | `switch(adapterType)` 분기로 3종 어댑터 반환 | Low - 하위 호환 유지 (기본값 mock) |

---

## 8. Code Quality Notes

### 8.1 주의 사항

| Severity | File | Location | Issue | Recommendation |
|----------|------|----------|-------|----------------|
| Info | `yahoo-finance-adapter.ts` | L65, L68 | `as string \| undefined` 타입 단언 2건 | yahoo-finance2 라이브러리 타입 불완전으로 인한 불가피한 단언. 라이브러리 업데이트 시 재검토 |
| Info | `yahoo-finance-adapter.ts` | L35 | 거래대금을 `volume * close`로 추정 | Yahoo Finance가 거래대금을 직접 제공하지 않아 불가피. 주석으로 명시됨 |
| Info | `kiwoom-adapter.ts` | L24 | "실제 응답 구조 확인 후 업데이트 필요" 주석 | 키움 REST API 실사용 시 응답 구조 검증 필요 |

### 8.2 보안

| Item | Status | Notes |
|------|--------|-------|
| API Key 하드코딩 금지 | Pass | 환경변수로 관리 |
| .env.local.example 민감정보 | Pass | 실제 키 미포함, 주석 처리된 예시만 |
| Kiwoom API Key 검증 | Pass | `getKiwoomConfig()`에서 누락 시 throw |
| 환경변수 Zod 검증 | Pass | `lib/env.ts`에서 서버/클라이언트 분리 검증 |

---

## 9. Recommended Actions

### 9.1 Documentation Update Needed (설계 문서 갱신)

설계 문서(`turbo-break.design.md`)에 아래 구현 사항을 반영할 것을 권장:

- [ ] Section 1 (파일 구조): `lib/adapters/` 폴더 및 3개 어댑터 파일 추가
- [ ] Section 4.2: 어댑터 확장 전략 (Yahoo Finance, 키움 REST API) 추가
- [ ] Section 4.3: `createAdapter()` 팩토리의 환경변수 기반 전환 로직 반영
- [ ] 환경변수 섹션 신설: `MARKET_DATA_ADAPTER`, `KIWOOM_API_KEY`, `KIWOOM_SECRET_KEY`, `KIWOOM_API_BASE_URL`
- [ ] 의존성 그래프 (Section 7): adapters 하위 파일 추가

### 9.2 Implementation Quality Improvements (선택)

| Priority | Item | Location | Description |
|----------|------|----------|-------------|
| Low | Yahoo Finance 거래대금 정확도 | `yahoo-finance-adapter.ts:35` | `volume * close` 추정 대신 별도 데이터 소스 검토 |
| Low | Kiwoom 응답 구조 실검증 | `kiwoom-adapter.ts` | 실제 API 연동 시 응답 필드명 확인 |
| Low | `env.ts` 어댑터별 조건부 검증 | `lib/env.ts` | `MARKET_DATA_ADAPTER=kiwoom` 선택 시 `KIWOOM_API_KEY` 필수 조건부 검증 추가 검토 |

---

## 10. Conclusion

**Match Rate 97%** 로 설계와 구현이 매우 높은 수준으로 일치한다.

핵심 설계 항목(타입, 상수, 10가지 조건 함수, API 엔드포인트, UI 구조)은 **100% 완전 일치**한다.
3% 감점은 어댑터 확장(Yahoo Finance, 키움 REST API)이 설계 문서에 미반영된 점에 해당하며, 이는 구현이 설계를 초과 달성한 것으로 부정적 요소가 아니다.

**어댑터 확장 평가**:
- MarketDataAdapter 인터페이스 일관성: 3개 어댑터 모두 동일 인터페이스 완전 구현
- 교체 가능성: 환경변수 1개(`MARKET_DATA_ADAPTER`)로 무중단 전환 가능
- 호출부 변경 불필요: 기존 `page.tsx`, `route.ts` 코드 수정 없이 어댑터 교체

**Convention 및 Architecture 준수율 100%**: CLAUDE.md에 정의된 모든 코딩 규칙(type 선호, enum 금지, any 금지, console.log 금지, Zod 검증, Server Component 우선, 환경변수 중앙 관리)을 완벽히 준수한다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial gap analysis | gap-detector |
| 2.0 | 2026-03-03 | Adapter extension analysis (Yahoo Finance, Kiwoom REST API) | gap-detector |

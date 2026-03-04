# turbo-break (20일 고가 돌파 스크리너) Gap Analysis Report v5

> **Analysis Type**: Gap Analysis (Design v2.1 vs Implementation)
>
> **Project**: turbo-break
> **Analyst**: gap-detector
> **Date**: 2026-03-05
> **Design Doc**: [turbo-break.design.md](../02-design/features/turbo-break.design.md) (v2.1)

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

Design 문서(v2.1, 2026-03-04)와 실제 구현 코드 간의 일치도를 종합 점검한다.
v4 대비 신규 변경 사항 없으나, 기술 부채 현황과 컨벤션 준수도를 재확인한다.

### 1.2 Analysis Scope

| 항목 | 경로 |
|------|------|
| Design 문서 | `docs/02-design/features/turbo-break.design.md` (v2.1) |
| 타입 정의 | `lib/screener-types.ts` |
| 스크리너 로직 | `lib/screener.ts` |
| 어댑터/마켓 | `lib/market-data.ts`, `lib/adapters/*` |
| 로거 | `lib/logger.ts` |
| 환경변수 | `lib/env.ts` |
| API Route | `app/api/screener/route.ts` |
| UI (Server) | `app/(dashboard)/screener/page.tsx` |
| UI (Client) | `app/(dashboard)/screener/ScreenerTable.tsx` |
| 차트 | `components/stock-chart-interactive.tsx` |
| 다크모드 | `components/theme-toggle.tsx`, `app/layout.tsx`, `app/globals.css` |
| 인트라데이 | `lib/intraday-*.ts`, `app/(dashboard)/intraday/*` |

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 99% | PASS |
| Architecture Compliance | 97% | PASS |
| Convention Compliance | 96% | PASS |
| **Overall** | **97%** | PASS |

---

## 3. Gap Analysis (Design vs Implementation)

### 3.1 Type Definitions (`lib/screener-types.ts`)

| Design 타입 | 구현 일치 | Status |
|------------|:---------:|:------:|
| `StockOHLCV` (7 fields) | 7/7 MATCH | PASS |
| `StockData` (4 fields) | 4/4 MATCH | PASS |
| `ScreenerConditions` (10 booleans) | 10/10 MATCH | PASS |
| `SignalMetrics` (8 numbers) | 8/8 MATCH | PASS |
| `BuyGrade` ("A"\|"B"\|"C"\|"F") | MATCH | PASS |
| `BuySignal` (5 fields) | 5/5 MATCH | PASS |
| `ScreenerResult` (12 fields) | 12/12 MATCH | PASS |
| `ScreenerApiResponse` (Added) | 구현에 추가 | INFO |

**Notes**: `ScreenerApiResponse` 타입은 Design에 명시적 타입 정의는 없으나 섹션 6.3의 응답 구조와 일치.

### 3.2 Screener Logic (`lib/screener.ts`)

#### Constants

| Design 상수 | Design 값 | 구현 값 | Status |
|-------------|----------|--------|:------:|
| `TURNOVER_MIN` | 50,000,000,000 | 50,000,000,000 | PASS |
| `VOLUME_SURGE_MULTIPLIER` | 2 | 2 | PASS |
| `SIDEWAYS_MAX_RANGE` | 0.15 | 0.15 | PASS |
| `TAIL_FILTER_RATIO` | 0.99 | 0.99 | PASS |
| `MA60_PERIOD` | 60 | 60 | PASS |
| `OVERHEAT_MAX_RATE` | 8 | 8 | PASS |
| `GAP_MAX_RATIO` | 1.03 | 1.03 | PASS |
| `OVERBOUGHT_5D_MAX` | 0.15 | 0.15 | PASS |
| `LOOKBACK_DAYS` | 20 | 20 | PASS |

#### Condition Functions (10/10)

| Design 함수 | 로직 일치 | Status |
|------------|:---------:|:------:|
| `checkBreakout20` | MATCH | PASS |
| `checkSideways` | MATCH | PASS |
| `checkVolumeSurge` | MATCH | PASS |
| `checkTailFilter` | MATCH | PASS |
| `checkTurnoverMin` | MATCH | PASS |
| `checkAboveMA60` | MATCH | PASS |
| `checkNotOverheated` | MATCH | PASS |
| `checkBullish` | MATCH | PASS |
| `checkNoGap` | MATCH | PASS |
| `checkNotOverbought5d` | MATCH | PASS |

#### Entry Point Functions (3/3)

| Design 함수 | 시그니처 일치 | 동작 일치 | Status |
|------------|:-----------:|:--------:|:------:|
| `evaluateStock(StockData): ScreenerResult` | MATCH | MATCH | PASS |
| `runScreener(StockData[]): ScreenerResult[]` | MATCH | passCount===10, changeRate desc | PASS |
| `evaluateAllStocks(StockData[]): ScreenerResult[]` | MATCH | passCount desc, buyScore desc | PASS |

### 3.3 Logger (`lib/logger.ts`) -- v2.1 신규

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| `logger.info` -> `process.stdout.write` | MATCH | PASS |
| `logger.warn` -> `process.stderr.write` | MATCH | PASS |
| `logger.error` -> `process.stderr.write` | MATCH | PASS |
| `export default logger` | MATCH | PASS |
| 서버 전용 사용 규칙 | Client Component에서 import 없음 | PASS |

### 3.4 Adapter Design (`lib/market-data.ts`, `lib/adapters/`)

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| `MarketDataAdapter` 인터페이스 (3 methods) | MATCH (type 사용) | PASS |
| `MockAdapter` in `market-data.ts` | MATCH | PASS |
| `YahooFinanceAdapter` in `adapters/` | MATCH + `logger.info` 사용 | PASS |
| `KiwoomAdapter` in `adapters/` | MATCH | PASS |
| `createAdapter(type?)` 팩토리 | MATCH (yahoo/kiwoom/mock) | PASS |
| `fetchAllStocks` | MATCH (Promise.allSettled) | PASS |

### 3.5 API Route (`app/api/screener/route.ts`)

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| `GET /api/screener` | MATCH | PASS |
| Query: `market` (KOSPI/KOSDAQ/ALL default ALL) | MATCH (Zod) | PASS |
| Query: `date` (YYYY-MM-DD optional) | MATCH (Zod regex) | PASS |
| Query: `adapter` (yahoo/kiwoom/mock optional) | MATCH (Zod) | PASS |
| 200 OK: `ScreenerApiResponse` | MATCH | PASS |
| 400: `{ error, details }` | MATCH (ZodFlattenedErrors) | PASS |
| 500: `{ error, message }` | MATCH | PASS |

### 3.6 UI - Server Component (`page.tsx`)

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| `force-dynamic` | MATCH | PASS |
| 헤더: 제목 + 설명 + ThemeToggle | MATCH | PASS |
| ScreenerControls | MATCH (market/date/adapter) | PASS |
| 요약 카드 3개 | MATCH (기준일, 스캔 종목, 통과 종목) | PASS |
| `<ScreenerTable />` props | MATCH (results, date, totalScanned, histories) | PASS |

### 3.7 UI - ScreenerTable State (v2.1 Hydration-safe)

| Design State | 구현 | Status |
|-------------|------|:------:|
| `sortKey: "buyScore"` | MATCH | PASS |
| `sortDir: "desc"` | MATCH | PASS |
| `marketFilter: "ALL"` | MATCH | PASS |
| `minPass: 0` | MATCH | PASS |
| `chart: ChartState(null)` | MATCH | PASS |
| `activeTab: "chart"` | MATCH | PASS |
| `watchlistOnly: false` | MATCH | PASS |
| `watchlist: useState<string[]>([])` | MATCH (v2.1 hydration-safe) | PASS |
| `useEffect` localStorage 로드 | MATCH (마운트 후 로드) | PASS |

### 3.8 UI - Component Structure

| Design 컴포넌트 | 구현 확인 | Status |
|----------------|:--------:|:------:|
| 필터 바 (시장/통과조건/관심종목/CSV) | MATCH | PASS |
| TOP 3 추천 카드 | MATCH | PASS |
| `generateKeyPoint` (v2.1 신규) | MATCH (6 조건 + 기본) | PASS |
| 테이블 (북마크/종목/시장/종가/등락률/거래대금/거래량/매수신호/조건10개/통과수) | MATCH | PASS |
| 조건 범례 (LegendItem + 호버 툴팁) | MATCH | PASS |
| 모달 3탭 (차트/왕초보/중고급) | MATCH | PASS |

### 3.9 Chart (`components/stock-chart-interactive.tsx`)

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| Props: `{ data: StockOHLCV[] }` | MATCH | PASS |
| 캔들: 상승 #ef4444 / 하락 #3b82f6 | MATCH | PASS |
| MA5: #f59e0b (주황) | MATCH | PASS |
| MA20: #60a5fa (하늘) | MATCH | PASS |
| MA60: #a78bfa (보라) | MATCH | PASS |
| 20일 고가선: #f97316 점선 | MATCH | PASS |
| 20일 범위 마커: 주황 arrowUp | MATCH | PASS |
| 돌파 마커: 빨강 arrowDown | MATCH | PASS |
| 거래량 surge 색상 (v2.1 4단계) | MATCH | PASS |
| 정보 바: 거래량 N.N배 + SURGE | MATCH | PASS |

### 3.10 Dark Mode

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| `globals.css`: `@custom-variant dark` | MATCH | PASS |
| `layout.tsx`: FOUC 방지 인라인 스크립트 | MATCH | PASS |
| `layout.tsx`: `suppressHydrationWarning` | MATCH | PASS |
| `ThemeToggle`: `useState` lazy initializer | MATCH | PASS |
| localStorage key: `"theme"` | MATCH | PASS |
| `suppressHydrationWarning` on button | MATCH | PASS |

### 3.11 CSV Export

| Design 항목 | 구현 | Status |
|------------|------|:------:|
| 컬럼 목록 (코드/이름/시장/종가/등락률/거래량/거래대금/조건1~10/통과수) | MATCH | PASS |
| UTF-8 BOM | MATCH (`\uFEFF`) | PASS |
| 파일명: `screener_YYYY-MM-DD.csv` | MATCH | PASS |

### 3.12 Environment Variables (`lib/env.ts`)

| Design 항목 | 구현 | Status | Notes |
|------------|------|:------:|-------|
| `MARKET_DATA_ADAPTER` (yahoo/kiwoom/mock, default mock) | MATCH | PASS | |
| `KIWOOM_API_KEY` (optional) | MATCH | PASS | |
| `KIWOOM_SECRET_KEY` (optional) | MATCH | PASS | |
| `KIWOOM_API_BASE_URL` (default URL) | 구현: default `https://openapi.kiwoom.com` | MINOR | Design 문구 이슈일 뿐 동작 동일 |
| Zod 검증 | MATCH | PASS | |

---

## 4. Match Rate Summary

```
Total Items Checked: 112
PASS (Design O, Impl O):         111  (99.1%)
MINOR (Design ~= Impl):            1  (0.9%)
MISSING (Design O, Impl X):        0  (0.0%)
ADDED (Design X, Impl O):          3  (info only, not counted as gap)

Overall Match Rate: 99%
```

### MINOR Differences (1)

| # | Item | Design | Implementation | Impact |
|---|------|--------|----------------|--------|
| 1 | `KIWOOM_API_BASE_URL` default 값 | Design 문구 미명시 | `https://openapi.kiwoom.com` | Low -- 동작 영향 없음 |

### ADDED Features (Design X, Implementation O) -- Info Only

| # | Item | Location | Description |
|---|------|----------|-------------|
| 1 | `ScreenerApiResponse` type | `lib/screener-types.ts:66` | API 응답 전용 타입 (Design 섹션 6.3 구조와 일치) |
| 2 | `ScreenerControls` 설정 localStorage 복원 | `page.tsx:53` | 시장/어댑터 설정 유지 스크립트 |
| 3 | ORB 인트라데이 버튼 | `ScreenerTable.tsx` | "ORB" 버튼 -> `/intraday` 라우팅 |

---

## 5. Architecture Compliance

### 5.1 Layer Structure (Starter Level)

| Expected Layer | Expected Path | Exists | Status |
|---------------|---------------|:------:|:------:|
| Types (Domain) | `lib/screener-types.ts` | Yes | PASS |
| Logic (Application) | `lib/screener.ts` | Yes | PASS |
| Adapters (Infrastructure) | `lib/market-data.ts`, `lib/adapters/*` | Yes | PASS |
| API Route (Infrastructure) | `app/api/screener/route.ts` | Yes | PASS |
| Server Component (Presentation) | `app/(dashboard)/screener/page.tsx` | Yes | PASS |
| Client Component (Presentation) | `app/(dashboard)/screener/ScreenerTable.tsx` | Yes | PASS |
| Shared Components | `components/*` | Yes | PASS |

### 5.2 Dependency Direction

```
screener-types.ts (Domain - no deps)     PASS
     ^                    ^
screener.ts (App)    market-data.ts (Infra) <- adapters/*   PASS
     ^                    ^
     route.ts (Infra, imports both)          PASS
          ^
       page.tsx (Presentation)               PASS
          |-> ScreenerTable.tsx (Presentation)  PASS
                  |-> stock-chart-interactive.tsx   PASS
```

- Domain (`screener-types.ts`): 외부 의존성 없음 -- PASS
- Application (`screener.ts`): Domain만 import -- PASS
- Infrastructure (`market-data.ts`, `route.ts`): Domain + Application import -- PASS
- Presentation (`page.tsx`, `ScreenerTable.tsx`): Application/Domain/Infrastructure 방향 준수 -- PASS

### 5.3 Dependency Violations

없음. 모든 import가 단방향 의존 규칙을 준수.

**Architecture Score: 97%**
(감점: ScreenerTable.tsx가 ~1580줄로 단일 파일 크기 초과 -- 분리 권장)

---

## 6. Convention Compliance

### 6.1 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| Components | PascalCase | 100% | - |
| Functions | camelCase | 100% | - |
| Constants | UPPER_SNAKE_CASE | 100% | - |
| Files (component) | PascalCase.tsx | 100% | `ScreenerTable.tsx`, `ScreenerControls.tsx`, `IntradayView.tsx` |
| Files (utility) | kebab-case.ts | 100% | `screener-types.ts`, `market-data.ts`, `intraday-calc.ts` |
| Folders | kebab-case | 100% | - |

### 6.2 CLAUDE.md Rules Compliance

| Rule | Status | Evidence |
|------|:------:|---------|
| pnpm only | PASS | `pnpm-lock.yaml` 존재 |
| No `enum` | PASS | 문자열 리터럴 유니온만 사용 |
| No `any` | PASS | grep 결과 0건 |
| No `console.log` | PASS | grep 결과 0건 (logger.ts 주석 제외) |
| `type` 선호 (no `interface`) | PASS | 모든 타입 `type` 사용 |
| Zod 환경변수 검증 | PASS | `lib/env.ts` |
| Server Component 기본 | PASS | `page.tsx` 서버, 상호작용에만 `"use client"` |
| Dark mode FOUC 방지 | PASS | `layout.tsx` 인라인 스크립트 |
| `suppressHydrationWarning` | PASS | `<html>` + ThemeToggle button |

### 6.3 Import Order

대부분의 파일에서 외부 라이브러리 -> 내부 절대 경로 -> 상대 경로 -> type import 순서 준수.

**Convention Score: 96%**
(감점: ScreenerTable.tsx 단일 파일 ~1580줄, 파일 분리 미수행)

---

## 7. Known Technical Debt (v2.1 Design 문서 기준)

| Severity | Item | Design 기술 부채 | 현재 상태 |
|:--------:|------|-----------------|----------|
| MEDIUM | `ScreenerTable.tsx` ~1580줄 | 파일 분리 권장 | 미해결 |
| LOW | `error.tsx` 미구현 | 에러 경계 없음 | 미해결 |
| LOW | `loading.tsx` 미구현 | 로딩 상태 없음 | 미해결 |
| LOW | `.env.example` 미존재 | 환경변수 예시 없음 | 미해결 |

---

## 8. v2.1 Feature Items Verification (7/7 PASS)

| # | v2.1 신규 항목 | 구현 확인 | Status |
|---|---------------|:--------:|:------:|
| 1 | `lib/logger.ts` 도입 | `process.stdout.write` / `process.stderr.write` | PASS |
| 2 | Hydration-safe watchlist | `useState([])` + `useEffect` localStorage | PASS |
| 3 | 거래량 surge 4단계 색상 | 오늘+surge/오늘일반/과거surge/과거일반 | PASS |
| 4 | `generateKeyPoint` 함수 | 6개 우선순위 조건 + 기본값 | PASS |
| 5 | TOP3 카드 등락률 표시 | 카드 내 등급/summary/keypoint 구현 | PASS |
| 6 | 거래량 배수 표시 + SURGE | 정보 바 N.N배 + 주황색 SURGE 표시 | PASS |
| 7 | Yahoo adapter logger 전환 | `logger.info` 사용 (`console.log` 제거) | PASS |

---

## 9. Recommended Actions

### 9.1 Immediate -- None Required

Match Rate 99%로 Design-Implementation 갭 없음.

### 9.2 Short-term (기술 부채 해소)

| Priority | Item | Expected Impact |
|----------|------|-----------------|
| MEDIUM 1 | `ScreenerTable.tsx` 파일 분리 | BuySignalPanel, ExpertPanel, generateKeyPoint 등 추출 -> 유지보수성 향상 |
| LOW 2 | `error.tsx` 구현 | 에러 경계 페이지 추가 -> UX 안정성 |
| LOW 3 | `loading.tsx` 구현 | 로딩 상태 UI -> 사용자 피드백 |
| LOW 4 | `.env.example` 생성 | 신규 개발자 환경 설정 가이드 |

### 9.3 Design Document Updates -- None Required

Design v2.1과 구현이 거의 완벽하게 일치하므로 문서 업데이트 불필요.

---

## 10. Conclusion

```
Match Rate:    99% (112 항목 중 111 PASS, 1 MINOR)
Architecture:  97% (단방향 의존 준수, 파일 크기만 감점)
Convention:    96% (CLAUDE.md 전규칙 준수, 파일 분리만 감점)
Overall:       97%

Status: PASS -- Design v2.1과 구현 거의 완벽 일치
```

v4(2026-03-04) 대비 변경 없음. 기술 부채 4건 동일 상태.

---

## Analysis History

| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-03 | v1.0 | 97% | 기본 스펙 기준 |
| v2 | 2026-03-04 | v1.0 | 94% | 추가 기능 포함 재분석 |
| v3 | 2026-03-04 | v2.0 | 95% | Design v2.0 반영 후 재분석 |
| v4 | 2026-03-04 | v2.1 | 99% | v2.1 신규 항목 모두 구현 확인 |
| v5 | 2026-03-05 | v2.1 | 99% | 종합 재점검, 컨벤션/아키텍처 상세 분석 추가 |

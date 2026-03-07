# Design: 돌파 기간 선택 (5일/20일 콤보)

> **Feature**: breakout-period-selector
> **Phase**: Design
> **Created**: 2026-03-07
> **Version**: 1.0
> **Author**: designer

---

## 1. 아키텍처 개요

```
URL ?period=5 (기본값)
  → page.tsx: searchParams에서 period 읽기
  → evaluateAllStocks(stocks, period)
  → evaluateStock(stock, period)
      → checkBreakout(today, priorN, period)
      → checkSideways(priorN, period)
      → checkVolumeSurge(today, priorN, period)
  → ScreenerTable: period prop → 동적 라벨/메타/텍스트
```

---

## 2. 파일별 변경 설계

### 2.1 `lib/screener-types.ts` — 타입 변경

**변경**: `ScreenerResult`에 `period` 필드 추가

```ts
// Before
export type ScreenerResult = {
  stock: StockData;
  conditions: ScreenerConditions;
  passCount: number;
  signal: BuySignal;
};

// After
export type ScreenerResult = {
  stock: StockData;
  conditions: ScreenerConditions;
  passCount: number;
  signal: BuySignal;
  period: number;  // 5 | 20
};
```

**참고**: `breakout20` 필드명은 유지 (Plan 4.1 결정사항)

---

### 2.2 `lib/screener.ts` — LOOKBACK_DAYS 파라미터화

#### 2.2.1 상수 → 기본값

```ts
// Before
const LOOKBACK_DAYS = 20;

// After
const DEFAULT_PERIOD = 5;
```

#### 2.2.2 함수 시그니처 변경

```ts
// checkBreakout20 → period 인자 추가
function checkBreakout20(
  today: StockOHLCV,
  prior: StockOHLCV[],
  period: number,  // 추가
): { pass: boolean; breakoutPct: number }

// checkSideways → period 인자 추가
function checkSideways(
  prior: StockOHLCV[],
  period: number,  // 추가
): { pass: boolean; sidewaysRange: number }

// checkVolumeSurge → period 인자 추가
function checkVolumeSurge(
  today: StockOHLCV,
  prior: StockOHLCV[],
  period: number,  // 추가
): { pass: boolean; volumeMultiple: number }
```

#### 2.2.3 함수 내부 변경

각 함수에서 `LOOKBACK_DAYS` 대신 `period` 인자 사용:

```ts
// checkBreakout20 내부
const priorN = prior.slice(-period);  // was: slice(-LOOKBACK_DAYS)

// checkSideways 내부
const priorN = prior.slice(-period);  // was: slice(-LOOKBACK_DAYS)

// checkVolumeSurge 내부
const priorN = prior.slice(-period);  // was: slice(-LOOKBACK_DAYS)
```

#### 2.2.4 evaluateStock / evaluateAllStocks 시그니처

```ts
// Before
export function evaluateStock(stock: StockData): ScreenerResult | null
export function evaluateAllStocks(stocks: StockData[]): ScreenerResult[]

// After
export function evaluateStock(stock: StockData, period = DEFAULT_PERIOD): ScreenerResult | null
export function evaluateAllStocks(stocks: StockData[], period = DEFAULT_PERIOD): ScreenerResult[]
```

`evaluateStock` 내부에서 `period`를 `checkBreakout20`, `checkSideways`, `checkVolumeSurge`에 전달.

#### 2.2.5 evaluateBuySignal 메시지 동적화

`evaluateBuySignal` 내부 positives/warnings 텍스트에서 "20일" 하드코딩을 `period` 인자로 동적화:

```ts
// Before
export function evaluateBuySignal(c: ScreenerConditions, m: SignalMetrics): BuySignal

// After
export function evaluateBuySignal(c: ScreenerConditions, m: SignalMetrics, period: number): BuySignal
```

텍스트 변경 예시:
```ts
// Before
`20일 고가를 ${pct}% 상향 돌파`
`20일 돌파 미달 (${pct}% 부족)`

// After
`${period}일 고가를 ${pct}% 상향 돌파`
`${period}일 돌파 미달 (${pct}% 부족)`
```

#### 2.2.6 runScreener 시그니처 (API route용)

```ts
// Before
export function runScreener(stocks: StockData[]): ScreenerResult[]

// After
export function runScreener(stocks: StockData[], period = DEFAULT_PERIOD): ScreenerResult[]
```

---

### 2.3 `app/(dashboard)/screener/ScreenerControls.tsx` — 콤보 추가

#### 2.3.1 period 콤보 select 추가

```tsx
<select
  name="period"
  defaultValue={currentPeriod}
  onChange={() => formRef.current?.requestSubmit()}
  className="..."
>
  <option value="5">5일 돌파</option>
  <option value="20">20일 돌파</option>
</select>
```

#### 2.3.2 Props 변경

```ts
// Before
type ScreenerControlsProps = {
  currentMarket: string;
  currentDate: string;
  currentAdapter: string;
};

// After — period 추가
type ScreenerControlsProps = {
  currentMarket: string;
  currentDate: string;
  currentAdapter: string;
  currentPeriod: string;  // "5" | "20"
};
```

---

### 2.4 `app/(dashboard)/screener/page.tsx` — period 파이프라인

```ts
// searchParams에서 period 읽기
const period = Number(sp.period) === 20 ? 20 : 5;  // 기본값 5

// evaluateAllStocks에 전달
const results = evaluateAllStocks(stocks, period);

// ScreenerControls에 전달
<ScreenerControls currentPeriod={String(period)} ... />

// ScreenerTable에 전달
<ScreenerTable results={results} period={period} ... />
```

---

### 2.5 `app/(dashboard)/screener/ScreenerTable.tsx` — 테이블 + 모달 동적화

**핵심 원칙**: `breakout20` 필드명 유지, UI 라벨만 `period` prop으로 동적 변경

#### 2.5.1 Props 변경

```ts
// Before (L1178)
type Props = {
  results: ScreenerResult[];
  date: string;
  totalScanned: number;
  histories: Record<string, StockOHLCV[]>;
};

// After
type Props = {
  results: ScreenerResult[];
  date: string;
  totalScanned: number;
  histories: Record<string, StockOHLCV[]>;
  period: number;  // 추가
};
```

#### 2.5.2 CONDITION_LABELS 동적화 (L22-23)

```ts
// Before (상수)
const CONDITION_LABELS: Record<string, string> = {
  breakout20: "20일 돌파",
  ...
};

// After (함수)
function getConditionLabels(period: number): Record<string, string> {
  return {
    breakout20: `${period}일 돌파`,
    sideways: "횡보",
    volumeSurge: "거래량 폭증",
    aboveMA5: "MA5 위",
    aboveMA20: "MA20 위",
    aboveMA60: "MA60 위",
    posGain5d: "5일 수익",
    bigCandle: "장대양봉",
    noUpperTail: "윗꼬리 짧음",
    gapUp: "갭업",
  };
}
```

#### 2.5.3 CONDITION_META 동적화 (L57-77)

```ts
// Before (상수 객체)
const CONDITION_META = {
  breakout20: { label: "20일 돌파", easy: "...", detail: "..." },
  sideways: { label: "횡보", easy: "20일간 주가 변동폭...", detail: "..." },
  volumeSurge: { label: "거래량 폭증", easy: "20일 평균의 2배...", detail: "..." },
  ...
};

// After (함수)
function getConditionMeta(period: number) {
  return {
    breakout20: {
      label: `${period}일 돌파`,
      easy: `최근 ${period}일 최고가를 오늘 종가가 넘었어요`,
      detail: `종가 > ${period}일 최고가 → 신고가 돌파 확인`,
    },
    sideways: {
      label: "횡보",
      easy: `최근 ${period}일간 주가 변동폭이 15% 이내로 좁아요`,
      detail: `${period}일 (고가-저가)/저가 ≤ 15% → 에너지 축적 구간`,
    },
    volumeSurge: {
      label: "거래량 폭증",
      easy: `오늘 거래량이 ${period}일 평균의 2배 이상이에요`,
      detail: `당일 거래량 ≥ ${period}일 평균 거래량 × 2`,
    },
    // 나머지 조건은 period 무관 — 기존 값 유지
    ...
  };
}
```

#### 2.5.4 generateKeyPoint 동적화 (L16)

```ts
// Before
`20일 고가를 ${m.breakoutPct.toFixed(1)}% 강하게 돌파`

// After — period 파라미터 추가
function generateKeyPoint(m: SignalMetrics, period: number): string {
  // ...
  `${period}일 고가를 ${m.breakoutPct.toFixed(1)}% 강하게 돌파`
}
```

#### 2.5.5 toKidText 동적화 (L371-392)

```ts
// Before (L371-376) — 정규식 + "한 달 동안" 텍스트
const breakoutMatch = text.match(/20일 고가를 ([\d.]+)% 상향 돌파/);
// story: "한 달 동안 ..."

// After — period 인자 추가
function toKidText(text: string, period: number): string {
  const periodLabel = period === 5 ? "일주일" : "한 달";
  const breakoutMatch = text.match(new RegExp(`${period}일 고가를 ([\\d.]+)% 상향 돌파`));
  // story: `${periodLabel} 동안 ...`

  // Before (L387-392)
  const sidewaysMatch = text.match(/20일 박스권 범위 ([\d.]+)%/);
  // story: "한 달 동안 ..."

  // After
  const sidewaysMatch = text.match(new RegExp(`${period}일 박스권 범위 ([\\d.]+)%`));
  // story: `${periodLabel} 동안 ...`
}
```

#### 2.5.6 toKidWarning 동적화 (L462-469)

```ts
// Before
text.match(/20일 돌파 미달/)
// "20일 동안 가장 높은 가격에 아직 못 미쳤어요"

// After — period 인자 추가
function toKidWarning(text: string, period: number): string {
  const periodLabel = period === 5 ? "일주일" : "한 달";
  text.match(new RegExp(`${period}일 돌파 미달`))
  // `${periodLabel} 동안 가장 높은 가격에 아직 못 미쳤어요`
}
```

#### 2.5.7 EXPERT_DEFS 동적화 (L582-629)

```ts
// Before (상수 배열)
const EXPERT_DEFS = [
  {
    key: "breakout20",
    name: "20일 고가 돌파",
    target: "종가 > 20일 최고가",
    what: "20거래일 최고가를 종가가 상회",
    why: "20일 저항 돌파는 ...",
    // ...
  },
  {
    key: "sideways",
    target: "20일 변동폭 ≤ 15%",
    what: "20일 고저 변동폭 ...",
    // ...
  },
  {
    key: "volumeSurge",
    target: "당일 거래량 ≥ 20일 평균 × 2배",
    getCurrent: (m) => `${m.volumeMultiple.toFixed(1)}× (20일 평균 대비)`,
    what: "20일 평균 대비 ...",
    // ...
  },
];

// After (함수)
function getExpertDefs(period: number) {
  return [
    {
      key: "breakout20",
      name: `${period}일 고가 돌파`,
      target: `종가 > ${period}일 최고가`,
      what: `${period}거래일 최고가를 종가가 상회`,
      why: `${period}일 저항 돌파는 ...`,
      // ...
    },
    {
      key: "sideways",
      target: `${period}일 변동폭 ≤ 15%`,
      what: `${period}일 고저 변동폭 ...`,
      // ...
    },
    {
      key: "volumeSurge",
      target: `당일 거래량 ≥ ${period}일 평균 × 2배`,
      getCurrent: (m) => `${m.volumeMultiple.toFixed(1)}× (${period}일 평균 대비)`,
      what: `${period}일 평균 대비 ...`,
      // ...
    },
    // 나머지 조건 (period 무관) 기존 값 유지
  ];
}
```

#### 2.5.8 CONDITION_RAW_PATTERNS 동적화 (L884-895)

```ts
// Before (상수)
const CONDITION_RAW_PATTERNS = {
  breakout20: /20일 고가를|20일 돌파 미달/,
  // ...
};

// After (함수)
function getConditionRawPatterns(period: number) {
  return {
    breakout20: new RegExp(`${period}일 고가를|${period}일 돌파 미달`),
    sideways: new RegExp(`${period}일 박스권`),
    volumeSurge: new RegExp(`${period}일 평균`),
    // 나머지 조건은 period 무관 — 기존 정규식 유지
  };
}
```

#### 2.5.9 테이블 헤더 (L1440-1446)

```tsx
// Before
{Object.keys(CONDITION_LABELS).map(k => (
  <th>{CONDITION_LABELS[k]}</th>
))}

// After
const labels = getConditionLabels(period);
{Object.keys(labels).map(k => (
  <th>{labels[k]}</th>
))}
```

#### 2.5.10 모달 팝업 내부 호출 변경

모달 내 `toKidText`, `toKidWarning`, `generateKeyPoint`, `ExpertPanel` 호출 시 `period` 전달:

```tsx
// generateKeyPoint
generateKeyPoint(r.signal.metrics, period)

// toKidText
toKidText(text, period)

// toKidWarning
toKidWarning(text, period)

// ExpertPanel
<ExpertPanel defs={getExpertDefs(period)} ... />
```

---

### 2.6 `app/api/screener/route.ts` — API 파라미터

```ts
// querySchema에 period 추가
const querySchema = z.object({
  market: z.enum(["KOSPI", "KOSDAQ", "ALL"]).default("ALL"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adapter: z.enum(["yahoo", "kiwoom", "mock"]).optional(),
  period: z.coerce.number().refine(v => v === 5 || v === 20).default(5),  // 추가
});

// runScreener에 period 전달
const passed = runScreener(stocks, parsed.data.period);
```

---

## 3. 구현 순서

| # | 파일 | 의존성 | 변경량 |
|---|------|--------|--------|
| 1 | `lib/screener-types.ts` | 없음 | ~2줄 |
| 2 | `lib/screener.ts` | types | ~25줄 |
| 3 | `app/api/screener/route.ts` | screener | ~5줄 |
| 4 | `app/(dashboard)/screener/ScreenerControls.tsx` | 없음 | ~10줄 |
| 5 | `app/(dashboard)/screener/page.tsx` | screener, Controls | ~8줄 |
| 6 | `app/(dashboard)/screener/ScreenerTable.tsx` | types | ~40줄 |

**총 예상**: ~90줄 변경

---

## 4. 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `lib/market-data.ts` | 히스토리 조회는 period 무관 (항상 65일치 fetch) |
| `lib/adapters/*` | 어댑터는 period 개념 없음 |
| `lib/date-utils.ts` | 날짜 유틸과 무관 |
| `components/stock-chart-interactive.tsx` | 차트 렌더링은 period 무관 |

---

## 5. 검증 기준

| # | 항목 | 방법 |
|---|------|------|
| 1 | 타입 안전성 | `pnpm type-check` 에러 0 |
| 2 | 빌드 성공 | `pnpm build` 에러 없음 |
| 3 | 기본값 5일 | `/screener` 접속 → period=5 동작 |
| 4 | 20일 전환 | 콤보 선택 → 즉시 재조회 |
| 5 | 테이블 라벨 | "5일 돌파?" / "20일 돌파?" 동적 표시 |
| 6 | 모달 초보자탭 | "일주일 동안" / "한 달 동안" 동적 표시 |
| 7 | 모달 전문가탭 | "5일 고가 돌파" / "20일 고가 돌파" 동적 표시 |
| 8 | BuySignal 텍스트 | "5일 고가를 ...% 돌파" / "20일 고가를 ...% 돌파" |
| 9 | URL 파라미터 | `?period=5` 또는 `?period=20` 유지 |
| 10 | API | `/api/screener?period=5` 정상 응답 |

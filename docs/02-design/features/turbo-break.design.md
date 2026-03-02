# Design: 20일 고가 돌파 주식 스크리너

> **Feature**: turbo-break
> **Phase**: Design ✅
> **Created**: 2026-03-03
> **Author**: frontend-architect
> **References**: `docs/01-plan/features/turbo-break.plan.md`

---

## 1. 파일 구조

```
turbo-break/
├── lib/
│   ├── screener-types.ts       ← 타입 정의 (StockOHLCV, StockData, ScreenerResult 등)
│   ├── screener.ts             ← 10가지 조건 순수 함수 (evaluateStock, runScreener)
│   └── market-data.ts          ← 어댑터 인터페이스 + MockAdapter + fetchAllStocks
└── app/
    ├── api/
    │   └── screener/
    │       └── route.ts        ← GET /api/screener?market=ALL&date=YYYY-MM-DD
    └── (dashboard)/
        └── screener/
            ├── page.tsx         ← Server Component (데이터 조회 + 결과 렌더링)
            └── ScreenerTable.tsx ← Client Component (정렬/필터/CSV)
```

---

## 2. 타입 설계 (`lib/screener-types.ts`)

### 2.1 StockOHLCV

```typescript
type StockOHLCV = {
  date: string;       // "YYYY-MM-DD"
  open: number;       // 시가
  high: number;       // 고가
  low: number;        // 저가
  close: number;      // 종가
  volume: number;     // 거래량
  turnover: number;   // 거래대금 (원)
};
```

### 2.2 StockData

```typescript
type StockData = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  history: StockOHLCV[]; // history[0] = 오늘, history[1] = 어제, ... (최소 60일치)
};
```

### 2.3 ScreenerConditions

```typescript
type ScreenerConditions = {
  breakout20: boolean;       // 조건 1: 20일 고가 돌파
  sideways: boolean;         // 조건 2: 횡보 필터
  volumeSurge: boolean;      // 조건 3: 거래량 폭증
  tailFilter: boolean;       // 조건 4: 윗꼬리 제거
  turnoverMin: boolean;      // 조건 5: 거래대금 최소
  aboveMA60: boolean;        // 조건 6: 60일 MA 위
  notOverheated: boolean;    // 조건 7: 과열 방지
  bullish: boolean;          // 조건 8: 양봉
  noGap: boolean;            // 조건 9: 갭 제한
  notOverbought5d: boolean;  // 조건 10: 5일 연속 상승 제한
};
```

### 2.4 ScreenerResult

```typescript
type ScreenerResult = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  close: number;
  changeRate: number;       // 당일 상승률 (%)
  volume: number;
  turnover: number;
  conditions: ScreenerConditions;
  passCount: number;        // 통과 조건 수 (10 = 완전 통과)
};
```

### 2.5 ScreenerApiResponse

```typescript
type ScreenerApiResponse = {
  date: string;
  market: "KOSPI" | "KOSDAQ" | "ALL";
  totalScanned: number;
  passed: ScreenerResult[];
};
```

---

## 3. 스크리너 로직 설계 (`lib/screener.ts`)

### 3.1 상수

| 상수 | 값 | 설명 |
|------|----|------|
| `TURNOVER_MIN` | `50_000_000_000` | 거래대금 최소 (500억 원) |
| `VOLUME_SURGE_MULTIPLIER` | `2` | 거래량 폭증 배수 |
| `SIDEWAYS_MAX_RANGE` | `0.15` | 횡보 최대 범위 (15%) |
| `TAIL_FILTER_RATIO` | `0.99` | 윗꼬리 제거 비율 |
| `MA60_PERIOD` | `60` | 이동평균 기간 |
| `OVERHEAT_MAX_RATE` | `8` | 과열 방지 상승률 (%) |
| `GAP_MAX_RATIO` | `1.03` | 갭 제한 비율 |
| `OVERBOUGHT_5D_MAX` | `0.15` | 5일 누적 상승 최대 (15%) |
| `LOOKBACK_DAYS` | `20` | 20일 고가 기준 |

### 3.2 조건 함수 명세

| 함수 | 입력 | 로직 |
|------|------|------|
| `checkBreakout20` | today, prior20 | `today.close > max(prior20[0..19].high)` |
| `checkSideways` | prior20 | `(max.high - min.low) / min.low ≤ 0.15` |
| `checkVolumeSurge` | today, prior20 | `today.volume ≥ avg(prior20[0..19].volume) × 2` |
| `checkTailFilter` | today | `today.close ≥ today.high × 0.99` |
| `checkTurnoverMin` | today | `today.turnover ≥ 50_000_000_000` |
| `checkAboveMA60` | today, history | `today.close > avg(history[1..60].close)` |
| `checkNotOverheated` | today, yesterday | `(today.close - yesterday.close) / yesterday.close × 100 < 8` |
| `checkBullish` | today | `today.close > today.open` |
| `checkNoGap` | today, yesterday | `today.open ≤ yesterday.close × 1.03` |
| `checkNotOverbought5d` | history | `(history[1].close - history[6].close) / history[6].close ≤ 0.15` |

### 3.3 진입점 함수

```typescript
// 단일 종목 평가 (모든 조건 계산 후 ScreenerResult 반환)
function evaluateStock(stock: StockData): ScreenerResult

// 전체 스크리너 실행 (passCount === 10인 종목만 반환, 등락률 내림차순)
function runScreener(stocks: StockData[]): ScreenerResult[]
```

**history 인덱스 규칙**: `history[0]` = 오늘, `history[1]` = 어제, `history[i]` = i일 전

---

## 4. 어댑터 설계 (`lib/market-data.ts`)

### 4.1 인터페이스

```typescript
type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};
```

### 4.2 MockAdapter 전략

| 항목 | 내용 |
|------|------|
| KOSPI 종목 | 20종목 (삼성전자, SK하이닉스 등) |
| KOSDAQ 종목 | 15종목 (에코프로비엠, 알테오젠 등) |
| 돌파 패턴 종목 | KOSPI 4종목 + KOSDAQ 3종목 (10가지 조건 통과하도록 설계) |
| 일반 종목 | 시드 기반 난수로 다양한 추세 패턴 생성 |
| 재현성 | 동일 seed → 동일 결과 (테스트 가능) |

### 4.3 팩토리 함수

```typescript
// 어댑터 인스턴스 반환 (추후 KisAdapter 등으로 교체 가능)
function createAdapter(): MarketDataAdapter

// 전체 종목 데이터 병렬 조회 유틸리티
async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days?: number
): Promise<StockData[]>
```

---

## 5. API Route 설계 (`app/api/screener/route.ts`)

### 5.1 엔드포인트

```
GET /api/screener
```

### 5.2 쿼리 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `market` | `"KOSPI" \| "KOSDAQ" \| "ALL"` | `"ALL"` | 스캔할 시장 |
| `date` | `"YYYY-MM-DD"` | 오늘 | 기준 날짜 (표시용) |

### 5.3 응답

```typescript
// 200 OK
ScreenerApiResponse

// 400 Bad Request
{ error: string; details: ZodFlattenedErrors }

// 500 Internal Server Error
{ error: string; message: string }
```

### 5.4 유효성 검사

Zod를 사용한 쿼리 파라미터 검증:

```typescript
const querySchema = z.object({
  market: z.enum(["KOSPI", "KOSDAQ", "ALL"]).default("ALL"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

### 5.5 캐싱

- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` (5분 캐시)

---

## 6. UI 설계

### 6.1 Server Component (`page.tsx`)

**역할**: 데이터 조회 + 정적 레이아웃 렌더링

**레이아웃**:
```
[브레드크럼: 대시보드 > 스크리너]
[페이지 헤더: 제목 + 설명]
[요약 카드 3개: 기준일 | 스캔 시장 | 통과 종목 수]
[<details> 조건 상세 설명 (10가지)]
[<ScreenerTable /> Client Component]
```

**데이터 흐름**:
1. `searchParams`에서 `market`, `date` 읽기
2. `createAdapter()` → `fetchAllStocks()` 호출
3. `runScreener()` 실행
4. `<ScreenerTable results={...} />` 에 전달

**캐싱**: `export const revalidate = 300` (5분 ISR)

### 6.2 Client Component (`ScreenerTable.tsx`)

**역할**: 정렬 / 필터 / CSV 다운로드 상호작용

**상태**:
```typescript
const [sortKey, setSortKey] = useState<"changeRate" | "turnover" | "volume" | "passCount">("changeRate")
const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
const [marketFilter, setMarketFilter] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL")
```

**컴포넌트 구조**:
```
ScreenerTable
├── 헤더 컨트롤 (시장 필터 버튼 3개 + 결과 카운트 + CSV 버튼)
├── 테이블 (정렬 가능 컬럼)
│   ├── 종목 (종목명 + 코드)
│   ├── 시장 (KOSPI/KOSDAQ 배지)
│   ├── 종가
│   ├── 등락률 ↕ (정렬 가능)
│   ├── 거래대금 ↕ (정렬 가능)
│   ├── 거래량 ↕ (정렬 가능)
│   └── 조건 10개 컬럼 (✓/✗)
├── 빈 결과 상태 UI (통과 종목 0개일 때)
└── 조건 범례 (번호 + 조건명 매핑)
```

**SortIcon 컴포넌트**: 파일 최상위에 선언 (렌더 내부 정의 금지 — React Hooks 규칙)

### 6.3 CSV 형식

| 컬럼 | 내용 |
|------|------|
| 종목코드, 종목명, 시장 | 기본 정보 |
| 종가, 등락률, 거래량, 거래대금 | 수치 |
| 조건 1~10 | O / X |
| 통과조건수 | 0~10 |

- 인코딩: UTF-8 with BOM (Excel 호환)
- 파일명: `screener_YYYY-MM-DD.csv`

---

## 7. 의존성 그래프

```
screener-types.ts
    ↑           ↑
screener.ts   market-data.ts
    ↑               ↑
    └──── route.ts ─┘
              ↑
           page.tsx → ScreenerTable.tsx
```

**규칙**: 순환 의존성 없음. 단방향 의존만 허용.

---

## 8. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 타입 안전성 | `any` 사용 금지, `unknown` + 타입 가드 |
| 코딩 컨벤션 | CLAUDE.md 전체 준수 (enum 금지, console.log 금지 등) |
| Server Component | 상호작용 없는 컴포넌트는 모두 Server Component |
| 캐싱 | API 5분 캐시, ISR 5분 revalidate |
| 에러 처리 | 400/500 HTTP 에러 + UI 빈 결과 안내 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial design | frontend-architect |

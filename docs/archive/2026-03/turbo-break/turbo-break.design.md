# Design: 20일 고가 돌파 주식 스크리너

> **Feature**: turbo-break
> **Phase**: Design ✅
> **Created**: 2026-03-03
> **Updated**: 2026-03-04
> **Version**: 2.0
> **Author**: frontend-architect
> **References**: `docs/01-plan/features/turbo-break.plan.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial design | frontend-architect |
| 2.0 | 2026-03-04 | BuySignal 시스템, 어댑터 확장, UX A+B그룹, 차트 모달, 다크모드 반영 | frontend-architect |

---

## 1. 파일 구조

```
turbo-break/
├── lib/
│   ├── screener-types.ts           ← 타입 정의 (전체)
│   ├── screener.ts                 ← 10가지 조건 + BuySignal 평가 순수 함수
│   ├── market-data.ts              ← 어댑터 인터페이스 + MockAdapter + fetchAllStocks
│   ├── env.ts                      ← Zod 환경변수 검증
│   └── adapters/
│       ├── yahoo-finance-adapter.ts  ← Yahoo Finance 실데이터 어댑터
│       └── kiwoom-adapter.ts         ← 키움 REST API 어댑터
├── app/
│   ├── api/screener/
│   │   └── route.ts                ← GET /api/screener
│   └── (dashboard)/screener/
│       ├── page.tsx                ← Server Component (force-dynamic)
│       ├── ScreenerControls.tsx    ← 시장/날짜/어댑터 선택 Client Component
│       └── ScreenerTable.tsx       ← 메인 UI Client Component
└── components/
    ├── stock-chart-interactive.tsx  ← lightweight-charts 캔들차트
    └── theme-toggle.tsx             ← 다크모드 토글 (Client Component)
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
  sideways: boolean;         // 조건 2: 횡보 필터 (박스권 범위 ≤ 15%)
  volumeSurge: boolean;      // 조건 3: 거래량 폭증 (≥ 20일 평균 × 2)
  tailFilter: boolean;       // 조건 4: 윗꼬리 제거 (종가 ≥ 당일 고가 × 0.99)
  turnoverMin: boolean;      // 조건 5: 거래대금 ≥ 500억
  aboveMA60: boolean;        // 조건 6: 60일 이동평균 위
  notOverheated: boolean;    // 조건 7: 과열 방지 (당일 상승률 < 8%)
  bullish: boolean;          // 조건 8: 양봉 (종가 > 시가)
  noGap: boolean;            // 조건 9: 갭 제한 (시가 ≤ 전일 종가 × 1.03)
  notOverbought5d: boolean;  // 조건 10: 5일 누적 상승 ≤ 15%
};
```

### 2.4 SignalMetrics (v2 신규)

BuySignal 계산에 사용되는 중간 수치. ScreenerResult에 포함되어 UI에서 수치 툴팁으로 표시됨.

```typescript
type SignalMetrics = {
  volumeMultiple: number;   // 당일거래량 / 20일평균거래량
  breakoutPct: number;      // (종가 - 20일고가) / 20일고가 × 100
  sidewaysRange: number;    // (20일고가 - 20일저가) / 20일저가 × 100
  gain5d: number;           // 5일 누적 상승률 (%)
  changeRate: number;       // 당일 등락률 (%)
  tailRatio: number;        // 종가 / 당일고가 × 100
  gapRatio: number;         // 시가 / 전일종가 × 100
  ma60Distance: number;     // (종가 - MA60) / MA60 × 100
};
```

### 2.5 BuyGrade / BuySignal (v2 신규)

```typescript
type BuyGrade = "A" | "B" | "C" | "F";

type BuySignal = {
  score: number;        // 0-100 정수 (각 조건 가중치 합산)
  grade: BuyGrade;      // A(≥80) / B(≥65) / C(≥45) / F(<45)
  summary: string;      // 한 줄 요약 (예: "20일 돌파 + 거래량 3.2배 + MA60 위")
  positives: string[];  // 통과 조건별 수치 포함 긍정 이유
  warnings: string[];   // 미통과 조건별 현재값+기준값 경고
};
```

### 2.6 ScreenerResult (v1 → v2 확장)

```typescript
type ScreenerResult = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  close: number;
  changeRate: number;           // 당일 상승률 (%)
  volume: number;
  turnover: number;             // 거래대금 (원)
  conditions: ScreenerConditions;
  passCount: number;            // 통과 조건 수 (0~10)
  metrics: SignalMetrics;       // v2 추가 — BuySignal 계산용 중간 수치
  buySignal: BuySignal;         // v2 추가 — 매수 신호 평가
};
```

> **v1 → v2 변경**: `passCount`가 10이어야만 결과에 포함되던 것에서 전체 종목을 포함하고 UI에서 필터링하도록 변경.

### 2.7 ScreenerApiResponse

```typescript
type ScreenerApiResponse = {
  date: string;
  market: "KOSPI" | "KOSDAQ" | "ALL";
  totalScanned: number;
  passed: ScreenerResult[];   // v2: 통과 종목 + 전체 종목 (passCount 0~10)
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

### 3.3 BuySignal 계산 함수 (v2 신규)

```typescript
// SignalMetrics 계산 (조건 판단에 사용된 수치 추출)
function calcSignalMetrics(stock: StockData): SignalMetrics

// BuySignal 평가 (점수/등급/요약/근거 생성)
function evaluateBuySignal(
  conditions: ScreenerConditions,
  metrics: SignalMetrics,
  stock: StockData
): BuySignal
```

**점수 체계**: 각 조건별 가중치(5~10점) × 통과 여부 합산 → 100점 만점 환산

### 3.4 진입점 함수

```typescript
// 단일 종목 평가 (조건 + 수치 + BuySignal 계산 후 ScreenerResult 반환)
function evaluateStock(stock: StockData): ScreenerResult

// 전체 스크리너 실행 (passCount === 10인 종목만 반환, changeRate 내림차순)
function runScreener(stocks: StockData[]): ScreenerResult[]

// UI용 전체 종목 평가 (passCount 무관, buyScore 내림차순) — v2 신규
function evaluateAllStocks(stocks: StockData[]): ScreenerResult[]
```

**history 인덱스 규칙**: `history[0]` = 오늘, `history[1]` = 어제, `history[i]` = i일 전

---

## 4. 어댑터 설계 (`lib/market-data.ts`, `lib/adapters/`)

### 4.1 인터페이스

```typescript
type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};
```

### 4.2 어댑터 구현체

| 어댑터 | 파일 | 설명 |
|--------|------|------|
| `MockAdapter` | `lib/market-data.ts` 내 | 시드 기반 난수, KOSPI 20 + KOSDAQ 15 종목 |
| `YahooFinanceAdapter` | `lib/adapters/yahoo-finance-adapter.ts` | Yahoo Finance API 실데이터 |
| `KiwoomAdapter` | `lib/adapters/kiwoom-adapter.ts` | 키움 REST API (Bearer 인증) |

### 4.3 팩토리 함수 (v1 → v2 변경)

```typescript
// v1: 파라미터 없음
// v2: type 파라미터로 런타임 어댑터 선택
function createAdapter(type?: string): MarketDataAdapter
// type: "mock" | "yahoo" | "kiwoom" | undefined (기본값: env MARKET_DATA_ADAPTER)

// 전체 종목 데이터 병렬 조회 유틸리티 (변경 없음)
async function fetchAllStocks(
  adapter: MarketDataAdapter,
  market: "KOSPI" | "KOSDAQ" | "ALL",
  days?: number
): Promise<StockData[]>
```

### 4.4 MockAdapter 전략

| 항목 | 내용 |
|------|------|
| KOSPI 종목 | 20종목 (삼성전자, SK하이닉스 등) |
| KOSDAQ 종목 | 15종목 (에코프로비엠, 알테오젠 등) |
| 돌파 패턴 종목 | KOSPI 4종목 + KOSDAQ 3종목 (10가지 조건 통과하도록 설계) |
| 일반 종목 | 시드 기반 난수로 다양한 추세 패턴 생성 |
| 재현성 | 동일 seed → 동일 결과 |

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
| `adapter` | `"mock" \| "yahoo" \| "kiwoom"` | env 기본값 | 데이터 소스 선택 (v2 추가) |

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

```typescript
const querySchema = z.object({
  market: z.enum(["KOSPI", "KOSDAQ", "ALL"]).default("ALL"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adapter: z.enum(["mock", "yahoo", "kiwoom"]).optional(),
});
```

### 5.5 캐싱

- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` (5분 캐시)

---

## 6. UI 설계

### 6.1 Server Component (`page.tsx`)

**역할**: 데이터 조회 + 정적 레이아웃 렌더링

**캐싱**: `export const dynamic = "force-dynamic"` (Yahoo 실데이터 대응, v1의 `revalidate=300`에서 변경)

**레이아웃**:
```
[헤더: 제목 + 설명 + ThemeToggle]
[ScreenerControls: 시장/날짜/어댑터 선택]
[요약 카드 3개: 기준일 | 스캔 종목 수 | 통과 종목 수]
[<ScreenerTable /> Client Component]
```

**데이터 흐름**:
1. `searchParams`에서 `market`, `date`, `adapter` 읽기
2. `createAdapter(adapter)` → `fetchAllStocks()` 호출
3. `evaluateAllStocks()` 실행 (전체 종목 평가)
4. `histories` (티커별 OHLCV 배열) 별도 구성
5. `<ScreenerTable results={...} histories={...} />` 에 전달

**Props 전달**:
```typescript
<ScreenerTable
  results={ScreenerResult[]}    // 전체 종목 평가 결과
  date={string}                 // 기준일
  totalScanned={number}         // 스캔 종목 수
  histories={Record<string, StockOHLCV[]>}  // 차트 데이터
/>
```

### 6.2 ScreenerControls (`ScreenerControls.tsx`) — v2 신규

**역할**: 시장/날짜/어댑터 선택 UI (URL 파라미터 기반)

```typescript
// URL searchParams로 상태 관리 (Client Component)
// 선택 변경 → router.push로 URL 업데이트
```

### 6.3 Client Component (`ScreenerTable.tsx`)

**역할**: 전체 UI 인터랙션 (정렬/필터/모달/북마크)

**상태**:
```typescript
const [sortKey, setSortKey] = useState<SortKey>("buyScore")  // v2: 기본값 변경
const [sortDir, setSortDir] = useState<SortDir>("desc")
const [marketFilter, setMarketFilter] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL")
const [minPass, setMinPass] = useState(0)                    // v2 신규
const [chart, setChart] = useState<ChartState>(null)         // v2 신규
const [activeTab, setActiveTab] = useState<ModalTab>("chart")// v2 신규
const [watchlistOnly, setWatchlistOnly] = useState(false)    // v2 신규
const [watchlist, setWatchlist] = useState<string[]>(...)    // v2 신규 (localStorage)
```

**SortKey 타입**:
```typescript
type SortKey = "changeRate" | "turnover" | "volume" | "passCount" | "buyScore"
// v2: "buyScore" 추가
```

**컴포넌트 구조**:
```
ScreenerTable
├── 필터 바
│   ├── 시장 버튼 (ALL / KOSPI / KOSDAQ)
│   ├── 통과조건 필터 (전체 / 5+ / 7+ / 8+ / 10)   ← v2 신규
│   ├── ⭐ 관심종목 토글 버튼                        ← v2 신규
│   └── 종목수 카운트 + CSV 버튼
├── TOP 3 추천 카드                                  ← v2 신규
│   └── A/B등급 상위 3종목 (등급배지/요약/핵심수치/★버튼)
├── 테이블
│   ├── ★ 북마크 컬럼                               ← v2 신규
│   ├── 종목 (종목명 + 코드 + 스파크라인)             ← v2 신규 스파크라인
│   ├── 시장 배지
│   ├── 종가
│   ├── 등락률 ↕
│   ├── 거래대금 ↕
│   ├── 거래량 ↕
│   ├── 매수신호 (GradeBadge) ↕                     ← v2 신규
│   ├── 조건 10개 컬럼 (✓/✗, 호버 수치 툴팁)         ← v2 신규 툴팁
│   └── 통과 수 (PassBadge) ↕
├── 빈 결과 상태 UI
├── 조건 범례 (LegendItem + 호버 설명 툴팁)
└── 차트/분석 모달                                   ← v2 신규
    ├── 📊 차트 탭 (StockChartInteractive)
    ├── 🐣 왕초보 분석 탭 (BuySignalPanel)
    └── 📚 중고급 분석 탭 (ExpertPanel)
```

**서브 컴포넌트** (ScreenerTable.tsx 내 선언):
| 컴포넌트 | 역할 |
|---------|------|
| `SortIcon` | 정렬 방향 아이콘 |
| `ScoreBadge` | 조건 점수 배지 |
| `PassBadge` | N/10 통과 배지 |
| `GradeBadge` | A/B/C/F 등급 배지 |
| `ConditionTooltip` | 조건 헤더 호버 설명 (Portal) |
| `LegendItem` | 범례 아이템 + 호버 설명 |
| `Sparkline` | 20일 인라인 SVG 미니차트 |
| `BuySignalPanel` | 왕초보 분석 탭 (히어로 판정 + 긍정/경고 스토리) |
| `ExpertPanel` | 중고급 분석 탭 (10개 지표 카드) |

**헬퍼 함수** (ScreenerTable.tsx 내 선언):
| 함수 | 역할 |
|------|------|
| `getMetricTooltip(condKey, r)` | 조건 배지 호버 수치 문자열 반환 |
| `toKidText(raw)` | 긍정 조건 텍스트 → 왕초보 설명 변환 |
| `toKidWarning(raw)` | 경고 조건 텍스트 → 왕초보 설명 변환 |
| `formatTurnover(n)` | 거래대금 포맷 (조/억/만) |
| `formatVolume(n)` | 거래량 포맷 (M/K) |
| `downloadCsv(results, date)` | CSV 생성 및 다운로드 |

### 6.4 차트 모달 (`components/stock-chart-interactive.tsx`) — v2 신규

**Props**:
```typescript
type Props = {
  data: StockOHLCV[];  // 최신→과거 순 (data[0] = 오늘)
};
```

**차트 구성**:
| 레이어 | 색상 | 설명 |
|--------|------|------|
| 캔들스틱 | 상승 빨강 / 하락 파랑 | OHLC 데이터 |
| 거래량 히스토그램 | 반투명 상승/하락색 | 하단 20% 영역 |
| MA5 | 주황 (#f59e0b) | 5일 이동평균 |
| MA20 | 하늘 (#60a5fa) | 20일 이동평균 |
| MA60 | 보라 (#a78bfa) | 60일 이동평균 |
| 20일 고가선 | 오렌지 점선 | 수평 저항선 |
| 20일 범위 마커 | 오렌지 ▲ | 기간 시작/끝 표시 |
| 돌파 마커 | 빨강 ▲ | 오늘 종가 > 20일 고가 시 표시 |

**범례**: 20일 고가 수치 + MA 선 범례 + 돌파 완료 배지 (조건부)

**OHLCV 툴팁**: 크로스헤어 연동, DOM 직접 업데이트 (재렌더링 없음)

### 6.5 다크모드 (`components/theme-toggle.tsx`) — v2 신규

CLAUDE.md 패턴 완전 준수:
- `globals.css`: `@custom-variant dark (&:where(.dark, .dark *))`
- `layout.tsx`: FOUC 방지 인라인 스크립트 + `suppressHydrationWarning`
- `ThemeToggle`: `useState` lazy initializer, `localStorage` key `"theme"`

### 6.6 CSV 형식

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
screener-types.ts (Domain)
    ^               ^
screener.ts     market-data.ts ← adapters/yahoo-finance-adapter.ts
                               ← adapters/kiwoom-adapter.ts
    ^               ^
    └──── route.ts ─┘  (Infrastructure)
              ^
           page.tsx ──→ ScreenerControls.tsx
              └──→ ScreenerTable.tsx ──→ stock-chart-interactive.tsx
                                   ──→ (theme-toggle.tsx는 layout.tsx에서)
```

**규칙**: 순환 의존성 없음. 단방향 의존만 허용.

---

## 8. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 타입 안전성 | `any` 사용 금지, `unknown` + 타입 가드 |
| 코딩 컨벤션 | CLAUDE.md 전체 준수 (enum 금지, console.log 금지 등) |
| Server Component | 상호작용 없는 컴포넌트는 모두 Server Component |
| 캐싱 | `force-dynamic` (실데이터 대응) |
| 에러 처리 | 400/500 HTTP 에러 + UI 빈 결과 안내 |
| 다크모드 | FOUC 없이 전환, 모든 UI에 `dark:` 클래스 적용 |
| 환경변수 | `lib/env.ts`에서 Zod 검증 후 사용 |

---

## 9. 알려진 기술 부채

| 심각도 | 항목 | 설명 |
|--------|------|------|
| 🟡 중간 | `yahoo-finance-adapter.ts` | `process.stdout.write` 사용 → 로거 전환 필요 |
| 🟡 중간 | `ScreenerTable.tsx` | 1200+ 줄 → BuySignalPanel, ExpertPanel 등 파일 분리 권장 |
| 🟢 낮음 | `error.tsx` 미구현 | 에러 경계 페이지 없음 |
| 🟢 낮음 | `loading.tsx` 미구현 | 로딩 상태 페이지 없음 |

# Design: 20일 고가 돌파 주식 스크리너

> **Feature**: turbo-break
> **Phase**: Design ✅
> **Created**: 2026-03-03
> **Updated**: 2026-03-04
> **Version**: 2.1
> **Author**: frontend-architect
> **References**: `docs/01-plan/features/turbo-break.plan.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-03 | Initial design | frontend-architect |
| 2.0 | 2026-03-04 | BuySignal 시스템, 어댑터 확장, UX A+B그룹, 차트 모달, 다크모드 반영 | frontend-architect |
| 2.1 | 2026-03-04 | logger.ts 설계, hydration-safe watchlist, 거래량 surge 색상 로직, generateKeyPoint, TOP3 카드 개선 | frontend-architect |

---

## 1. 파일 구조

```
turbo-break/
├── lib/
│   ├── screener-types.ts           ← 타입 정의 (전체)
│   ├── screener.ts                 ← 10가지 조건 + BuySignal 평가 순수 함수
│   ├── market-data.ts              ← 어댑터 인터페이스 + MockAdapter + fetchAllStocks
│   ├── env.ts                      ← Zod 환경변수 검증
│   ├── logger.ts                   ← 서버 전용 로거 (v2.1 신규)
│   └── adapters/
│       ├── kr-tickers.ts             ← KOSPI/KOSDAQ Yahoo 티커 매핑
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

### 2.4 SignalMetrics

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

### 2.5 BuyGrade / BuySignal

```typescript
type BuyGrade = "A" | "B" | "C" | "F";

type BuySignal = {
  score: number;        // 0-100 정수
  grade: BuyGrade;      // A(≥80) / B(≥65) / C(≥45) / F(<45)
  summary: string;      // 한 줄 요약
  positives: string[];  // 통과 조건별 수치 포함 긍정 이유
  warnings: string[];   // 미통과 조건별 현재값+기준값 경고
};
```

### 2.6 ScreenerResult

```typescript
type ScreenerResult = {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  close: number;
  changeRate: number;
  volume: number;
  turnover: number;
  conditions: ScreenerConditions;
  passCount: number;
  metrics: SignalMetrics;
  buySignal: BuySignal;
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
// 단일 종목 평가
function evaluateStock(stock: StockData): ScreenerResult

// 전체 스크리너 (passCount === 10만 반환)
function runScreener(stocks: StockData[]): ScreenerResult[]

// UI용 전체 종목 평가 (passCount 무관, buyScore 내림차순)
function evaluateAllStocks(stocks: StockData[]): ScreenerResult[]
```

---

## 4. 로거 설계 (`lib/logger.ts`) — v2.1 신규

```typescript
const logger = {
  info: (msg: string) => process.stdout.write(`[INFO] ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[WARN] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
};
export default logger;
```

**규칙**: 서버 전용 파일에서만 import. Client Component에서 사용 금지.

---

## 5. 어댑터 설계 (`lib/market-data.ts`, `lib/adapters/`)

### 5.1 인터페이스

```typescript
type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};
```

### 5.2 어댑터 구현체

| 어댑터 | 파일 | 로거 사용 |
|--------|------|-----------|
| `MockAdapter` | `lib/market-data.ts` 내 | — |
| `YahooFinanceAdapter` | `lib/adapters/yahoo-finance-adapter.ts` | `logger.info` |
| `KiwoomAdapter` | `lib/adapters/kiwoom-adapter.ts` | — |

### 5.3 팩토리 함수

```typescript
function createAdapter(type?: string): MarketDataAdapter
// type: "mock" | "yahoo" | "kiwoom" | undefined (기본값: env MARKET_DATA_ADAPTER)
```

---

## 6. API Route 설계 (`app/api/screener/route.ts`)

### 6.1 엔드포인트

```
GET /api/screener
```

### 6.2 쿼리 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| `market` | `"KOSPI" \| "KOSDAQ" \| "ALL"` | `"ALL"` | 스캔할 시장 |
| `date` | `"YYYY-MM-DD"` | 오늘 | 기준 날짜 (표시용) |
| `adapter` | `"mock" \| "yahoo" \| "kiwoom"` | env 기본값 | 데이터 소스 선택 |

### 6.3 응답

```typescript
// 200 OK
ScreenerApiResponse

// 400 Bad Request
{ error: string; details: ZodFlattenedErrors }

// 500 Internal Server Error
{ error: string; message: string }
```

---

## 7. UI 설계

### 7.1 Server Component (`page.tsx`)

**역할**: 데이터 조회 + 정적 레이아웃 렌더링

**캐싱**: `export const dynamic = "force-dynamic"`

**레이아웃**:
```
[헤더: 제목 + 설명 + ThemeToggle]
[ScreenerControls: 시장/날짜/어댑터 선택]
[요약 카드 3개: 기준일 | 스캔 종목 수 | 통과 종목 수]
[<ScreenerTable /> Client Component]
```

### 7.2 ScreenerTable 상태 (`ScreenerTable.tsx`)

```typescript
const [sortKey, setSortKey] = useState<SortKey>("buyScore")
const [sortDir, setSortDir] = useState<SortDir>("desc")
const [marketFilter, setMarketFilter] = useState<"ALL" | "KOSPI" | "KOSDAQ">("ALL")
const [minPass, setMinPass] = useState(0)
const [chart, setChart] = useState<ChartState>(null)
const [activeTab, setActiveTab] = useState<ModalTab>("chart")
const [watchlistOnly, setWatchlistOnly] = useState(false)
// hydration-safe: 초기값 [], useEffect에서 localStorage 로드 (v2.1 수정)
const [watchlist, setWatchlist] = useState<string[]>([])
```

> **v2.1 변경**: `useState` lazy initializer에서 localStorage 접근 제거.
> `useEffect`에서 마운트 후 로드하여 서버/클라이언트 hydration mismatch 방지.

### 7.3 컴포넌트 구조

```
ScreenerTable
├── 필터 바
│   ├── 시장 버튼 (ALL / KOSPI / KOSDAQ)
│   ├── 통과조건 필터 (전체 / 5+ / 7+ / 8+ / 10)
│   ├── ⭐ 관심종목 토글 버튼
│   └── 종목수 카운트 + CSV 버튼
├── TOP 3 추천 카드
│   ├── 등급 배지 / 종목명 / 시장 배지 / ★ 버튼
│   ├── summary (한 줄 요약)
│   ├── generateKeyPoint 핵심 포인트 (주황, 굵게)  ← v2.1 신규
│   └── 등락률
├── 테이블
│   ├── ★ 북마크 컬럼
│   ├── 종목 (종목명 + 코드 + 스파크라인)
│   ├── 시장 배지
│   ├── 종가
│   ├── 등락률 ↕
│   ├── 거래대금 ↕
│   ├── 거래량 ↕
│   ├── 매수신호 (GradeBadge) ↕
│   ├── 조건 10개 컬럼 (✓/✗, 호버 수치 툴팁)
│   └── 통과 수 (PassBadge) ↕
├── 조건 범례 (LegendItem + 호버 설명 툴팁)
└── 차트/분석 모달
    ├── 📊 차트 탭 (StockChartInteractive)
    ├── 🐣 왕초보 분석 탭 (BuySignalPanel)
    └── 📚 중고급 분석 탭 (ExpertPanel)
```

### 7.4 generateKeyPoint 함수 — v2.1 신규

TOP3 카드에서 "이 종목이 오늘 특별한 이유" 한 문장 생성.

```typescript
function generateKeyPoint(m: SignalMetrics, grade: BuyGrade): string {
  if (m.volumeMultiple >= 5) return `거래량 ${m.volumeMultiple.toFixed(1)}배 폭발 💥`;
  if (m.volumeMultiple >= 3) return `거래량 ${m.volumeMultiple.toFixed(1)}배로 큰손 유입 🔥`;
  if (m.sidewaysRange < 6)  return `${m.sidewaysRange.toFixed(1)}% 초좁은 횡보 후 돌파 🎯`;
  if (m.breakoutPct > 3)    return `20일 고가를 ${m.breakoutPct.toFixed(1)}% 강하게 돌파 🚀`;
  if (m.sidewaysRange < 10) return `${m.sidewaysRange.toFixed(1)}% 횡보 끝에 에너지 폭발 ⚡`;
  if (m.ma60Distance < 3)   return `60일선 바로 위 황금 자리 ✨`;
  return `${m.volumeMultiple.toFixed(1)}배 거래량으로 상승 확인 📈`;
}
```

**우선순위**: 거래량 폭발 → 초좁은 횡보 → 강한 돌파 → 횡보 → MA60 근접 → 기본

### 7.5 차트 모달 (`components/stock-chart-interactive.tsx`)

**Props**:
```typescript
type Props = {
  data: StockOHLCV[];  // 최신→과거 순 (data[0] = 오늘)
};
```

**차트 레이어**:

| 레이어 | 색상 | 설명 |
|--------|------|------|
| 캔들스틱 | 상승 #ef4444 / 하락 #3b82f6 | OHLC |
| 거래량 히스토그램 | 4단계 색상 (아래 참조) | 하단 20% 영역 |
| MA5 | #f59e0b (주황) | 5일 이동평균 |
| MA20 | #60a5fa (하늘) | 20일 이동평균 |
| MA60 | #a78bfa (보라) | 60일 이동평균 |
| 20일 고가선 | #f97316 점선 | 수평 저항선 |
| 20일 범위 마커 | 주황 ▲ | 기간 시작/끝 |
| 돌파 마커 | 빨강 ▲ | 오늘 종가 > 20일 고가 시 |

**거래량 surge 색상 로직 — v2.1 신규**:

```typescript
const avg20vol = candles.slice(-21, -1).reduce((s, d) => s + d.volume, 0) / 20;
const isSurge = avg20vol > 0 && d.volume >= avg20vol * 2;
const isToday = i === candles.length - 1;

// 색상 우선순위
오늘 + surge  → #f97316          (solid 주황)
오늘 일반     → #ef4444 / #3b82f6 (solid 색)
과거 surge    → #f9731680         (반투명 주황)
과거 일반     → #ef444428 / #3b82f628 (연한 색)
```

**정보 바 — v2.1 신규**:
- 기존: 20일 구간 날짜 + 최고가 + 평균거래량
- 추가: `📊 오늘 거래량 N.N배` — surge(2배+)면 주황 + `🔥 SURGE`

### 7.6 다크모드 (`components/theme-toggle.tsx`)

CLAUDE.md 패턴 완전 준수:
- `globals.css`: `@custom-variant dark (&:where(.dark, .dark *))`
- `layout.tsx`: FOUC 방지 인라인 스크립트 + `suppressHydrationWarning`
- `ThemeToggle`: `useState` lazy initializer, `localStorage` key `"theme"`

### 7.7 CSV 형식

| 컬럼 | 내용 |
|------|------|
| 종목코드, 종목명, 시장 | 기본 정보 |
| 종가, 등락률, 거래량, 거래대금 | 수치 |
| 조건 1~10 | O / X |
| 통과조건수 | 0~10 |

- 인코딩: UTF-8 with BOM (Excel 호환)
- 파일명: `screener_YYYY-MM-DD.csv`

---

## 8. 의존성 그래프

```
screener-types.ts (Domain)
    ^               ^
screener.ts     market-data.ts ← adapters/yahoo-finance-adapter.ts (← logger.ts)
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

## 9. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 타입 안전성 | `any` 사용 금지, `unknown` + 타입 가드 |
| 코딩 컨벤션 | CLAUDE.md 전체 준수 |
| Server Component | 상호작용 없는 컴포넌트는 모두 Server Component |
| 캐싱 | `force-dynamic` (실데이터 대응) |
| Hydration | SSR/CSR HTML 불일치 없음 (localStorage는 useEffect에서만 접근) |
| 에러 처리 | 400/500 HTTP 에러 + UI 빈 결과 안내 |
| 다크모드 | FOUC 없이 전환, 모든 UI에 `dark:` 클래스 적용 |
| 환경변수 | `lib/env.ts`에서 Zod 검증 후 사용 |
| 로깅 | 서버 코드: `lib/logger.ts` 사용 (`console.log`, `process.stdout.write` 직접 사용 금지) |

---

## 10. 알려진 기술 부채 (v2.1 기준)

| 심각도 | 항목 | 설명 |
|--------|------|------|
| 🟡 중간 | `ScreenerTable.tsx` | ~1580줄 → BuySignalPanel, ExpertPanel, generateKeyPoint 등 파일 분리 권장 |
| 🟢 낮음 | `error.tsx` 미구현 | 에러 경계 페이지 없음 |
| 🟢 낮음 | `loading.tsx` 미구현 | 로딩 상태 페이지 없음 |
| 🟢 낮음 | `.env.example` 미존재 | 환경변수 예시 파일 없음 |

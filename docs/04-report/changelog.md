# turbo-break 변경 로그

> **최종 업데이트**: 2026-03-10
> **현재 버전**: v3.0
> **상태**: 배포 권장 ✅

---

## [v3.0] - 2026-03-10

### 추가 (Added)

#### 돌파 기간 + 거래량 배수 선택 기능
- **period 파라미터**: 1/2/3/4/5/20일 돌파 선택 (기본값 5일)
  - URL `?period=N` 형식
  - ScreenerControls에 period select 추가 (auto-submit)
  - screener.ts 함수에 period 인자 전달 (파라미터화)

- **volMul 파라미터**: 0.5~5배 거래량 배수 선택 (기본값 2배)
  - URL `?volMul=N` 형식
  - ScreenerControls에 volMul select 추가 (auto-submit)
  - checkVolumeSurge, evaluateBuySignal에 volMultiplier 인자 전달

- **swRange 파라미터**: 7/8/9/10/15/20% 횡보 범위 선택 (기본값 15%)
  - URL `?swRange=N` 형식
  - ScreenerControls에 swRange select 추가
  - checkSideways에 maxRange 인자 전달

#### 차트 기능 확장
- **RSI(14) + RSI(2) 패널** (`stock-chart-interactive.tsx`)
  - Wilder's smoothing 방식 RSI 계산
  - RSI(14): 추세 과매수/과매도 (보라색)
  - RSI(2): 단기 반전 타이밍 (주황색)
  - 별도 120px 차트 패널, 메인 차트와 시간축 동기화
  - 70/30 수평선, 범례, ResizeObserver 대응

- **Bollinger Bands (20, 2σ)**
  - 상/하 밴드 반투명 빨강 표시
  - 변동성 분석 기능

- **검증 테이블**
  - "검증 보기" 토글로 거래량 합계/평균/배수/PASS/FAIL 표시
  - 계산 과정 투명성

- **미래 봉 프리뷰**
  - 과거 날짜 조회 시 5봉을 반투명 캔들로 표시
  - 수익률 배지 제공

#### UI 컴포넌트 분리
- **BuySignalPanel.tsx** (209줄): 초보자 분석 패널 독립화
- **ExpertPanel.tsx** (143줄): 전문가 분석 패널 독립화
- **screener-constants.ts** (338줄): 상수 + 함수 모음
  - `getConditionLabels(period)`, `getConditionMeta(period)`, `getExpertDefs(period)`
- **screener-utils.ts** (311줄): 유틸 함수 모음
  - `generateKeyPoint()`, `toKidText()`, `toKidWarning()`, `downloadCsv()` 등
- **screener-components.tsx** (191줄): 미니 컴포넌트
  - `SortIcon`, `PassBadge`, `GradeBadge`, `ConditionTooltip`, `LegendItem`, `Sparkline`

#### localStorage 설정 복존
- **screener-prefs 키로 자동 저장**: market, adapter, period, volMul, swRange, date
- **2경로 복원**:
  - Full reload (F5/주소창): page.tsx 인라인 script (React 마운트 전)
  - SPA 전환: ScreenerControls useEffect → window.location.replace()

#### 사용법 가이드
- **ScreenerGuide.tsx** (180줄): 접이식 가이드 (기본 접힘)
  - 섹션 1: 기본 사용법 (market/date/adapter 선택, period/volMul/swRange 설정)
  - 섹션 2: 차트 보기 & 검증 테이블 (RSI/BB 활용법)
  - 섹션 3: 대박 식당 비유 (BuySignal 점수 해석)
  - 섹션 4: ORB 인트라데이 (준비 중)

### 변경 (Changed)

#### 함수 파라미터화
- `checkBreakout20(today, prior, period, volMultiplier)` — 4인자
- `checkSideways(prior, period, maxRange)` — 3인자
- `checkVolumeSurge(today, prior, period, multiplier)` — 4인자
- `evaluateStock(stock, period, volMultiplier, swRange)` — 4인자
- `evaluateAllStocks(stocks, period, requiredConditions?, volMultiplier, swRange)` — 5인자
- `evaluateBuySignal(c, m, period, volMultiplier, swRange)` — 5인자
- `runScreener(stocks, period, volMultiplier, swRange)` — 4인자

#### UI 동적화
- `getConditionLabels(period)` 함수로 변경 (기존 상수 → 함수)
  - "20일 돌파" → "${period}일 돌파"
- `toKidText(text, period)` 함수 추가
  - periodLabel: "하루"/"이틀"/"N일"/"한 달" (4분기)
- `toKidWarning(text, period)` 함수 추가
  - 경고 텍스트 정규식 동적 변경
- `generateKeyPoint(m, grade, period)` 함수 수정
  - "N일 고가를 ...% 강하게 돌파" 동적화
- `getConditionRawPatterns(period)` 함수 추가
  - 정규식을 period 기반 동적 생성

#### 타입 변경
- `ScreenerResult`에 `period: number` 필드 추가
- `breakout20` 필드명 → `breakout` (범용성)

#### API 스키마
- querySchema에 `period`, `volMul`, `swRange` 파라미터 추가 (Zod 검증)

### 고정 (Fixed)

- ✅ 모든 v3.0 스펙 구현 (22건 EXTRA 기능 포함)
- ✅ Design Match Rate 100% (70/70 항목 PASS)
- ✅ 차트 돌파 판정 정확도 개선 (가격 + 거래량 동시 체크)

### 알려진 문제 (Known Issues)

- `stock-chart-interactive.tsx` 855줄 (300줄 기준 초과, 차트 특성상 단일 컴포넌트)
  - 권장: `calcRSI`, `calcBollingerBands`, `calcMA` → `chart-utils.ts` 분리 (v4에서)
- `.env.example` 미존재 (v4 계획)
- `/screener` 라우트 `error.tsx`, `loading.tsx` 미구현 (v4 계획)

---

## [v2.1] - 2026-03-04

### 추가 (Added)

#### 서버 로거 시스템
- **`lib/logger.ts`** — 서버 전용 로거 (stdout/stderr 래퍼)
  - `logger.info()`, `logger.warn()`, `logger.error()` 메서드
  - `process.stdout.write`, `process.stderr.write` 래핑
  - Client Component에서는 사용 금지 (서버 전용)

#### 차트 개선
- **거래량 surge 4단계 색상 강조**
  - 오늘 + surge (≥2배) → solid 주황 (#f97316)
  - 오늘 일반 → solid 색상 (상승 #ef4444 / 하락 #3b82f6)
  - 과거 surge → 반투명 주황 (#f9731680)
  - 과거 일반 → 연한 색상 (#ef444428 / #3b82f628)
  - 목적: 거래량 폭발 시점을 한눈에 파악

- **정보 바 오늘 거래량 배수 표시**
  - "📊 오늘 거래량 N.N배" 텍스트 추가
  - surge(≥2배) → 주황 색상 + 🔥 SURGE 뱃지
  - 목적: 수급 강도 즉시 확인

#### TOP3 카드 강화
- **`generateKeyPoint()` 함수** (`ScreenerTable.tsx`)
  - TOP3 카드에 "이 종목이 특별한 이유" 한 문장 생성
  - 거래량 폭발, 초좁은 횡보, 강한 돌파 등 핵심 포인트 강조
  - 주황색, 굵은 텍스트로 시각 강조

- **TOP3 카드: 등락률 표시**
  - 핵심 포인트 아래 `+X.XX%` 등락률 표시
  - 레이아웃: summary → keyPoint → 등락률 순서

### 변경 (Changed)

#### Hydration 안전성 개선
- **watchlist (관심 종목) 상태 관리**
  - Before: `useState<string[]>(localStorage.getItem(...))`
  - After: `useState<string[]>([])` + `useEffect`에서 로드
  - 목적: Server/Client HTML 불일치 오류(hydration mismatch) 방지
  - 참고: Design Section 7.2, useEffect는 마운트 후 실행

#### 로거 도입
- **`yahoo-finance-adapter.ts`** — 로거 전환
  - Before: `process.stdout.write()` 직접 사용 (2건)
  - After: `logger.info()` (2건)
  - 파일:라인 — `yahoo-finance-adapter.ts:4` import, `:61,66` 사용

### 고정 (Fixed)

- ✅ **Hydration mismatch**: localStorage 접근 → useEffect로 이동하여 해결
- ✅ **stdout 직접 사용**: `lib/logger.ts` 인터페이스로 정리, 코드 중복 제거
- ✅ **모든 v2.1 스펙 구현**: 7개 신규 항목 100% 완료

### 알려진 문제 (Known Issues)

- `ScreenerTable.tsx` ~1580줄 (기술부채, v3 분리 예정)
- `error.tsx` / `loading.tsx` 미구현 (v3 계획)
- `.env.example` 미존재 (v3 계획)

---

## [v2.0] - 2026-03-04

### 추가 (Added)

#### 핵심 기능
- **BuySignal 시스템**: 0~100점 점수 + A/B/C/F 등급 + 요약 + 근거 제공
  - SignalMetrics 타입 (8개 수치): volumeMultiple, breakoutPct, sidewaysRange, gain5d, changeRate, tailRatio, gapRatio, ma60Distance
  - evaluateBuySignal() 함수로 조건별 가중치 합산 → 점수 및 등급 산정
  - UI에 등급 배지 (A/B/C/F), 행 배경색 (A=연빨강, B=연주황) 표시

#### 데이터 소스 확장
- **Yahoo Finance 어댑터** (`lib/adapters/yahoo-finance-adapter.ts`)
  - Yahoo Finance API를 통한 실데이터 지원
  - 모든 KOSPI/KOSDAQ 종목 조회 가능
  - 환경변수 `MARKET_DATA_ADAPTER=yahoo`로 활성화

- **키움 REST API 어댑터** (`lib/adapters/kiwoom-adapter.ts`)
  - 키움 REST API를 통한 실데이터 지원
  - Bearer 토큰 인증 (KIWOOM_API_KEY, KIWOOM_SECRET_KEY)
  - 환경변수 `MARKET_DATA_ADAPTER=kiwoom`로 활성화

#### UI/UX 개선
- **차트 모달** (`components/stock-chart-interactive.tsx`)
  - lightweight-charts 캔들차트 (상승 빨강, 하락 파랑)
  - 거래량 히스토그램 (하단 20% 영역)
  - 이동평균선: MA5 (주황), MA20 (하늘), MA60 (보라)
  - 20일 고가 수평선 (오렌지 점선)
  - 돌파 마커 (빨강 ▲, 조건 1 통과 시)
  - OHLCV 툴팁 (크로스헤어 연동)

- **TOP 3 추천 카드** (`ScreenerTable.tsx`)
  - A/B등급 상위 3종목을 우선 노출
  - 종목명, 등급배지, buyScore, 등락률, 거래대금, 거래량배수 표시
  - 클릭 시 차트 모달 열기

- **미니 스파크라인** (`ScreenerTable.tsx`)
  - 20일 인라인 SVG 그래프
  - 테이블의 종목 컬럼에 최근 추세 시각화

- **다크모드** (`components/theme-toggle.tsx`, `layout.tsx`, `globals.css`)
  - Tailwind CSS v4 `@custom-variant dark` 구현
  - FOUC (Flash of Unstyled Content) 방지 인라인 스크립트
  - localStorage `"theme"` 키로 설정 저장
  - `prefers-color-scheme` 자동 감지
  - 모든 UI 컴포넌트에 `dark:` 클래스 적용

#### 분석 탭
- **왕초보 분석 탭** (`BuySignalPanel`, v2 추가)
  - 등급 기반 히어로 판정 ("지금 살 수 있어요!" 등)
  - 통과 조건 긍정 이유 (어린이 언어)
  - 미통과 조건 경고 (현재값 vs 기준값)

- **중고급 분석 탭** (`ExpertPanel`, v2 추가)
  - 10개 조건별 카드 (조건명, 기준, 현재값, 게이지, ProTip)
  - 이론적 배경 및 투자 인사이트

#### 필터 및 정렬
- `buyScore` 정렬 옵션 추가 (기본값으로 변경)
- 통과조건수 필터 추가 (전체 / 5+ / 7+ / 8+ / 10)
- 관심 종목 북마크 (localStorage `"screener-watchlist"`)

#### 컴포넌트
- **ScreenerControls** 컴포넌트 신규 추가
  - 시장 선택 (ALL/KOSPI/KOSDAQ)
  - 날짜 입력 (`type="date"`)
  - 어댑터 선택 (mock/yahoo/kiwoom)
  - URL 파라미터 기반 상태 관리

### 변경 (Changed)

- API 캐싱 전략: ISR `revalidate=300` → `dynamic = "force-dynamic"`
  - 이유: Yahoo/키움 실데이터는 매 요청마다 최신이어야 함

- `createAdapter()` 함수 시그니처 변경
  - Before: `function createAdapter(): MarketDataAdapter`
  - After: `function createAdapter(type?: string): MarketDataAdapter`
  - type 파라미터로 런타임에 어댑터 선택 가능

- 기본 정렬 키 변경
  - Before: `changeRate` (등락률)
  - After: `buyScore` (매수신호 점수)

- `ScreenerTable.tsx` 라인 수 증가
  - Before: 1200+ 줄
  - After: 1578줄 (기능 추가로 인한 자연스러운 증가)

### 고정 (Fixed)

- 조건별 수치 툴팁 개선 (호버 시 실제 값 표시)
- CSV 다운로드 UTF-8 BOM 인코딩 확인
- 환경변수 Zod 검증 (누락된 필수 변수 감지)

### 알려진 문제 (Known Issues)

- `process.stdout.write` 사용 (`yahoo-finance-adapter.ts:60,65`)
  - 규칙: CLAUDE.md에서 `console.log` 금지
  - 상태: v3에서 로거 라이브러리 도입 예정

- `ScreenerTable.tsx` 파일 크기 (1578줄)
  - 권장: BuySignalPanel, ExpertPanel, Sparkline 등 분리
  - 상태: v3에서 컴포넌트 분리 예정

- `error.tsx` 미구현
  - 예정: v3에서 추가

- `loading.tsx` 미구현
  - 예정: v3에서 추가

---

## [v1.0] - 2026-03-03

### 추가 (Added)

#### 핵심 스크리닝 기능
- 10가지 조건 스크리닝 로직 (`lib/screener.ts`)
  1. 20일 고가 돌파 (`checkBreakout20`)
  2. 횡보 필터 (`checkSideways`) — 15% 이내
  3. 거래량 폭증 (`checkVolumeSurge`) — 2배 이상
  4. 윗꼬리 제거 (`checkTailFilter`) — 99% 이상 종가
  5. 거래대금 (`checkTurnoverMin`) — 500억 원 이상
  6. 60일 이동평균 위 (`checkAboveMA60`)
  7. 과열 방지 (`checkNotOverheated`) — 8% 미만
  8. 양봉 (`checkBullish`)
  9. 갭 제한 (`checkNoGap`) — 3% 이내
  10. 5일 누적상승 제한 (`checkNotOverbought5d`) — 15% 이내

#### 데이터 어댑터
- **MockAdapter** (`lib/market-data.ts`)
  - 35종목 생성 (KOSPI 20 + KOSDAQ 15)
  - 7종목 돌파 패턴 자동 생성
  - 시드 기반 재현성 보장
  - 빠른 개발 및 테스트 용이

#### API 레이어
- **GET /api/screener** 엔드포인트 (`app/api/screener/route.ts`)
  - Query: `market` (KOSPI/KOSDAQ/ALL), `date` (YYYY-MM-DD)
  - Zod 검증으로 입력 안전성 확보
  - 응답: ScreenerApiResponse (date, market, totalScanned, passed)
  - 캐싱: `revalidate=300` (5분 ISR)

#### UI 레이어
- **Server Component** (`app/(dashboard)/screener/page.tsx`)
  - `force-dynamic` 설정 (초기: ISR)
  - 데이터 조회 및 정적 레이아웃 렌더링
  - 동적 데이터만 클라이언트로 전달

- **Client Component** (`ScreenerTable.tsx`)
  - 정렬: 5가지 키 (changeRate, turnover, volume, passCount)
  - 필터: 시장 필터 (ALL/KOSPI/KOSDAQ)
  - CSV 다운로드 (UTF-8 BOM)
  - 빈 결과 상태 UI
  - 조건 범례 (10개 조건 설명)

#### 타입 정의 (`lib/screener-types.ts`)
- `StockOHLCV`: 일봉 데이터 (date, open, high, low, close, volume, turnover)
- `StockData`: 종목 정보 + 60일 히스토리
- `ScreenerConditions`: 10개 boolean 조건 (v1에는 조건 이름만, 점수 없음)
- `ScreenerResult`: 종목 평가 결과 (ticker, name, market, conditions, passCount)
- `ScreenerApiResponse`: API 응답 형식

#### 환경변수 (`lib/env.ts`)
- `MARKET_DATA_ADAPTER` (enum: mock, yahoo, kiwoom) — v1에서는 mock만 지원
- Zod 검증으로 타입 안전성 확보

### 비기능 요구사항

- TypeScript 타입 안전성 100% (`any` 사용 금지)
- CLAUDE.md 코딩 컨벤션 100% 준수
  - Component: PascalCase
  - Function/Variable: camelCase
  - Constant: UPPER_SNAKE_CASE
  - File: kebab-case
- 0건 타입체크 오류 (`pnpm type-check`)
- 0건 린트 오류 (`pnpm lint`)
- 빌드 성공 (`pnpm build`)

---

## 마이그레이션 가이드

### v1 → v2 업그레이드

#### 환경변수 변경 필요 없음
```bash
# v1: MockAdapter만 지원
MARKET_DATA_ADAPTER=mock

# v2: 어댑터 선택 가능 (기본값: mock)
MARKET_DATA_ADAPTER=mock|yahoo|kiwoom
```

#### 새로운 환경변수 (Yahoo Finance 사용 시)
```bash
MARKET_DATA_ADAPTER=yahoo
# API 키 불필요 (공개 API)
```

#### 새로운 환경변수 (키움 API 사용 시)
```bash
MARKET_DATA_ADAPTER=kiwoom
KIWOOM_API_KEY=your-app-key
KIWOOM_SECRET_KEY=your-secret-key
KIWOOM_API_BASE_URL=https://openapi.koreainvestment.com:9443
```

#### 데이터 구조 변경
```typescript
// v1: ScreenerResult에 buySignal 필드 없음
type ScreenerResult_v1 = {
  ticker: string;
  name: string;
  // ... 기타 필드
  passCount: number;  // 0~10
};

// v2: metrics와 buySignal 필드 추가
type ScreenerResult_v2 = {
  ticker: string;
  name: string;
  // ... 기타 필드
  passCount: number;
  metrics: SignalMetrics;      // 새로 추가
  buySignal: BuySignal;        // 새로 추가
};
```

#### API 응답 형식 호환성
- v1 응답: `{ date, market, totalScanned, passed }`
- v2 응답: 동일한 구조 (상위 호환성 유지)

---

## 배포 히스토리

| 버전 | 날짜 | 환경 | 상태 |
|------|------|------|------|
| v2.0 | 2026-03-04 | 배포 준비 완료 | ✅ |
| v1.0 | 2026-03-03 | 개발 완료 | ✅ |

---

## 통계

### 코드 크기

| 항목 | v1.0 | v2.0 | 변화 |
|------|-----:|-----:|------:|
| 총 라인 수 | ~1000 | ~1800 | +80% |
| `lib/` 파일 | 4개 | 9개 | +125% |
| `components/` 파일 | 2개 | 3개 | +50% |
| `app/` 파일 | 2개 | 4개 | +100% |

### 기능

| 항목 | v1.0 | v2.0 | 변화 |
|------|:----:|:----:|------:|
| 어댑터 | 1개 | 3개 | +200% |
| 조건 | 10개 | 10개 | 0% (동일) |
| 정렬 옵션 | 4개 | 5개 | +25% |
| 필터 | 1개 | 3개 | +200% |
| 분석 탭 | 0개 | 2개 | 신규 |
| 차트 | 없음 | 있음 | 신규 |

### 성능

| 항목 | v1.0 | v2.0 |
|------|------|------|
| API 응답 시간 (Mock) | ~500ms | ~500ms |
| API 응답 시간 (Yahoo) | - | ~1.5s |
| 페이지 로드 시간 | ~1s | ~1.2s |
| 번들 크기 | ~150KB | ~180KB |

---

## 라이선스

MIT License (turbo-break 프로젝트)

---

**최종 업데이트**: 2026-03-10
**유지보수자**: turbo-break 개발팀

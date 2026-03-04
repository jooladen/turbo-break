# Design: ORB + VWAP 인트라데이 스크리너

> **Feature**: orb-intraday
> **Phase**: Design ✅
> **Created**: 2026-03-04
> **Version**: 1.0
> **Author**: frontend-architect

---

## 1. 아키텍처 개요

```
[일봉 스크리너]
  ScreenerTable.tsx
  → "📊 ORB" 버튼 클릭
  → router.push('/intraday?ticker=005930')

[인트라데이 페이지]
  app/(dashboard)/intraday/page.tsx       ← Server Component
    generateIntradayMock(ticker)           ← 분봉 합성 (서버에서 실행)
    <IntradayView bars={bars} ... />

  app/(dashboard)/intraday/IntradayView.tsx  ← Client Component
    calculateVwap(bars)                    ← VWAP 계산
    calculateOrb(bars, period)             ← ORB 레인지
    detectOrbBreakout(bars, orb, avgVol)   ← 돌파 감지
    → lightweight-charts 렌더링
    → 시그널 카드 렌더링
```

---

## 2. 타입 정의 (`lib/intraday-types.ts`)

```ts
type MinuteBar = {
  time: string;     // "09:05" 형식 (KST HH:MM)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type OrbLevel = {
  high: number;           // 오프닝 레인지 고가
  low: number;            // 오프닝 레인지 저가
  periodMinutes: number;  // 5 | 15 | 30
  endTime: string;        // 마지막 ORB 봉 시간 ("09:05", "09:15", "09:30")
};

type OrbSignal = {
  type: "LONG" | "SHORT";
  time: string;           // 돌파 발생 시간
  price: number;          // 돌파 시 종가
  volumeMultiple: number; // 돌파 봉 거래량 / 평균 거래량
};

type VwapPoint = {
  time: string;
  value: number;          // 누적 VWAP 값
};
```

---

## 3. 핵심 계산 로직 (`lib/intraday-calc.ts`)

### 3.1 VWAP

```
VWAP = Σ(typical_price × volume) / Σ(volume)
typical_price = (high + low + close) / 3
```

- 09:00 첫 봉부터 **누적 계산** (장 시작~현재)
- 각 봉마다 중간 VWAP 값 반환 → LineSeries로 시각화

### 3.2 ORB 레인지

```
ORB High = max(첫 N봉의 high)
ORB Low  = min(첫 N봉의 low)
```

- N = orbPeriod (5/15/30분)
- `endTime`: N번째 봉의 time 값

### 3.3 돌파 감지

```
조건:
  1. ORB 종료 이후 봉 (bar.time > orb.endTime)
  2. 거래량 필터: bar.volume / avgVolume >= 1.5
  3. LONG: bar.close > orb.high
     SHORT: bar.close < orb.low

→ 조건 충족 첫 봉의 OrbSignal 반환
→ 없으면 null
```

---

## 4. Mock 어댑터 (`lib/adapters/intraday-mock-adapter.ts`)

### 데이터 생성 규칙

| 구간 | 변동성 | 거래량 |
|------|--------|--------|
| 09:00~09:30 (오프닝) | × 2.67 | × 3.0 |
| 12:00~13:00 (점심) | 표준 | × 0.4 |
| 15:20~15:30 (마감) | 표준 | × 1.8 |
| 그 외 | 표준 | × 1.0 |

- **GBM(기하 브라운 운동)**: `close = open × (1 + drift + shock)`
- **종목별 seed**: `tickerToSeed(ticker)` → 항상 동일 데이터 재현
- **돌파 패턴 주입**: 75% 확률로 ORB 종료 후 60분 이내 의도적 돌파 삽입

---

## 5. URL 스키마

```
/intraday                       → ticker=005930, period=30 (기본값)
/intraday?ticker=000660         → SK하이닉스, period=30
/intraday?ticker=035420&period=15  → NAVER, ORB 15분
```

### searchParams 처리

```ts
// page.tsx (Server Component)
const ticker = (await searchParams).ticker ?? "005930";
const orbPeriod = Number((await searchParams).period ?? "30");
```

---

## 6. 컴포넌트 구조

### IntradayView.tsx 레이아웃

```
┌──────────────────────────────────────────────────────┐
│ ← 돌아가기  [종목명] [ticker]   [ORB: 5분 15분 30분] │
├──────────────────────────────────────────────────────┤
│ [현재가]  [VWAP]  [ORB 고가]  [ORB 저가]             │
├──────────────────────────────────────────────────────┤
│  범례: ─── VWAP  --- ORB 고가  --- ORB 저가          │
│                                                      │
│   lightweight-charts 분봉 캔들                        │
│   ─── VWAP (파랑 실선)                               │
│   - - ORB 고가 (초록 점선)                           │
│   - - ORB 저가 (빨강 점선)                           │
│   ▲ LONG 시그널 마커 / ▼ SHORT 시그널 마커           │
│   거래량 히스토그램 (하단)                            │
│                                                      │
├──────────────────────────────────────────────────────┤
│ 📊 시그널 요약                                        │
│ ┌─────────────────────────────────────────────────┐  │
│ │ 🟢 LONG  진입: 09:47  63,200원                  │  │
│ │ 거래량 2.3배  │  VWAP 위에서 돌파 ✅            │  │
│ └─────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────┤
│ 📊 ORB 구간 정보  09:00 ~ 09:30                      │
│ 고가 63,100  저가 61,800  범위 2.09%                 │
└──────────────────────────────────────────────────────┘
```

### 차트 시리즈 구성

| 시리즈 | 종류 | 색상 | 옵션 |
|--------|------|------|------|
| 분봉 캔들 | `CandlestickSeries` | 빨강/파랑 | priceScaleId: "right" |
| VWAP | `LineSeries` | `#3b82f6` | lineWidth: 2 |
| 거래량 | `HistogramSeries` | 동적 | priceScaleId: "volume", top: 0.85 |
| ORB 고가 | `createPriceLine` | `#22c55e` | lineStyle: 2 (dashed) |
| ORB 저가 | `createPriceLine` | `#ef4444` | lineStyle: 2 (dashed) |
| 돌파 마커 | `createSeriesMarkers` | 초록/빨강 | arrowUp / arrowDown |

### 거래량 색상 규칙

| 조건 | 색상 |
|------|------|
| ORB 구간 봉 (`time <= orb.endTime`) | `#94a3b880` (회색 반투명) |
| Surge 봉 (`volume >= avgVol × 1.5`) | `#f9731690` (주황) |
| 양봉 (일반) | `#ef444430` (연빨강) |
| 음봉 (일반) | `#3b82f630` (연파랑) |

---

## 7. 시간 변환

lightweight-charts는 `UTCTimestamp` (Unix 초) 를 사용.

```ts
// "HH:MM" → UTCTimestamp
function timeToTs(timeStr: string): UTCTimestamp {
  const [hh, mm] = timeStr.split(":").map(Number);
  const now = new Date();
  const todayKst = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const utcStart = todayKst - KST_OFFSET_SEC * 1000; // KST → UTC
  return Math.floor((utcStart + (hh * 3600 + mm * 60) * 1000) / 1000) as UTCTimestamp;
}
```

- `KST_OFFSET_SEC = 9 * 3600`
- `timeScale.tickMarkFormatter`로 레이블을 "HH:MM" 형식으로 재변환

---

## 8. 파일 변경 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `lib/intraday-types.ts` | 신규 | 타입 정의 |
| `lib/intraday-calc.ts` | 신규 | VWAP/ORB 계산 함수 |
| `lib/adapters/intraday-mock-adapter.ts` | 신규 | 분봉 합성 데이터 |
| `app/(dashboard)/intraday/page.tsx` | 신규 | Server Component |
| `app/(dashboard)/intraday/IntradayView.tsx` | 신규 | Client Component |
| `app/(dashboard)/screener/ScreenerTable.tsx` | 수정 | ORB 버튼 + useRouter |

---

## 9. 다크모드 처리

- `document.documentElement.classList.contains("dark")` → `isDark` 판별
- lightweight-charts `layout.background`, `textColor`, `grid` 색상 분기
- Tailwind `dark:` prefix 전체 UI 컴포넌트에 적용

---

## 10. 확장 계획 (v2.0)

| 기능 | 설명 |
|------|------|
| 키움 분봉 API 연동 | `kiwoom-adapter.ts`에 `getMinuteBars(ticker)` 추가 |
| 실시간 WebSocket | 키움 실시간 시세 → 분봉 누적 |
| 복수 종목 ORB 모니터링 | `/intraday/watchlist` 페이지 |
| ORB 통계 대시보드 | 과거 날짜별 ORB 승률 분석 |

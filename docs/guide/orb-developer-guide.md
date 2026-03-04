# 개발자용 ORB 가이드

> `/intraday` 페이지 내부 구조, 계산 로직, 확장 방법을 설명합니다.

---

## 1. 파일 구조

```
lib/
  intraday-types.ts              ← 타입 정의
  intraday-calc.ts               ← 순수 계산 함수
  adapters/
    intraday-mock-adapter.ts     ← KRX 분봉 합성 데이터

app/(dashboard)/intraday/
  page.tsx                       ← Server Component (force-dynamic)
  IntradayView.tsx               ← Client Component (차트 + UI)
```

---

## 2. 타입 (`lib/intraday-types.ts`)

```ts
type MinuteBar = {
  time: string;     // KST "HH:MM" 형식 ("09:00" ~ "15:30")
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
  endTime: string;        // ORB 마지막 봉 시간
};

type OrbSignal = {
  type: "LONG" | "SHORT";
  time: string;
  price: number;
  volumeMultiple: number; // bar.volume / avgVolume
};

type VwapPoint = {
  time: string;
  value: number;
};
```

---

## 3. 계산 함수 (`lib/intraday-calc.ts`)

### `calculateVwap(bars)`

```ts
// 09:00부터 누적 VWAP
// typical = (high + low + close) / 3
// vwap[i] = Σ(typical[0..i] × vol[0..i]) / Σ(vol[0..i])
const vwap = calculateVwap(bars);
// → VwapPoint[] (bars와 동일한 길이)
```

### `calculateOrb(bars, periodMinutes)`

```ts
// 첫 periodMinutes 개 봉의 고가 max / 저가 min
const orb = calculateOrb(bars, 30);
// → { high, low, periodMinutes: 30, endTime: "09:30" }
```

### `detectOrbBreakout(bars, orb, avgVolume)`

```ts
// ORB 종료 이후 봉 중 거래량 1.5배 이상인 봉에서
// close > orb.high → LONG
// close < orb.low  → SHORT
// 첫 번째 조건 충족 봉의 시그널 반환
const signal = detectOrbBreakout(bars, orb, avgVol);
// → OrbSignal | null
```

### `calcAvgVolume(bars)`

```ts
// bars 전체의 단순 평균 거래량
const avg = calcAvgVolume(bars); // → number
```

---

## 4. Mock 어댑터 (`lib/adapters/intraday-mock-adapter.ts`)

### 데이터 생성

```ts
import { generateIntradayMock, getMockStockName } from "@/lib/adapters/intraday-mock-adapter";

const bars = generateIntradayMock("005930");        // 390봉 (09:00~15:30)
const bars2 = generateIntradayMock("005930", 70000); // 기준가 직접 지정
const name = getMockStockName("005930");             // "삼성전자"
```

### Seeded RNG

- 같은 ticker → 항상 동일한 데이터 (Mulberry32 알고리즘)
- `tickerToSeed(ticker)`: ticker 문자열 → uint32 seed

### 오프닝 패턴

```
09:00~09:29: 변동성 × 2.67배, 거래량 × 3배
75% 확률로 ORB 종료 후 60분 이내에 의도적 돌파 봉 삽입
```

---

## 5. Server Component (`app/(dashboard)/intraday/page.tsx`)

```ts
export const dynamic = "force-dynamic"; // 매 요청마다 새로 렌더링

export default async function IntradayPage({ searchParams }) {
  const params = await searchParams;
  const ticker = params.ticker ?? "005930";
  const orbPeriod = Number(params.period ?? "30");

  const bars = generateIntradayMock(ticker);
  const name = getMockStockName(ticker);

  return <IntradayView ticker={ticker} name={name} bars={bars} orbPeriod={orbPeriod} />;
}
```

- 데이터 생성은 **서버에서** 실행 (클라이언트 번들 미포함)
- `force-dynamic`: 실제 API 연동 시 매번 최신 데이터 보장

---

## 6. Client Component (`IntradayView.tsx`)

### 시간 변환

lightweight-charts는 `UTCTimestamp` (Unix 초)를 요구합니다.

```ts
const KST_OFFSET_SEC = 9 * 3600; // UTC+9

function timeToTs(timeStr: string): UTCTimestamp {
  const [hh, mm] = timeStr.split(":").map(Number);
  const now = new Date();
  // 오늘 UTC 자정 기준
  const todayKst = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // KST 오늘 자정 → UTC 이전날 15:00
  const utcStart = todayKst - KST_OFFSET_SEC * 1000;
  return Math.floor((utcStart + (hh * 3600 + mm * 60) * 1000) / 1000) as UTCTimestamp;
}
```

### 차트 시리즈 추가 순서

```ts
const chart = createChart(containerRef.current, { ... });

// 1. 캔들스틱
const candleSeries = chart.addSeries(CandlestickSeries, { ... });
candleSeries.setData(bars.map(...));

// 2. ORB 고가/저가 (PriceLine)
candleSeries.createPriceLine({ price: orb.high, color: "#22c55e", lineStyle: 2 });
candleSeries.createPriceLine({ price: orb.low, color: "#ef4444", lineStyle: 2 });

// 3. VWAP (LineSeries)
const vwapSeries = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 2 });
vwapSeries.setData(vwap.map(...));

// 4. 돌파 시그널 마커
if (signal) {
  createSeriesMarkers(candleSeries, [{ time: timeToTs(signal.time), ... }]);
}

// 5. 거래량 히스토그램
const volumeSeries = chart.addSeries(HistogramSeries, { priceScaleId: "volume" });
volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
```

### 시간 축 레이블 재변환

```ts
timeScale: {
  timeVisible: true,
  tickMarkFormatter: (ts: number) => {
    const d = new Date((ts + KST_OFFSET_SEC) * 1000);
    return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  },
},
```

### ORB 기간 전환

버튼 클릭 → `router.push(\`/intraday?ticker=\${ticker}&period=\${p}\`)` → Server Component 재실행 → `bars` 재계산 → `useEffect` 재실행

---

## 7. ScreenerTable.tsx 수정 내용

```ts
// 추가된 import
import { useRouter } from "next/navigation";

// 컴포넌트 내부
const router = useRouter();

// 테이블 헤더에 열 추가
<th className={th}>ORB</th>

// 각 행 마지막 td
<td onClick={(e) => e.stopPropagation()}>
  <button onClick={() => router.push(`/intraday?ticker=${r.ticker}`)}>
    📊 ORB
  </button>
</td>
```

`e.stopPropagation()` 이유: 행 클릭 시 차트 모달이 열리므로 버튼 클릭은 전파 차단.

---

## 8. 실제 API로 교체하는 방법

### 키움 분봉 API 연동 예시

```ts
// lib/adapters/kiwoom-adapter.ts 에 추가
async function getMinuteBars(ticker: string, date: string): Promise<MinuteBar[]> {
  const res = await fetch(`https://api.kiwoom.com/v1/minute-bars?ticker=${ticker}&date=${date}`, {
    headers: { Authorization: `Bearer ${process.env.KIWOOM_API_KEY}` },
  });
  const raw = await res.json() as unknown;
  // Zod 스키마로 검증 후 MinuteBar[] 변환
  return parseMinuteBars(raw);
}
```

```ts
// app/(dashboard)/intraday/page.tsx 수정
const adapter = process.env.MARKET_DATA_ADAPTER;
const bars = adapter === "kiwoom"
  ? await getMinuteBars(ticker, today)
  : generateIntradayMock(ticker);
```

`MinuteBar` 타입을 유지하면 `IntradayView.tsx`는 **변경 없이** 실제 데이터를 그립니다.

---

## 9. 타입체크

```bash
pnpm type-check
```

---

## 10. 주요 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `lightweight-charts` | 기존 설치 | 분봉 캔들차트 |
| `next` | 기존 | App Router, Server Component |
| `react` | 기존 | Client Component, useRef/useEffect |

추가 설치 필요 없음.

# 개발자 가이드: 20일 고가 돌파 스크리너

> 로직을 왜 그렇게 짰는지, 안 그랬으면 어떤 문제가 생겼는지까지 설명합니다.

---

## 1. 실행 방법

```bash
# 의존성 설치
pnpm install

# 개발 서버
pnpm dev          # http://localhost:3000

# 검증
pnpm type-check   # TypeScript 오류 확인
pnpm lint         # ESLint 규칙 확인
pnpm build        # 프로덕션 빌드
```

### 주요 접근 경로

| URL | 설명 |
|-----|------|
| `/screener` | 스크리너 메인 페이지 |
| `/api/screener` | JSON API (market, date 파라미터) |
| `/api/screener?market=KOSPI` | KOSPI만 필터 |
| `/api/screener?date=2026-03-01` | 특정 날짜 |

---

## 2. 아키텍처 전체 흐름

```
MockAdapter (lib/market-data.ts)
    │
    │  getStockList() → ["005930", "000660", ...]
    │  getHistory()   → StockOHLCV[] (65일치)
    ▼
fetchAllStocks()  ← KOSPI 20종목 + KOSDAQ 15종목 병렬 조회
    │
    ▼
runScreener(stocks)  ← 10가지 조건 평가
    │
    │  evaluateStock() 호출 (종목별)
    │  passCount === 10 필터
    │  changeRate 내림차순 정렬
    ▼
ScreenerApiResponse
    │
    ├── GET /api/screener/route.ts → JSON 응답
    │
    └── page.tsx (Server Component)
            │
            └── <ScreenerTable /> (Client Component)
                    정렬 / 필터 / CSV 다운로드
```

---

## 3. 파일별 설명 + 로직 Why

### 3-1. `lib/screener-types.ts` — 타입 정의

```typescript
// history[0] = 오늘, history[1] = 어제, ... 규칙이 핵심
type StockData = {
  history: StockOHLCV[]; // 최소 60일치
};
```

**왜 history[0]이 오늘이어야 하나?**

모든 조건 함수가 `history[0]` = 오늘이라는 약속을 기반으로 작성됩니다. 반대로(오래된 것이 [0])
하면 모든 함수에서 `history[history.length - 1]`을 사용해야 해서 가독성이 나빠집니다.
또한 "오늘 데이터"를 항상 일정한 인덱스로 접근할 수 있어 버그 가능성이 줄어듭니다.

**안 했으면?** 각 함수마다 "오늘이 몇 번째 인덱스인지" 계산 로직이 들어가고,
신규 개발자가 인덱스 방향을 헷갈려 조건이 반대로 작동하는 버그가 발생할 수 있습니다.

---

```typescript
type ScreenerConditions = {
  breakout20: boolean;
  sideways: boolean;
  // ... 10개 boolean
};
```

**왜 boolean 10개를 별도 타입으로 묶었나?**

`ScreenerResult.conditions` 로 UI에서 `.conditions.breakout20` 처럼 접근합니다.
`passCount`는 `Object.values(conditions).filter(Boolean).length` 로 자동 계산됩니다.
조건이 추가될 때 타입 추가 → 자동으로 passCount에 반영됩니다.

**안 했으면?** `result.breakout20, result.sideways...` 10개 필드가 ScreenerResult
최상위에 흩어지고, "조건만 뽑아서 순회"하는 로직이 복잡해집니다.

---

### 3-2. `lib/screener.ts` — 10가지 조건 로직

#### 조건 1: `checkBreakout20`

```typescript
function checkBreakout20(today: StockOHLCV, prior20: StockOHLCV[]): boolean {
  if (prior20.length < LOOKBACK_DAYS) return false;
  const high20 = Math.max(...prior20.slice(0, LOOKBACK_DAYS).map((d) => d.high));
  return today.close > high20;  // ← 종가 vs 최고가 비교
}
```

**왜 `today.high > high20`이 아니라 `today.close > high20`인가?**

`high`(장중 최고가)는 순간적으로 튀어올랐다가 내려올 수 있습니다(윗꼬리).
`close`(종가)가 20일 고가를 넘어야 "실제로 박스권을 뚫었다"는 의미가 됩니다.
종가 기준이어야 다음날 진입 판단 근거가 됩니다.

**안 했으면?** 장중에만 잠깐 고가를 넘고 결국 아래로 내려온 종목도 "돌파"로 잡혀
허위 신호(false positive)가 늘어납니다.

---

#### 조건 2: `checkSideways` (횡보 필터)

```typescript
const range = (high20 - low20) / low20;
return range <= SIDEWAYS_MAX_RANGE; // 0.15 = 15%
```

**왜 이 조건이 있나? (테마주·급등주 제외)**

20일 고가 돌파만 보면 이미 급등한 종목도 걸립니다.
예: 20일 전 1,000원 → 15일 전 3,000원(급등) → 오늘 3,100원(새 고가)
→ 조건 1 통과하지만 이미 3배 오른 종목임.

횡보 필터는 "(최고가 - 최저가) / 최저가 ≤ 15%"이므로,
20일 동안 박스권에 갇혀있던(얌전히 있던) 종목만 통과합니다.

**왜 15%인가?** 실전에서 박스권의 통상적 범위가 10~15% 수준입니다.
5%면 너무 좁아서 거의 안 걸리고, 25%면 급등주도 통과합니다.

**안 했으면?** 테마주가 대거 포함되어 스크리너의 의미가 없어집니다.

---

#### 조건 3: `checkVolumeSurge` (거래량 폭증)

```typescript
const avgVolume = prior20.slice(0, 20).reduce(...) / 20;
return today.volume >= avgVolume * VOLUME_SURGE_MULTIPLIER; // 2배
```

**왜 거래량이 중요한가?**

주가가 오르는 데는 두 종류가 있습니다:
1. **수급 동반 상승**: 실제로 많은 사람이 사고 있어서 오름 → 지속 가능
2. **허수 상승**: 거래량 없이 소수가 가격만 올림 → 금방 빠짐

거래량이 평균의 2배 이상이어야 "진짜 관심"입니다.

**왜 오늘 거래량 vs 20일 평균인가?**
오늘 하루만 보면 종목 규모가 달라서 의미가 없습니다(대형주는 원래 거래량이 많음).
평균 대비 비율로 계산해야 "평소보다 얼마나 폭발했나"를 알 수 있습니다.

**안 했으면?** 거래량 없는 상승 → 다음날 바로 이익 실현 물량에 눌려 하락.

---

#### 조건 4: `checkTailFilter` (윗꼬리 제거)

```typescript
return today.close >= today.high * 0.99;
```

**왜 0.99인가?**

장마감 종가가 당일 최고가의 99% 이상이어야 합니다.
즉, 윗꼬리가 고가 대비 1% 이내여야 통과합니다.

- 종가 100 / 고가 100 = 1.00 → 윗꼬리 없음 ✓
- 종가 99 / 고가 100 = 0.99 → 1% 윗꼬리, 허용 ✓
- 종가 95 / 고가 100 = 0.95 → 5% 윗꼬리, 거절 ✗

**윗꼬리의 의미**: 장중에 올랐다가 결국 이익 실현 물량에 눌려 내려온 것.
윗꼬리가 크면 "팔려는 세력이 강하다"는 신호입니다.

**안 했으면?** 장중 급등 후 거의 원위치로 돌아온 종목이 "돌파"로 잡힙니다.

---

#### 조건 5: `checkTurnoverMin` (거래대금 500억)

```typescript
return today.turnover >= TURNOVER_MIN; // 50_000_000_000
```

**왜 거래대금(turnover)이 필요한가? 거래량으로 충분하지 않나?**

거래량은 "몇 주나 샀냐"이고, 거래대금은 "얼마어치 샀냐"입니다.
1원짜리 주식 100만 주 = 거래량 100만, 거래대금 100만 원
10만 원짜리 주식 100주  = 거래량 100, 거래대금 1,000만 원

기관투자자, 외국인 등은 "금액 기준"으로 움직입니다.
거래대금 500억이 안 되는 종목은 진입/청산이 어렵고(유동성 부족),
개인이 올린 종목일 가능성이 높습니다.

**안 했으면?** 시가총액이 극히 작은 종목(100억 미만)도 통과할 수 있고,
이런 종목은 매수 후 청산할 때 물량을 팔 수가 없습니다(슬리피지 문제).

---

#### 조건 6: `checkAboveMA60` (60일 이동평균 위)

```typescript
const slice = history.slice(1, 61); // history[1]~history[60] (오늘 제외)
const ma60 = slice.reduce((sum, d) => sum + d.close, 0) / 60;
return today.close > ma60;
```

**왜 history[1]부터 시작하나? history[0]부터 하면 안 되나?**

history[0]은 오늘입니다. MA60은 "오늘을 포함한 60일 평균"이 아니라
"오늘이 60일 추세 위에 있냐"를 보는 것이기 때문에 오늘을 제외한
60일 평균과 비교합니다. 오늘을 넣으면 자기 자신과 비교하는 셈이 됩니다.

**왜 60일인가?**
- 20일 MA: 단기 추세 (너무 민감)
- 60일 MA: 중기 추세 (3개월, 분기 흐름)
- 120일 MA: 장기 추세 (너무 느림)

"단기 반등이 아닌 중기 추세 위에 있냐"를 보는 것이 목적이므로 60일.

**안 했으면?** 하락 추세 중 일시적 반등(데드캣 바운스)도 통과합니다.
장기 하락 중인 종목이 하루 반등했을 때 걸리는 문제 발생.

---

#### 조건 7: `checkNotOverheated` (과열 방지 8%)

```typescript
const changeRate = ((today.close - yesterday.close) / yesterday.close) * 100;
return changeRate < OVERHEAT_MAX_RATE; // 8%
```

**왜 8%인가?**

한국 주식의 상한가는 30%입니다. 8%는 "이미 많이 올라서 다음날 눌릴 수 있는 기준"입니다.
실전 연구에서 당일 8% 이상 상승한 종목은 다음날 갭하락 또는 조정이 오는 경우가 많습니다.

**이 스크리너의 목적: "오늘 발견, 내일 진입"**이므로,
오늘 이미 너무 많이 오른 종목은 내일 진입하면 늦습니다.

**안 했으면?** 당일 7%, 8% 급등 종목이 포함되어 다음날 갭하락으로 손실.

---

#### 조건 8: `checkBullish` (양봉)

```typescript
return today.close > today.open;
```

**왜 이게 필요한가? 이미 상승률이 있으면 양봉 아닌가?**

아닙니다. 시가가 이미 올라서 시작했을 경우:
- 전일 종가 100, 오늘 시가 105(+5%), 오늘 종가 103(+3%)
- 상승률은 +3%이지만 음봉(시가보다 종가가 낮음)

음봉이면 "오늘 팔려는 사람이 더 많았다"는 신호입니다.
양봉이어야 "끝까지 강했다"는 의미.

**안 했으면?** 시가 갭업 후 음봉 종목도 포함 → 차익 실현이 강한 종목 진입.

---

#### 조건 9: `checkNoGap` (갭 제한 3%)

```typescript
return today.open <= yesterday.close * 1.03;
```

**갭 상승이 왜 위험한가?**

시가가 전일 종가보다 3% 이상 높게 시작하면 "갭 돌파"라고 합니다.

갭 돌파의 문제:
1. **갭 메움 리스크**: 주가는 갭을 메우려는 경향이 있음
2. **이미 비싸게 시작**: 진입 가격 자체가 높아 리스크/리워드 불리
3. **개인투자자 패닉 바잉 유인**: 갭업을 보고 뒤늦게 추격 매수 → 기관 물량 받기

**안 했으면?** 전날 밤 뉴스로 갭업 시작한 종목 포함 → 고점 진입.

---

#### 조건 10: `checkNotOverbought5d` (5일 연속 상승 제한)

```typescript
// history[1] = 어제, history[6] = 5일 전
const gain5d = (history[1].close - history[6].close) / history[6].close;
return gain5d <= 0.15; // 15%
```

**왜 history[6]인가? history[5]가 5일 전 아닌가?**

- history[0] = 오늘
- history[1] = 1일 전 (어제)
- history[2] = 2일 전
- history[3] = 3일 전
- history[4] = 4일 전
- history[5] = 5일 전
- history[6] = 6일 전

"직전 5일"이란 어제(1일 전)부터 5일 전까지의 기간입니다.
그러므로 `history[1] / history[6]`이 맞습니다.

**왜 15% 제한인가?**

5일에 15% 이상 올랐다면 이미 "급등 국면"입니다.
이런 종목이 20일 박스 상단을 뚫으면 "지속 상승"처럼 보이지만,
실제로는 이미 단기 오버슈팅일 가능성이 높습니다.

**안 했으면?** 5일 동안 이미 15~20% 오른 종목이 포함 → 고점에서 진입.

---

#### `evaluateStock` + `runScreener`

```typescript
export function runScreener(stocks: StockData[]): ScreenerResult[] {
  return stocks
    .map(evaluateStock)          // 모든 종목 평가
    .filter((r) => r.passCount === 10) // 10개 전부 통과
    .sort((a, b) => b.changeRate - a.changeRate); // 등락률 내림차순
}
```

**왜 passCount === 10 (AND 조건)인가? OR이나 8/10 이상도 가능하지 않나?**

OR 조건이면 조건 1개만 통과해도 표시됩니다 → 너무 많이 걸림.
8/10이면 핵심 조건(예: 횡보 필터)이 빠져도 통과 가능.

10/10 AND 조건의 의미: 10가지 위험 요소를 모두 피한 종목만.
각 조건은 독립적인 위험을 제거합니다. 하나라도 실패하면 위험이 존재.

**안 했으면?** 필터가 느슨해져서 "진짜 돌파"와 "가짜 돌파"가 섞임.

---

### 3-3. `lib/market-data.ts` — 어댑터 패턴

```typescript
type MarketDataAdapter = {
  getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]>;
  getHistory(ticker: string, days: number): Promise<StockOHLCV[]>;
  getStockName(ticker: string): Promise<string>;
};
```

**왜 인터페이스로 분리했나?**

데이터 소스 교체 시 `createAdapter()` 함수 한 줄만 바꾸면 됩니다.

```typescript
// 현재 (v1)
export function createAdapter(): MarketDataAdapter {
  return new MockAdapter();
}

// KIS API 연동 시 (v2)
export function createAdapter(): MarketDataAdapter {
  return new KisAdapter(process.env.MARKET_API_KEY);
}

// screener.ts, route.ts, page.tsx 는 전혀 변경 없음!
```

**안 했으면?** `screener.ts`, `route.ts`, `page.tsx` 전부에 KIS API 호출 코드가 박히고,
데이터 소스 교체 시 여러 파일을 동시에 수정해야 하며 테스트도 어려워집니다.

---

**왜 MockAdapter가 필요한가?**

실제 KIS API는:
1. API 키 발급 필요 (며칠 소요)
2. 호출 제한 (1초에 N번)
3. 장 마감 후에만 완전한 데이터 제공
4. 유료 또는 조건부 무료

MockAdapter가 있으면:
- API 키 없이 개발 가능
- 어디서든 빌드/테스트 가능 (CI/CD)
- 조건 경계값 테스트 데이터를 마음대로 생성

```typescript
// 돌파 패턴 전용 Mock 데이터 생성
function generateBreakoutStock(...): StockOHLCV[] {
  // 1~61일 전: 박스권 내 횡보
  // 오늘: 돌파 캔들 (거래량 2.5~4배, 갭 없이, 상승률 4~7%)
}
```

**안 했으면?** 개발할 때마다 실제 API를 호출해야 하고,
테스트 재현이 불가능합니다(매일 데이터가 바뀌니까).

---

### 3-4. `app/api/screener/route.ts` — API 라우트

```typescript
const querySchema = z.object({
  market: z.enum(["KOSPI", "KOSDAQ", "ALL"]).default("ALL"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
```

**왜 Zod로 검증하나?**

URL 파라미터는 사용자가 마음대로 입력할 수 있습니다:
- `?market=HACK` → enum에 없는 값
- `?date=hello` → 날짜 형식이 아님
- `?market=` → 빈 문자열

TypeScript는 컴파일 타임에만 타입 체크합니다.
런타임에 들어오는 외부 데이터(URL 파라미터, Body)는 실제로 무엇이 들어올지 모릅니다.
Zod는 런타임에 실제 값을 검증합니다.

**안 했으면?** 잘못된 파라미터가 스크리너 로직으로 전달되어 런타임 에러 또는 예상치 못한 결과.

---

```typescript
return NextResponse.json(response, {
  headers: {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
  },
});
```

**왜 Cache-Control을 넣었나?**

스크리너 API는:
- 같은 날짜 + 같은 시장이면 결과가 항상 동일 (결정론적)
- 종목 전체를 조회하고 계산하므로 처리 시간이 있음
- 여러 사람이 동시에 접속할 수 있음

`s-maxage=300`은 CDN에서 5분 캐시.
`stale-while-revalidate=600`은 캐시 만료 후 10분까지 이전 데이터를 보여주면서 백그라운드로 갱신.

**안 했으면?** 1분에 100명이 접속하면 100번 API를 호출하고 계산해야 함.
실제 KIS API 연동 시 호출 제한에 걸릴 수 있음.

---

### 3-5. `app/(dashboard)/screener/page.tsx` — Server Component

```typescript
export const revalidate = 300;
```

**왜 Server Component인가?**

1. **SEO**: 검색엔진이 결과를 읽을 수 있음
2. **초기 로딩 속도**: 서버에서 데이터를 받아서 완성된 HTML로 전달
3. **번들 크기 감소**: 데이터 조회 코드가 클라이언트 번들에 포함 안 됨
4. **API 키 보안**: 서버에서만 실행되므로 API 키가 브라우저에 노출 안 됨

**왜 revalidate = 300인가?**

ISR(Incremental Static Regeneration): 5분마다 서버에서 페이지를 다시 생성합니다.
주가 데이터는 장 마감 후에는 바뀌지 않으므로 5분 캐시는 충분합니다.

**안 했으면?**
- Client Component로 만들면: 클라이언트에서 API 호출 → 로딩 스피너 → 데이터 표시 (느림)
- revalidate 없으면: 매 요청마다 DB/API 조회 (비용 증가)

---

### 3-6. `ScreenerTable.tsx` — Client Component

```typescript
// SortIcon을 컴포넌트 밖에 선언
type SortIconProps = { col: SortKey; sortKey: SortKey; sortDir: SortDir; };

function SortIcon({ col, sortKey, sortDir }: SortIconProps) { ... }

export default function ScreenerTable(...) {
  // SortIcon은 여기서 정의하지 않음!
}
```

**왜 SortIcon을 컴포넌트 내부에 정의하면 안 되나?**

React에서 컴포넌트 내부에 함수형 컴포넌트를 정의하면,
부모 컴포넌트가 렌더링될 때마다 **새로운 컴포넌트 타입**이 생성됩니다.
React는 이를 "다른 컴포넌트"로 인식해서 매번 마운트/언마운트를 반복합니다.
이는 상태 초기화, 불필요한 DOM 재생성, 성능 저하를 유발합니다.

ESLint 규칙 `react-hooks/static-components`가 이를 에러로 잡습니다.

**안 했으면?** 정렬 버튼 클릭 시 SortIcon이 깜빡이거나 애니메이션이 끊기는 현상.

---

```typescript
const sorted = useMemo(() => {
  const filtered = marketFilter === "ALL"
    ? results
    : results.filter((r) => r.market === marketFilter);

  return [...filtered].sort((a, b) => {
    const v = sortDir === "desc" ? -1 : 1;
    return (a[sortKey] - b[sortKey]) * v;
  });
}, [results, sortKey, sortDir, marketFilter]);
```

**왜 useMemo인가?**

`results`는 서버에서 받은 배열입니다(최대 35종목).
정렬/필터 연산은 단순하지만, 사용자가 버튼을 클릭할 때마다 실행됩니다.
`useMemo`는 의존성(`results, sortKey, sortDir, marketFilter`)이 바뀔 때만 재계산합니다.

**안 했으면?** 버튼 클릭 외에 다른 상태가 바뀔 때도 정렬/필터가 재실행됩니다.
35종목이라 체감 성능 차이는 없지만, 데이터가 수백 종목으로 늘면 문제가 됩니다.

---

## 4. 데이터 흐름 상세

### MockAdapter의 돌파 패턴 생성 원리

```
generateBreakoutStock(seed, basePrice, baseTurnover):

 1~61일 전 (박스권 구간)
 ────────────────────────────────────────
 price = basePrice * 0.97 (기준가보다 3% 낮게 시작)
 매일: dailyReturn = clamp(random, -0.7%, +0.7%)
       → 박스권 내에서 얌전히 횡보

 오늘 (돌파 캔들)
 ────────────────────────────────────────
 todayOpen = yesterday.close * (1 + 0~1%)   → 갭 없이 시작
 todayClose = yesterday.close * (1 + 4~7%)  → 4~7% 상승
 todayHigh = todayClose * (1 + 0~0.5%)      → 윗꼬리 최소화
 todayVolume = avgVol * (2.5 ~ 4.0)         → 거래량 폭증
```

이 생성 로직 덕분에 MockAdapter의 돌파 패턴 종목들이 10가지 조건을 실제로 통과합니다.

---

## 5. 검증 포인트 (경계값 테스트)

| 조건 | 경계값 통과 | 경계값 실패 |
|------|------------|------------|
| sideways | 범위 = 15.0% → 통과 | 범위 = 15.1% → 실패 |
| volumeSurge | 거래량 = 평균 × 2.0 → 통과 | 거래량 = 평균 × 1.99 → 실패 |
| tailFilter | 종가 = 고가 × 0.99 → 통과 | 종가 = 고가 × 0.989 → 실패 |
| notOverheated | 상승률 = 7.99% → 통과 | 상승률 = 8.0% → 실패 |
| noGap | 시가 = 전일종가 × 1.03 → 통과 | 시가 = 전일종가 × 1.031 → 실패 |
| notOverbought5d | 5일 수익률 = 15.0% → 통과 | 5일 수익률 = 15.1% → 실패 |

---

## 6. v2 업그레이드 로드맵

### 우선순위 High

#### 6-1. KIS API 연동

```typescript
// lib/market-data.ts 에 추가
export class KisAdapter implements MarketDataAdapter {
  constructor(private apiKey: string) {}

  async getStockList(market: "KOSPI" | "KOSDAQ"): Promise<string[]> {
    // GET https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/...
  }

  async getHistory(ticker: string, days: number): Promise<StockOHLCV[]> {
    // GET https://openapi.koreainvestment.com:9443/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice
  }
}

// createAdapter()만 변경
export function createAdapter(): MarketDataAdapter {
  const apiKey = process.env.MARKET_API_KEY;
  if (!apiKey) return new MockAdapter(); // 폴백
  return new KisAdapter(apiKey);
}
```

**변경 필요 파일**: `lib/market-data.ts` 만.
`screener.ts`, `route.ts`, `page.tsx` 는 변경 없음.

#### 6-2. 날짜 피커 UI

```typescript
// app/(dashboard)/screener/DatePicker.tsx (신규)
"use client";

export default function DatePicker({ value, onChange }: Props) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

```typescript
// page.tsx 에 추가
// URL을 업데이트하는 Client Component로 wrapping
```

#### 6-3. 테스트 코드

```typescript
// lib/__tests__/screener.test.ts
import { evaluateStock } from "../screener";

describe("checkNotOverheated", () => {
  it("7.99% 상승 → 통과", () => { ... });
  it("8.00% 상승 → 실패", () => { ... });
});
```

### 우선순위 Medium

#### 6-4. 백테스트 엔진

```typescript
// lib/backtest.ts (신규)
type BacktestResult = {
  entryDate: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;  // 5일 후, 20일 후
  returnRate: number;
};

function runBacktest(
  stocks: StockData[],
  fromDate: string,
  toDate: string,
): BacktestResult[]
```

#### 6-5. 알림 기능

```typescript
// app/api/screener/notify/route.ts (신규)
// cron job 또는 장마감 후 웹훅으로 호출
// 결과를 슬랙/카카오 채널로 전송
```

### 우선순위 Low

#### 6-6. 조건 커스터마이징

```typescript
// 현재는 상수로 고정된 값들을 사용자가 변경 가능하도록
type ScreenerConfig = {
  overheatMaxRate: number;    // 기본 8%
  sidewaysMaxRange: number;   // 기본 15%
  turnoverMin: number;        // 기본 500억
  volumeSurgeMultiplier: number; // 기본 2배
};
```

---

## 7. 현재 코드의 Known Limitations

| 항목 | 현재 | 개선 방향 |
|------|------|----------|
| 데이터 소스 | MockAdapter (가짜 데이터) | KIS API 연동 |
| 종목 수 | KOSPI 20 + KOSDAQ 15 = 35종목 | 전체 종목 (~2,000종목) |
| 날짜 선택 | URL 파라미터 | 달력 UI |
| 오류 로깅 | 없음 (console.log 금지) | logger 라이브러리 도입 |
| 테스트 | 없음 | Jest 단위 테스트 추가 |
| 실시간성 | ISR 5분 캐시 | 장중 실시간 WebSocket (선택) |

---

## 8. 디렉터리 구조 최종 정리

```
turbo-break/
├── lib/
│   ├── screener-types.ts   # 타입만 (의존성 없음, 가장 아래 레이어)
│   ├── screener.ts         # 순수 함수만 (screener-types에만 의존)
│   └── market-data.ts      # 어댑터 (screener-types에만 의존)
│
├── app/
│   ├── api/screener/
│   │   └── route.ts        # HTTP 레이어 (lib/* 사용)
│   └── (dashboard)/screener/
│       ├── page.tsx         # Server Component (lib/* + route.ts)
│       └── ScreenerTable.tsx # Client Component (screener-types만)
│
└── docs/
    ├── 01-plan/features/turbo-break.plan.md
    ├── 02-design/features/turbo-break.design.md
    ├── 03-analysis/turbo-break.analysis.md
    ├── 04-report/turbo-break.report.md
    └── guide/
        ├── beginner-guide.md  ← 지금 읽는 문서
        └── developer-guide.md
```

**의존성 방향**: `screener-types → screener/market-data → route.ts/page.tsx → ScreenerTable`
순환 없음. 변경 시 아래 레이어만 고치면 됨.

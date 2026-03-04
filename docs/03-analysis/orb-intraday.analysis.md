# orb-intraday Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: turbo-break
> **Analyst**: gap-detector
> **Date**: 2026-03-04
> **Design Doc**: [orb-intraday.design.md](../02-design/features/orb-intraday.design.md)
> **Design Version**: 1.0

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

orb-intraday 기능(ORB + VWAP 인트라데이 스크리너)의 Design v1.0 문서와 실제 구현 코드 간의 일치율을 측정하고, 누락/불일치/추가 항목을 식별한다.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/orb-intraday.design.md`
- **Implementation Files**:
  - `lib/intraday-types.ts` (타입 정의)
  - `lib/intraday-calc.ts` (계산 로직)
  - `lib/adapters/intraday-mock-adapter.ts` (Mock 어댑터)
  - `app/(dashboard)/intraday/page.tsx` (Server Component)
  - `app/(dashboard)/intraday/IntradayView.tsx` (Client Component)
  - `app/(dashboard)/screener/ScreenerTable.tsx` (ORB 버튼)
- **Analysis Date**: 2026-03-04

---

## 2. Gap Analysis (Design vs Implementation)

### 2.1 타입 정의 (`lib/intraday-types.ts`)

| Design 타입 | Design 필드 | Implementation | Status |
|-------------|------------|----------------|--------|
| `MinuteBar.time` | `string` (HH:MM) | `string` (HH:MM) | PASS |
| `MinuteBar.open` | `number` | `number` | PASS |
| `MinuteBar.high` | `number` | `number` | PASS |
| `MinuteBar.low` | `number` | `number` | PASS |
| `MinuteBar.close` | `number` | `number` | PASS |
| `MinuteBar.volume` | `number` | `number` | PASS |
| `OrbLevel.high` | `number` | `number` | PASS |
| `OrbLevel.low` | `number` | `number` | PASS |
| `OrbLevel.periodMinutes` | `number` (5/15/30) | `number` | PASS |
| `OrbLevel.endTime` | `string` | `string` | PASS |
| `OrbSignal.type` | `"LONG" \| "SHORT"` | `"LONG" \| "SHORT"` | PASS |
| `OrbSignal.time` | `string` | `string` | PASS |
| `OrbSignal.price` | `number` | `number` | PASS |
| `OrbSignal.volumeMultiple` | `number` | `number` | PASS |
| `VwapPoint.time` | `string` | `string` | PASS |
| `VwapPoint.value` | `number` | `number` | PASS |

**타입 정의**: 16/16 항목 PASS (100%)

---

### 2.2 계산 로직 (`lib/intraday-calc.ts`)

| Design 스펙 | Implementation | Status | Notes |
|-------------|----------------|--------|-------|
| VWAP = Sigma(typical x vol) / Sigma(vol) | `calculateVwap()` 누적 계산 | PASS | typical = (H+L+C)/3 정확히 일치 |
| 09:00 첫 봉부터 누적 계산 | bars.map 순회, cumTypicalVol/cumVol 누적 | PASS | |
| 각 봉마다 중간 VWAP 반환 | VwapPoint[] 배열 반환 | PASS | |
| ORB High = max(첫 N봉 high) | `Math.max(...orbBars.map(b => b.high))` | PASS | |
| ORB Low = min(첫 N봉 low) | `Math.min(...orbBars.map(b => b.low))` | PASS | |
| N = orbPeriod (5/15/30분) | `bars.slice(0, periodMinutes)` | PASS | |
| endTime = N번째 봉 time | `orbBars[orbBars.length - 1]?.time` | PASS | |
| 돌파: ORB 종료 이후 봉만 | `bars.filter(b => b.time > orb.endTime)` | PASS | |
| 거래량 필터: vol/avg >= 1.5 | `volMultiple < 1.5 -> continue` | PASS | |
| LONG: close > orb.high | `bar.close > orb.high` | PASS | |
| SHORT: close < orb.low | `bar.close < orb.low` | PASS | |
| 첫 봉만 반환, 없으면 null | for...of + early return, 끝에 null | PASS | |
| (추가) calcAvgVolume | 전체 봉 평균 거래량 | PASS | Design에 명시 안 됨, 보조 함수 |

**계산 로직**: 12/12 핵심 항목 PASS (100%)

---

### 2.3 Mock 어댑터 (`lib/adapters/intraday-mock-adapter.ts`)

| Design 스펙 | Implementation | Status | Notes |
|-------------|----------------|--------|-------|
| 오프닝 (09:00~09:30) 변동성 x2.67 | `volatility = isOpening ? 0.004 : 0.0015` (비율 2.67) | PASS | 0.004/0.0015 = 2.67 |
| 오프닝 거래량 x3.0 | `volMultiplier = isOpening ? 3.0` | PASS | |
| 점심 (12:00~13:00) 거래량 x0.4 | `isLunch ? 0.4` | PASS | |
| 마감 (15:20~15:30) 거래량 x1.8 | `isClose ? 1.8` | PASS | |
| 그 외 거래량 x1.0 | 기본값 1.0 | PASS | |
| GBM: close = open x (1 + drift + shock) | `close = Math.round(open * (1 + ret))` | PASS | drift=0, shock=volatility*(rng*2-1) |
| tickerToSeed(ticker) 동일 데이터 | `tickerToSeed()` + Mulberry32 RNG | PASS | |
| 75% 돌파 패턴 주입 | `rng() > 0.25` | PASS | |
| ORB 종료 후 60분 이내 돌파 | `breakoutMinute = ORB_MINUTES + floor(rng() * 60)` | PASS | |
| (추가) getMockStockName | 종목명 매핑 20개 | PASS | Design에 직접 명시 안 됨 |

**Mock 어댑터**: 9/9 핵심 항목 PASS (100%)

---

### 2.4 URL 스키마 및 Server Component (`page.tsx`)

| Design 스펙 | Implementation | Status | Notes |
|-------------|----------------|--------|-------|
| 기본 ticker=005930 | `params.ticker ?? "005930"` | PASS | |
| 기본 period=30 | `Number(params.period ?? "30")` | PASS | |
| /intraday?ticker=xxx&period=yy | searchParams 처리 | PASS | |
| Server Component | `export const dynamic = "force-dynamic"` | PASS | |
| generateIntradayMock(ticker) 서버 실행 | page.tsx에서 호출 | PASS | |
| `<IntradayView bars={bars} ... />` | props 전달 구조 일치 | PASS | |

**URL/Server Component**: 6/6 항목 PASS (100%)

---

### 2.5 IntradayView.tsx (Client Component)

#### 2.5.1 레이아웃 구조

| Design 레이아웃 항목 | Implementation | Status | Notes |
|---------------------|----------------|--------|-------|
| 돌아가기 버튼 | `router.back()` | PASS | |
| 종목명 + ticker 표시 | `{name}` + `{ticker}` | PASS | |
| ORB 기간 선택 (5분/15분/30분) | `ORB_PERIOD_OPTIONS = [5, 15, 30]` | PASS | |
| 현재가 카드 | MetricCard "현재가" | PASS | |
| VWAP 카드 | MetricCard "VWAP" + 위/아래 표시 | PASS | |
| ORB 고가 카드 | MetricCard "ORB 고가" | PASS | |
| ORB 저가 카드 | MetricCard "ORB 저가" | PASS | |
| 범례 (VWAP / ORB 고가 / ORB 저가) | LegendItem 컴포넌트 3종 | PASS | ORB 구간 거래량 범례 추가 |
| 분봉 캔들 차트 | CandlestickSeries | PASS | |
| VWAP 파랑 실선 | LineSeries `#3b82f6` | PASS | |
| ORB 고가 초록 점선 | createPriceLine `#22c55e`, lineStyle: 2 | PASS | |
| ORB 저가 빨강 점선 | createPriceLine `#ef4444`, lineStyle: 2 | PASS | |
| LONG/SHORT 마커 | createSeriesMarkers arrowUp/arrowDown | PASS | |
| 거래량 히스토그램 | HistogramSeries, priceScaleId: "volume" | PASS | |
| 시그널 요약 카드 | SignalCard 컴포넌트 | PASS | |
| ORB 구간 정보 섹션 | InfoRow 4종 (구간/고가/저가/범위) | PASS | |

**레이아웃**: 16/16 항목 PASS (100%)

#### 2.5.2 차트 시리즈 구성

| Design 시리즈 | 색상 (Design) | 색상 (Impl) | Status |
|--------------|--------------|-------------|--------|
| 분봉 캔들 (빨강/파랑) | 빨강/파랑 | `#ef4444`/`#3b82f6` | PASS |
| VWAP LineSeries | `#3b82f6`, lineWidth: 2 | `#3b82f6`, lineWidth: 2 | PASS |
| 거래량 Histogram | priceScaleId: "volume", top: 0.85 | priceScaleId: "volume", top: 0.85 | PASS |
| ORB 고가 PriceLine | `#22c55e`, lineStyle: 2 | `#22c55e`, lineStyle: 2 | PASS |
| ORB 저가 PriceLine | `#ef4444`, lineStyle: 2 | `#ef4444`, lineStyle: 2 | PASS |
| 돌파 마커 | 초록/빨강, arrowUp/arrowDown | `#22c55e`/`#ef4444`, arrowUp/arrowDown | PASS |

**차트 시리즈**: 6/6 항목 PASS (100%)

#### 2.5.3 거래량 색상 규칙

| 조건 (Design) | 색상 (Design) | 색상 (Impl) | Status |
|--------------|--------------|-------------|--------|
| ORB 구간 봉 | `#94a3b880` | `#94a3b880` | PASS |
| Surge 봉 (vol >= avg x 1.5) | `#f9731690` | `#f9731690` | PASS |
| 양봉 (일반) | `#ef444430` | `#ef444430` | PASS |
| 음봉 (일반) | `#3b82f630` | `#3b82f630` | PASS |

**거래량 색상**: 4/4 항목 PASS (100%)

---

### 2.6 시간 변환

| Design 스펙 | Implementation | Status |
|-------------|----------------|--------|
| KST_OFFSET_SEC = 9 * 3600 | `const KST_OFFSET_SEC = 9 * 3600` | PASS |
| timeToTs 함수 (HH:MM -> UTCTimestamp) | timeToTs 함수 구현 완료 | PASS |
| tickMarkFormatter HH:MM 재변환 | `tickMarkFormatter` 콜백 구현 | PASS |

**시간 변환**: 3/3 항목 PASS (100%)

---

### 2.7 다크모드

| Design 스펙 | Implementation | Status |
|-------------|----------------|--------|
| `classList.contains("dark")` 판별 | `const isDark = document.documentElement.classList.contains("dark")` | PASS |
| layout.background 분기 | `isDark ? "#111827" : "#ffffff"` | PASS |
| textColor 분기 | `isDark ? "#9ca3af" : "#374151"` | PASS |
| grid 색상 분기 | `isDark ? "#1f2937" : "#f3f4f6"` | PASS |
| Tailwind `dark:` prefix 전체 적용 | 모든 UI 요소에 `dark:` 클래스 적용 | PASS |

**다크모드**: 5/5 항목 PASS (100%)

---

### 2.8 파일 변경 목록

| Design 파일 | 변경 유형 (Design) | 실제 존재 | Status |
|------------|-------------------|----------|--------|
| `lib/intraday-types.ts` | 신규 | 존재 | PASS |
| `lib/intraday-calc.ts` | 신규 | 존재 | PASS |
| `lib/adapters/intraday-mock-adapter.ts` | 신규 | 존재 | PASS |
| `app/(dashboard)/intraday/page.tsx` | 신규 | 존재 | PASS |
| `app/(dashboard)/intraday/IntradayView.tsx` | 신규 | 존재 | PASS |
| `app/(dashboard)/screener/ScreenerTable.tsx` | 수정 (ORB 버튼) | ORB 버튼 + router.push 존재 | PASS |

**파일 목록**: 6/6 항목 PASS (100%)

---

### 2.9 ScreenerTable.tsx ORB 버튼

| Design 스펙 | Implementation | Status |
|-------------|----------------|--------|
| "ORB" 버튼 표시 | `📊 ORB` 버튼 존재 | PASS |
| `router.push('/intraday?ticker=...')` | `router.push(\`/intraday?ticker=${r.ticker}\`)` | PASS |
| useRouter 사용 | ScreenerTable 내 useRouter 사용 | PASS |

**ORB 버튼**: 3/3 항목 PASS (100%)

---

## 3. Match Rate Summary

```
+---------------------------------------------+
|  Overall Match Rate: 100%                    |
+---------------------------------------------+
|  Total Items Checked:    86                  |
|  PASS:                   86 (100%)           |
|  Missing (Design O, Impl X):   0 (0%)       |
|  Changed (Design != Impl):     0 (0%)       |
|  Added (Design X, Impl O):     2 (minor)    |
+---------------------------------------------+
```

### Category Breakdown

| Category | Items | PASS | Rate |
|----------|:-----:|:----:|:----:|
| Type Definitions | 16 | 16 | 100% |
| Calculation Logic | 12 | 12 | 100% |
| Mock Adapter | 9 | 9 | 100% |
| URL / Server Component | 6 | 6 | 100% |
| Layout / UI Structure | 16 | 16 | 100% |
| Chart Series | 6 | 6 | 100% |
| Volume Colors | 4 | 4 | 100% |
| Time Conversion | 3 | 3 | 100% |
| Dark Mode | 5 | 5 | 100% |
| File List | 6 | 6 | 100% |
| ORB Button (ScreenerTable) | 3 | 3 | 100% |
| **Total** | **86** | **86** | **100%** |

---

## 4. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 98% | PASS |
| **Overall** | **99%** | PASS |

---

## 5. Added Features (Design X, Implementation O)

구현에는 있지만 Design 문서에 명시되지 않은 보조 항목:

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| `calcAvgVolume()` | `lib/intraday-calc.ts:70` | 평균 거래량 보조 함수 | Low (유틸리티) |
| `getMockStockName()` | `lib/adapters/intraday-mock-adapter.ts:123` | 종목명 매핑 함수 | Low (UX 보조) |

이 두 항목은 Design에 직접 명시되지 않았으나, 기능 구현에 필요한 자연스러운 보조 함수로 Gap이 아닌 보완적 추가입니다.

---

## 6. Convention Compliance

### 6.1 Naming Convention

| Category | Convention | Check | Status |
|----------|-----------|:-----:|:------:|
| Components | PascalCase | IntradayView, MetricCard, LegendItem, SignalCard, InfoRow | PASS |
| Functions | camelCase | calculateVwap, calculateOrb, detectOrbBreakout, calcAvgVolume, timeToTs | PASS |
| Constants | UPPER_SNAKE_CASE | KST_OFFSET_SEC, ORB_PERIOD_OPTIONS | PASS |
| Files (component) | PascalCase.tsx | IntradayView.tsx | PASS |
| Files (utility) | kebab-case.ts | intraday-types.ts, intraday-calc.ts, intraday-mock-adapter.ts | PASS |
| Folders | kebab-case | intraday, adapters | PASS |

### 6.2 Code Rules

| Rule | Status | Notes |
|------|:------:|-------|
| `type` 사용 (interface 자제) | PASS | 모든 타입이 `type` 사용 |
| `enum` 금지 | PASS | 사용 없음 |
| `any` 금지 | PASS | 사용 없음 |
| `console.log` 금지 | PASS | 사용 없음 |
| Server Component 기본 | PASS | page.tsx는 Server, IntradayView만 "use client" |
| Zod 환경변수 검증 | N/A | 이 기능에서 환경변수 미사용 |

### 6.3 Import Order

| File | External -> Internal -> Relative -> Type | Status |
|------|:---------------------------------------:|:------:|
| `intraday-calc.ts` | `import type` 사용 | PASS |
| `intraday-mock-adapter.ts` | `import type` 사용 | PASS |
| `page.tsx` | `@/lib/...` -> `./` 순서 | PASS |
| `IntradayView.tsx` | react -> next -> lightweight-charts -> @/lib -> @/lib | PASS |

### 6.4 Minor Convention Issue

| Item | File | Issue | Severity |
|------|------|-------|----------|
| eslint-disable 주석 | IntradayView.tsx:204 | `// eslint-disable-next-line react-hooks/exhaustive-deps` | Low |

이는 `useEffect` deps에서 의도적으로 일부 의존성을 제외한 것으로, 차트 라이브러리의 특성상 필요한 패턴입니다.

**Convention Score**: 98%

---

## 7. Architecture Compliance

| Layer | File | Expected | Actual | Status |
|-------|------|----------|--------|--------|
| Domain (Types) | `lib/intraday-types.ts` | 독립 | 외부 의존 없음 | PASS |
| Application (Logic) | `lib/intraday-calc.ts` | Domain만 의존 | `intraday-types` 만 import | PASS |
| Infrastructure (Adapter) | `lib/adapters/intraday-mock-adapter.ts` | Domain만 의존 | `intraday-types` 만 import | PASS |
| Presentation (Server) | `app/.../page.tsx` | Infrastructure + Presentation | adapter + IntradayView | PASS |
| Presentation (Client) | `app/.../IntradayView.tsx` | Domain + Application | types + calc 함수 import | PASS |

**Architecture Score**: 100%

---

## 8. Recommended Actions

### 8.1 Design 문서 업데이트 권장

| Item | Description | Priority |
|------|-------------|----------|
| `calcAvgVolume` 추가 | Design Section 3에 보조 함수로 명시 | Low |
| `getMockStockName` 추가 | Design Section 4에 종목명 매핑 함수 명시 | Low |

### 8.2 기술 부채

| Item | Description | Priority |
|------|-------------|----------|
| error.tsx 미구현 | `/intraday` 라우트에 에러 바운더리 없음 | Medium |
| loading.tsx 미구현 | `/intraday` 라우트에 로딩 상태 없음 | Medium |
| 실시간 다크모드 전환 | 차트 생성 후 테마 변경 시 재렌더링 필요 | Low |

---

## 9. Post-Analysis Verdict

**Match Rate: 100% (>= 90%)** -- Design과 구현이 완벽히 일치합니다.

86개 비교 항목 전부 PASS. Design v1.0에 명시된 모든 타입, 계산 로직, Mock 어댑터 스펙, URL 스키마, UI 레이아웃, 차트 시리즈, 거래량 색상 규칙, 시간 변환, 다크모드 처리가 구현에 정확히 반영되어 있습니다.

추가 구현된 2건(`calcAvgVolume`, `getMockStockName`)은 Design에 명시되지 않았으나 기능에 필요한 보조 유틸리티로, Design 문서에 반영하는 것을 권장합니다.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-04 | Initial gap analysis (Design v1.0 vs Implementation) | gap-detector |

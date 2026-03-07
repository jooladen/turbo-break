# Plan: 돌파 기간 선택 (5일/20일 콤보)

> **Feature**: breakout-period-selector
> **Phase**: Plan
> **Created**: 2026-03-07
> **Version**: 1.0
> **Author**: product-manager

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | 돌파 기간 선택 (5일/20일 콤보) |
| 생성일 | 2026-03-07 |
| 유형 | 기능 개선 |

### Results (예상)

| 항목 | 값 |
|------|-----|
| 수정 파일 | ~6개 |
| 변경 라인 | ~80줄 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 현재 20일 고가 돌파만 지원하여 단기 트레이딩(5일 돌파) 시그널을 놓치고 있음 |
| Solution | 5일/20일 돌파 기간을 콤보박스로 선택 가능하게 하고, 5일을 기본값으로 설정. 선택 시 즉시 재조회 |
| Function UX Effect | 단기(5일) 돌파 종목이 디폴트로 표시되어 빠른 매매 의사결정 가능. 20일로 전환하면 중기 관점 확인 |
| Core Value | 단기/중기 전략을 하나의 스크리너에서 전환하여 활용할 수 있어 트레이딩 유연성 향상 |

---

## 1. 배경 및 목적

### 1.1 문제 정의

- 현재 `LOOKBACK_DAYS = 20`이 하드코딩되어 20일 고가 돌파만 평가
- 스크리너 10개 조건 중 3개가 `LOOKBACK_DAYS`에 의존:
  - 조건 1: **N일 고가 돌파** (`checkBreakout20`) — 종가 > N일 최고가
  - 조건 2: **횡보 필터** (`checkSideways`) — N일 범위 <= 15%
  - 조건 3: **거래량 폭증** (`checkVolumeSurge`) — 당일 >= N일 평균 x 2
- 단기 트레이더에게 5일 돌파가 더 유용하지만 선택할 수 없음

### 1.2 목표

| # | 목표 | 측정 기준 |
|---|------|-----------|
| 1 | 5일을 기본값으로 설정 | 페이지 첫 로드 시 `?period=5` |
| 2 | 5일/20일 콤보 선택 | ScreenerControls에 select 추가 |
| 3 | 선택 시 즉시 조회 | 콤보 변경 -> form submit (조회 버튼 클릭 불필요) |
| 4 | 조건 라벨 동적 변경 | "20일 돌파?" -> "5일 돌파?" (선택에 따라) |
| 5 | URL 파라미터 유지 | `?period=5` 또는 `?period=20` |

---

## 2. 기능 요구사항

### 2.1 핵심 기능

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| FR-01 | period 파라미터 추가 | URL `?period=5\|20`, 기본값 `5` | P0 |
| FR-02 | screener.ts 파라미터화 | `LOOKBACK_DAYS`를 함수 인자로 전달 | P0 |
| FR-03 | ScreenerControls 콤보 추가 | 5일/20일 select + 즉시 조회 | P0 |
| FR-04 | 테이블 라벨 동적 변경 | ScreenerTable 헤더/범례 "N일 돌파?" | P0 |
| FR-05 | **모달 팝업 동적 변경** | 차트탭/초보자탭/전문가탭 모두 "N일" 반영 | P0 |
| FR-06 | page.tsx 파이프라인 | period 파라미터 읽기 -> evaluateAllStocks 전달 | P0 |
| FR-07 | BuySignal 메시지 동적화 | screener.ts의 positives/warnings 텍스트 "N일 돌파" | P0 |
| FR-08 | 타입 변경 | `ScreenerResult`에 `period` 필드 추가 | P1 |

### 2.2 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|----------|------|
| NFR-01 | 하위 호환 | `?period=` 미지정 시 5일 기본 동작 |
| NFR-02 | 타입 안전성 | `pnpm type-check` 통과 |
| NFR-03 | 빌드 성공 | `pnpm build` 에러 없음 |

---

## 3. 영향 범위

### 3.1 수정 파일

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `lib/screener-types.ts` | `ScreenerResult`에 `period` 필드 추가 |
| 2 | `lib/screener.ts` | `LOOKBACK_DAYS` 파라미터화, 함수 시그니처에 `period` 추가 |
| 3 | `app/(dashboard)/screener/ScreenerControls.tsx` | period 콤보 select + 즉시 submit |
| 4 | `app/(dashboard)/screener/page.tsx` | `?period=` 읽기 + evaluateAllStocks 전달 |
| 5 | `app/(dashboard)/screener/ScreenerTable.tsx` | 아래 상세 참조 (테이블 + 모달 모두) |
| 6 | `app/api/screener/route.ts` | `?period=` 파라미터 처리 |

### 3.2 ScreenerTable.tsx 상세 변경 범위 (테이블 + 모달 팝업)

ScreenerTable.tsx는 1658줄 파일로 **테이블 + 모달 팝업** 모두 포함. period 변경 시 양쪽 모두 동적화 필요:

#### 테이블 영역
| 위치 | 현재 | 변경 |
|------|------|------|
| L22-23 `CONDITION_LABELS` | `breakout20: "20일 돌파"` | `breakout20: "${period}일 돌파"` (동적) |
| L57-63 `CONDITION_META.breakout20` | `label: "20일 돌파"`, `easy/detail` 텍스트에 "20일" 하드코딩 | period에 맞게 동적화 |
| L65-69 `CONDITION_META.sideways` | "20일간 주가 변동폭" 등 텍스트 | period에 맞게 동적화 |
| L71-77 `CONDITION_META.volumeSurge` | "20일 평균의 2배" 텍스트 | period에 맞게 동적화 |
| L1440-1446 헤더 렌더링 | `CONDITION_LABELS[k]` 사용 | 동적 labels 사용 |

#### 모달 팝업 (차트/분석 탭)
| 위치 | 현재 | 변경 |
|------|------|------|
| L16 `generateKeyPoint` | `"20일 고가를 ...% 강하게 돌파"` | `"${period}일 고가를 ...% 강하게 돌파"` |
| L371-376 `toKidText` 초보자 설명 | `"20일 고가를"` 정규식 + "한 달 동안" | period에 맞게 동적화 |
| L387-392 `toKidText` 횡보 설명 | `"20일 박스권"` 정규식 + "한 달 동안" | period에 맞게 동적화 |
| L462-469 `toKidWarning` 경고 | `"20일 돌파 미달"` 정규식 + "20일 동안 가장 높은" | period에 맞게 동적화 |
| L566-579 `ExpertPanel` 전문가 패널 | breakout20 관련 텍스트에 "20일" | period에 맞게 동적화 |
| L906 `BuySignalPanel` | positives/warnings 텍스트 (screener.ts에서 생성) | screener.ts 메시지 동적화로 자동 해결 |

#### 모달 팝업 — `ExpertPanel` 관련
| 위치 | 현재 | 변경 |
|------|------|------|
| `ExpertDef.breakout20` | `name: "20일 고가 돌파"` 등 | period에 맞게 동적화 |
| `ExpertDef.sideways` | `"20일 횡보 범위"` | period에 맞게 동적화 |
| `ExpertDef.volumeSurge` | `"20일 평균 거래량"` | period에 맞게 동적화 |

### 3.2 미변경 파일

| 파일 | 이유 |
|------|------|
| `lib/market-data.ts` | 히스토리 데이터 조회는 period 무관 (항상 65일치 fetch) |
| `lib/adapters/*` | 어댑터는 period 개념 없음 |
| `lib/date-utils.ts` | 날짜 유틸과 무관 |

---

## 4. 설계 핵심 결정

### 4.1 `breakout20` 필드명 유지 vs 변경

**결정: `breakout20` 필드명 유지**

- `ScreenerConditions`의 `breakout20` 필드명을 `breakoutN`으로 바꾸면 ScreenerTable.tsx(1200줄+)의 수많은 참조를 수정해야 함
- 필드명은 "첫 번째 조건(돌파)" 정도의 의미로 유지하고, **라벨(UI)만 동적으로 변경**
- `breakout20`이 5일 돌파에도 사용되지만, 내부 코드에서는 "조건 1 = 돌파"로 해석

### 4.2 period 전달 방식

```
URL ?period=5
  → page.tsx에서 읽기
  → evaluateAllStocks(stocks, period)
  → evaluateStock(stock, period)
  → checkBreakout(today, priorN, period)
  → checkSideways(priorN, period)
  → checkVolumeSurge(today, priorN, period)
```

### 4.3 콤보 선택 시 즉시 조회

```tsx
<select name="period" onChange={() => formRef.current?.requestSubmit()}>
  <option value="5">5일 돌파</option>
  <option value="20">20일 돌파</option>
</select>
```

`onChange` -> `requestSubmit()`으로 form 제출. 조회 버튼 없이 바로 조회.

---

## 5. 검증 방법

| # | 검증 항목 | 방법 |
|---|-----------|------|
| 1 | 타입 안전성 | `pnpm type-check` |
| 2 | 빌드 | `pnpm build` |
| 3 | 5일 기본값 | `/screener` 접속 시 period=5 동작 확인 |
| 4 | 20일 전환 | 콤보에서 20일 선택 -> 즉시 재조회 확인 |
| 5 | 조건 라벨 | 5일 선택 시 "5일 돌파?", 20일 선택 시 "20일 돌파?" |
| 6 | URL 유지 | 조회 후 URL에 `?period=5` 또는 `?period=20` 표시 |

---

## 6. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| ScreenerTable 1200줄+ 수정 범위 | 중 | breakout20 필드명 유지로 최소화, period prop만 추가 |
| BuySignal 점수 체계 변경 | 낮음 | 점수 로직은 변경 없음, 메시지 텍스트만 동적화 |
| Mock 데이터 5일 돌파 패턴 부재 | 중 | 기존 돌파 패턴은 20일 기준 — 5일 돌파도 대부분 통과할 것 |

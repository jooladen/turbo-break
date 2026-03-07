# Plan: 전체 어댑터 날짜 반영

> **Feature**: adapter-date-fix
> **Phase**: Plan ✅
> **Created**: 2026-03-07
> **Version**: 1.0
> **Author**: product-manager

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | 전체 어댑터 날짜 반영 |
| 생성일 | 2026-03-07 |
| 유형 | 버그 수정 |

### Results

| 항목 | 값 |
|------|-----|
| 수정 파일 | 4개 |
| 변경 라인 | ~30줄 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 날짜를 변경해도 스크리너 결과가 동일 — `date` 파라미터가 UI 표시용으로만 사용됨 |
| Solution | `MarketDataAdapter.getHistory`에 `endDate` 파라미터 추가, 모든 어댑터와 데이터 생성 함수에 전달 |
| Function UX Effect | 날짜 변경 시 해당 기준일의 데이터로 스크리너 결과가 갱신됨 |
| Core Value | 과거 날짜 기반 백테스트/검증이 가능해져 스크리너 신뢰도 향상 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-07 | 초안 작성 — 날짜 파라미터 미반영 버그 수정 기획 | product-manager |

---

## 1. 배경 및 목적

### 1.1 문제 정의

- `ScreenerControls`에서 날짜를 변경해 `?date=2026-03-05` 등으로 전달해도 **스크리너 결과가 항상 동일**
- `date` 파라미터가 `page.tsx`에서 읽히지만 `fetchAllStocks()`에 전달되지 않음
- `MockAdapter.getHistory()`는 항상 `new Date()`(오늘)를 기준으로 데이터를 생성
- Yahoo/Kiwoom 어댑터도 종료일 기준점이 없어 항상 최신 데이터만 반환

### 1.2 기회

- 날짜 파라미터만 파이프라인에 연결하면 과거 날짜 기반 조회가 가능
- Mock 어댑터는 시드 기반이므로 `referenceDate`만 바꾸면 다른 OHLCV 생성
- 하위 호환성 유지 가능 — `endDate`는 optional 파라미터

### 1.3 목표

| # | 목표 | 측정 기준 |
|---|------|-----------|
| 1 | 날짜 변경 시 스크리너 결과가 달라짐 | `?date=2026-03-05` vs `?date=2026-03-04` 결과 상이 |
| 2 | 날짜 미지정 시 기존 동작 유지 | `endDate` 미전달 → `new Date()` 기준 |
| 3 | 모든 어댑터(Mock/Yahoo/Kiwoom)에 동일 적용 | 타입 시그니처 통일 |

---

## 2. 기능 요구사항

### 2.1 핵심 기능

| ID | 기능 | 설명 | 우선순위 |
|----|------|------|----------|
| FR-01 | MarketDataAdapter 인터페이스 변경 | `getHistory(ticker, days, endDate?)` 시그니처 | P0 |
| FR-02 | MockAdapter endDate 반영 | `generateHistory`, `generateBreakoutStock`에 `referenceDate` 전달 | P0 |
| FR-03 | Yahoo 어댑터 endDate 반영 | `period1`/`period2`를 endDate 기준으로 계산 | P0 |
| FR-04 | Kiwoom 어댑터 endDate 반영 | API 쿼리에 `&endDate=` 파라미터 추가 | P0 |
| FR-05 | fetchAllStocks endDate 전달 | 4번째 인자로 `endDate?` 추가 | P0 |
| FR-06 | page.tsx에서 date 전달 | `fetchAllStocks(adapter, market, 65, date)` | P0 |

### 2.2 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|----------|------|
| NFR-01 | 하위 호환성 | `endDate` 미지정 시 기존과 동일 동작 |
| NFR-02 | 타입 안전성 | `pnpm type-check` 통과 |
| NFR-03 | 빌드 성공 | `pnpm build` 에러 없음 |

---

## 3. 수정 대상 파일

### 3.1 파일 목록

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `lib/market-data.ts` | 인터페이스 + MockAdapter + fetchAllStocks 시그니처 변경 |
| 2 | `lib/adapters/yahoo-finance-adapter.ts` | `getHistory`에 `endDate?` 추가, `period2` 설정 |
| 3 | `lib/adapters/kiwoom-adapter.ts` | `getHistory`에 `endDate?` 추가, URL 파라미터 추가 |
| 4 | `app/(dashboard)/screener/page.tsx` | `fetchAllStocks` 호출 시 `date` 전달 |

### 3.2 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `lib/screener.ts` | 평가 로직은 history 배열만 사용, 날짜 무관 |
| `lib/screener-types.ts` | 타입 변경 불필요 |
| `ScreenerControls.tsx` | 이미 date를 form으로 전송 중 |
| `ScreenerTable.tsx` | props만 받아서 표시 |

---

## 4. 검증 방법

| # | 검증 항목 | 방법 |
|---|-----------|------|
| 1 | 타입 안전성 | `pnpm type-check` — 에러 없음 |
| 2 | 빌드 성공 | `pnpm build` — 성공 |
| 3 | 날짜별 결과 변화 | `/screener?date=2026-03-05&adapter=mock` → `date=2026-03-04`로 변경 시 결과 상이 |
| 4 | 기본값 동작 | 날짜 미지정 시 오늘 기준 동작 확인 |

---

## 5. 리스크 및 제약

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| Yahoo API `period2` 지원 여부 | 중 | yahoo-finance2 라이브러리 chart() 옵션 확인 완료 |
| Kiwoom API endDate 파라미터 미지원 가능 | 저 | 실제 API 문서 확인 필요, 쿼리 파라미터로 전달 |
| Mock 데이터 시드 변경으로 기존 테스트 깨짐 | 저 | 시드 로직 불변, referenceDate만 추가 |

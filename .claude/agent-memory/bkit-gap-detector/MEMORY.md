# Gap Detector Memory - turbo-break

## Latest Analysis (2026-03-07)
- Feature: breakout-period-selector (period 1~20 + volMul 0.5~5 + 컴포넌트 분리)
- Match Rate: 100% (Design v1.0 70항목 전부 PASS)
- Overall Score: 99% (Design 100% + Architecture 98% + Convention 98%)
- Design Doc: docs/02-design/features/breakout-period-selector.design.md v1.0
- Analysis Doc: docs/03-analysis/breakout-period-selector.analysis.md v3.0
- DEVIATED 2건: breakout20->breakout 리네임, minPass->requiredConditions 체크박스

## Key Findings (breakout-period-selector v3.0)
- 70개 설계 항목 PASS, FAIL 0, DEVIATED 2 (감점 없음), EXTRA 14
- volMultiplier 전면 적용 (checkBreakout20, checkVolumeSurge, evaluateBuySignal 등 6함수)
- period [1,2,3,4,5,20] 6개, volMul [0.5~5] 10개 옵션
- ScreenerTable 546줄 + 5파일 분리 (기술부채 해소)
- 잔여 기술부채: .env.example, error.tsx/loading.tsx

## Project Conventions
- pnpm only, no enum, no any, no console.log
- type preferred over interface
- Zod for external data validation
- Dark mode: Tailwind v4 @custom-variant, localStorage "theme" key
- Server Component default, "use client" only for interaction
- Logging: lib/logger.ts (server-only), no direct process.stdout.write

## orb-intraday Analysis (2026-03-04)
- Feature: orb-intraday (ORB + VWAP 인트라데이 스크리너)
- Match Rate: 100% (Design v1.0 vs Implementation)
- Analysis Doc: docs/03-analysis/orb-intraday.analysis.md
- Status: 86개 항목 전부 PASS, Design과 구현 완벽 일치
- Added (Design X, Impl O): calcAvgVolume, getMockStockName (보조 유틸)
- 기술부채: error.tsx/loading.tsx 미구현 (/intraday 라우트)

## Analysis History

### turbo-break (일봉 스크리너)
| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-03 | v1.0 | 97% | 기본 스펙 기준 |
| v2 | 2026-03-04 | v1.0 | 94% | 추가 기능 포함 재분석 |
| v3 | 2026-03-04 | v2.0 | 95% | Design v2.0 반영 후 재분석 |
| v4 | 2026-03-04 | v2.1 | 99% | v2.1 신규 항목 모두 구현 확인 |
| v5 | 2026-03-05 | v2.1 | 99% | 종합 재점검 (Overall 97%), 아키텍처/컨벤션 상세 분석 |
| v6 | 2026-03-06 | v2.1 | 99% | ORB 파일 부재 발견, ScreenerTable +79줄, 기술부채 5건 |

### breakout-period-selector (돌파 기간 선택)
| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-07 | v1.0 | 100% | 52항목 전부 PASS, 6파일 변경 |
| v1.1 | 2026-03-07 | v1.0+정렬 | 100% | 정렬 개선 5항목 추가, 총 65항목 PASS |
| v2.0 | 2026-03-07 | v1.0 | 100% | breakout20->breakout 리네임 + 조건별 체크박스, 16항목 PASS, DEVIATED 2 |
| v3.0 | 2026-03-07 | v1.0 | 100% | period 1~20 + volMul 0.5~5 + 컴포넌트 분리, 70항목 PASS, Overall 99% |

### orb-intraday (인트라데이 스크리너)
| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-04 | v1.0 | 100% | 86항목 전부 PASS |

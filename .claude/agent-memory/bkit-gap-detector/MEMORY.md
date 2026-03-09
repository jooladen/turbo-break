# Gap Detector Memory - turbo-break

## Latest Analysis (2026-03-10)
- Feature: breakout-period-selector (period 1~20 + volMul 0.5~5 + swRange + RSI/BB)
- Match Rate: 100% (Design v1.0 70항목 전부 PASS)
- Overall Score: 99% (Design 100% + Architecture 98% + Convention 98%)
- Design Doc: docs/02-design/features/breakout-period-selector.design.md v1.0
- Analysis Doc: docs/03-analysis/breakout-period-selector.analysis.md v4.0
- DEVIATED 2건: breakout20->breakout 리네임, minPass->requiredConditions 체크박스
- EXTRA 22건: RSI/BB + swRange + localStorage + 컴포넌트 분리 + 가이드 등

## Key Findings (breakout-period-selector v4.0)
- 70개 설계 항목 PASS, FAIL 0, DEVIATED 2 (감점 없음), EXTRA 22
- v3.0 이후 추가: RSI(14)+RSI(2) 패널, Bollinger Bands(20,2), swRange 파라미터
- calcRSI: Wilder's smoothing, 별도 120px 차트, 시간축 동기화, 70/30 수평선
- stock-chart-interactive.tsx 855줄 (RSI/BB 추가로 증가)
- swRange [7,8,9,10,15,20]% 6개 옵션, 기본값 15%
- localStorage 설정 복원 (screener-prefs 키, 2경로: 인라인 script + useEffect)
- 잔여 기술부채: .env.example, error.tsx/loading.tsx, 차트 유틸 분리 고려

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

## Analysis History

### turbo-break (일봉 스크리너)
| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-03 | v1.0 | 97% | 기본 스펙 기준 |
| v2 | 2026-03-04 | v1.0 | 94% | 추가 기능 포함 재분석 |
| v3 | 2026-03-04 | v2.0 | 95% | Design v2.0 반영 후 재분석 |
| v4 | 2026-03-04 | v2.1 | 99% | v2.1 신규 항목 모두 구현 확인 |
| v5 | 2026-03-05 | v2.1 | 99% | 종합 재점검 (Overall 97%) |
| v6 | 2026-03-06 | v2.1 | 99% | ORB 파일 부재, 기술부채 5건 |

### breakout-period-selector (돌파 기간 선택)
| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-07 | v1.0 | 100% | 52항목 PASS |
| v1.1 | 2026-03-07 | v1.0+정렬 | 100% | 65항목 PASS |
| v2.0 | 2026-03-07 | v1.0 | 100% | breakout 리네임+체크박스, DEVIATED 2 |
| v3.0 | 2026-03-07 | v1.0 | 100% | period+volMul+분리, 70항목, EXTRA 14 |
| v4.0 | 2026-03-10 | v1.0 | 100% | RSI/BB+swRange+localStorage, 70항목, EXTRA 22 |

### orb-intraday (인트라데이 스크리너)
| Version | Date | Design Ver | Match Rate | Notes |
|---------|------|-----------|-----------|-------|
| v1 | 2026-03-04 | v1.0 | 100% | 86항목 전부 PASS |

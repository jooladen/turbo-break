# Gap Detector Memory - turbo-break

## Latest Analysis (2026-03-04)
- Feature: turbo-break (20일 고가 돌파 스크리너)
- Match Rate: 94%
- Design Doc: v1.0 (2026-03-03)
- Status: Design 이후 8개 주요 기능 추가됨, Design 문서 v2.0 업데이트 필요

## Key Findings
- Design의 모든 기본 스펙은 구현됨 (Missing = 0)
- 주요 변경: ISR -> force-dynamic, ScreenerResult 타입 확장
- 주요 추가: BuySignal 시스템, Yahoo/키움 어댑터, 다크모드, 차트 모달
- Convention 위반: `process.stdout.write` in yahoo-finance-adapter.ts (로거 미사용)
- Code smell: ScreenerTable.tsx 1200+ lines (분리 권장)

## Project Conventions
- pnpm only, no enum, no any, no console.log
- type preferred over interface
- Zod for external data validation
- Dark mode: Tailwind v4 @custom-variant, localStorage "theme" key

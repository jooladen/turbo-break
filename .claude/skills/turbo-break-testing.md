---
name: turbo-break-testing
description: turbo-break 테스트 패턴 및 전략. Use when writing tests, fixing test failures, or adding test coverage.
---

# turbo-break 테스팅 가이드

## 테스트 스택 (예정)
- **단위 테스트**: Vitest + React Testing Library
- **E2E 테스트**: Playwright
- **API 테스트**: Vitest + supertest

## 테스트 파일 위치

```
turbo-break/
├── __tests__/              # 전역 테스트 유틸리티
├── app/
│   └── [route]/
│       └── __tests__/      # 라우트별 테스트
├── components/
│   └── [component]/
│       └── [Component].test.tsx
├── lib/
│   └── [util].test.ts
└── e2e/                    # Playwright E2E 테스트
    └── [feature].spec.ts
```

## 테스트 작성 원칙

### 단위 테스트 패턴
```typescript
// 컴포넌트 테스트
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('...')).toBeInTheDocument()
  })
})
```

### Server Action / API 테스트
```typescript
// API 라우트 테스트
import { GET, POST } from '@/app/api/[resource]/route'

describe('GET /api/[resource]', () => {
  it('should return 200', async () => {
    const response = await GET(new Request('http://localhost/api/[resource]'))
    expect(response.status).toBe(200)
  })
})
```

## 테스트 실행 명령어

```bash
pnpm test              # 전체 테스트 (watch 모드)
pnpm test:run          # 단일 실행
pnpm test:coverage     # 커버리지 포함
pnpm test:e2e          # E2E 테스트 (Playwright)
```

## 커버리지 목표
- **핵심 비즈니스 로직** (`lib/`): 80% 이상
- **API 라우트** (`app/api/`): 70% 이상
- **UI 컴포넌트**: 주요 인터랙션 위주

## 테스트 금지 사항
- ❌ 구현 세부사항 테스트 (내부 state 직접 검사)
- ❌ 스냅샷 테스트 남용
- ✅ 사용자 행동 기반 테스트 (what it does, not how)

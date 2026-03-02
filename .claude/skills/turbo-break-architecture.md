---
name: turbo-break-architecture
description: turbo-break 프로젝트 전체 아키텍처 이해. Use when working on any feature, creating new files, or making architectural decisions.
---

# turbo-break 아키텍처

## 기술 스택
- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript (strict mode)
- **패키지 매니저**: pnpm
- **스타일링**: TBD (프로젝트 진행 시 업데이트)
- **데이터베이스**: TBD

## 프로젝트 구조

```
turbo-break/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 인증 관련 라우트 그룹
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/        # 인증 후 대시보드 그룹
│   ├── api/                # API 라우트
│   │   └── [route]/
│   │       └── route.ts
│   ├── layout.tsx          # 루트 레이아웃
│   ├── page.tsx            # 홈 페이지
│   ├── error.tsx           # 에러 경계
│   └── loading.tsx         # 로딩 상태
├── components/             # 재사용 UI 컴포넌트
│   ├── ui/                 # 기본 UI 요소 (버튼, 입력 등)
│   └── [feature]/          # 기능별 컴포넌트
├── lib/                    # 유틸리티 & 헬퍼
│   ├── utils.ts
│   └── validations.ts      # Zod 스키마
├── types/                  # TypeScript 타입 정의
│   └── index.ts
└── public/                 # 정적 파일
```

## 핵심 원칙

### 파일 생성 규칙
- 컴포넌트: `components/[기능명]/ComponentName.tsx` (PascalCase)
- 유틸리티: `lib/[기능명].ts` (kebab-case)
- API 라우트: `app/api/[resource]/route.ts`
- 타입: `types/[도메인].ts`

### 컴포넌트 분류
1. **Server Component** (기본) — 데이터 fetching, 정적 UI
2. **Client Component** (`"use client"`) — 사용자 상호작용, 상태 관리

### 데이터 흐름
```
Server Component → fetch data → render
Client Component → Server Action / API Route → update UI
```

### API 라우트 패턴
```typescript
// app/api/[resource]/route.ts
export async function GET(req: Request) { ... }
export async function POST(req: Request) { ... }
```

## 의존성 방향
```
app/ (라우트) → components/ → lib/ → types/
                              ↑
                           외부 API/DB
```

## 환경변수 관리
- 모든 환경변수는 `lib/env.ts`에서 Zod로 검증 후 사용
- `.env.local` — 로컬 개발
- `.env.production` — 프로덕션 (절대 커밋 금지)

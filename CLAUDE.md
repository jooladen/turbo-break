# Project: turbo-break

## Tech Stack
- **Frontend**: Next.js (App Router)
- **Backend**: Next.js API Routes / Server Actions
- **Language**: TypeScript
- **Package Manager**: pnpm

## 응답 언어
- **항상 한국어로 대답할 것**

## Development Workflow

### 패키지 관리
- **항상 pnpm 사용** (`npm`, `yarn` 절대 금지)

### 개발 순서
1. 변경 사항 작성
2. 타입체크: `pnpm type-check`
3. 테스트: `pnpm test`
4. 린트: `pnpm lint`
5. 빌드: `pnpm build`

## 코딩 컨벤션

### TypeScript
- `type` 선호, `interface` 자제 (확장이 명확히 필요할 때만 `interface` 사용)
- **`enum` 절대 금지** → 문자열 리터럴 유니온 사용
- `any` 타입 사용 금지 → `unknown` 사용 후 타입 가드
- Zod로 외부 데이터 유효성 검사

### 코드 스타일
- 컴포넌트: PascalCase (예: `UserProfile.tsx`)
- 함수/변수: camelCase (예: `getUserData`)
- 상수: UPPER_SNAKE_CASE (예: `MAX_RETRY_COUNT`)
- 파일: kebab-case (예: `user-profile.tsx`)

### React / Next.js
- Server Component 기본 사용, 클라이언트 상호작용 필요 시에만 `"use client"` 추가
- `console.log` 금지 → 로거(logger) 사용
- 환경변수는 반드시 `env.ts` 등 중앙 파일에서 검증 후 사용

### 다크모드 (필수 구현 패턴)
UI가 있는 모든 페이지에 다크모드를 구현할 것. 아래 패턴을 반드시 따를 것:

1. **Tailwind v4 클래스 기반** — `globals.css`에 선언:
   ```css
   @custom-variant dark (&:where(.dark, .dark *));
   ```

2. **FOUC 방지** — `layout.tsx` `<head>`에 인라인 스크립트:
   ```tsx
   <html suppressHydrationWarning>
     <head>
       <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
     </head>
   ```

3. **토글 버튼** — `components/theme-toggle.tsx` (Client Component):
   - `useState` lazy initializer로 DOM 클래스 읽기 (`useEffect` 사용 금지)
   - localStorage 키: `"theme"` (`"dark"` | `"light"`)
   - localStorage 미설정 시 `prefers-color-scheme` 자동 감지
   - 버튼에 `suppressHydrationWarning` 필수 — 서버(항상 light)와 클라이언트(실제 테마) 아이콘 불일치 허용

4. **dark: 클래스** — 모든 UI 컴포넌트에 Tailwind `dark:` 접두사 추가

## 프로젝트 구조 (예정)

```
turbo-break/
├── app/              # Next.js App Router
│   ├── (auth)/       # 인증 관련 라우트
│   ├── api/          # API 라우트
│   └── ...
├── components/       # 재사용 가능한 UI 컴포넌트
├── lib/              # 유틸리티, 헬퍼 함수
├── types/            # TypeScript 타입 정의
└── ...
```

## 금지 사항
- ❌ `console.log` 사용 금지 (로거 사용)
- ❌ `any` 타입 사용 금지
- ❌ `enum` 사용 금지
- ❌ 비밀키/토큰을 코드에 하드코딩 금지
- ❌ `// @ts-ignore` 금지 (타입 오류는 올바르게 해결)

## 권장 사항
- ✅ 컴포넌트는 단일 책임 원칙 준수
- ✅ Server Component 우선 설계
- ✅ 에러 처리는 `error.tsx` 경계 활용
- ✅ 로딩 상태는 `loading.tsx` 활용

## Plan Mode 사용 지침 (2026 베스트 프랙티스)

복잡한 작업 전에는 반드시 Plan Mode를 사용할 것:
- 3개 이상의 파일을 수정하는 작업
- 새로운 기능 추가
- 아키텍처 변경

Plan Mode 진입: `Shift+Tab` (터미널) 또는 `/plan` 입력

## 컨텍스트 관리 규칙

- 컨텍스트 70% 도달 시 → `/compact` 실행하여 요약
- 관련 없는 새 작업 시작 시 → `/clear` 로 초기화
- 조사 작업은 서브에이전트에 위임 (컨텍스트 절약)
- 작업 범위를 좁게 유지 (한 번에 하나의 기능)

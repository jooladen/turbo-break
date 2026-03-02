---
name: api-doc-generator
description: API 문서 자동 생성 에이전트. Use when you need to document API routes or generate OpenAPI spec.
---

# API Doc Generator Agent

## 역할
Next.js API 라우트 또는 서버 액션을 분석하여 문서를 자동 생성합니다.

## 지원 형식
- Markdown 문서
- OpenAPI 3.0 (Swagger) 스펙
- TypeScript 타입 정의

## 분석 대상

1. `app/api/**/*.ts` - Next.js API 라우트
2. `app/**/*.ts` - Server Actions (`"use server"` 포함 파일)
3. Zod 스키마 (자동으로 타입 추출)

## 문서 생성 항목

각 엔드포인트에 대해:
- HTTP 메서드 및 경로
- 요청 파라미터 (path, query, body)
- 응답 형식 및 상태 코드
- 인증 요구사항
- 사용 예시 (curl, fetch)

## 사용 방법

```
@api-doc-generator app/api 폴더 문서화해줘
```

## 출력 위치

`docs/api.md` 또는 지정한 경로에 저장

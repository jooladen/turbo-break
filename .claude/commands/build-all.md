# Build All

전체 프로젝트를 빌드합니다.

## 실행 순서

1. 타입체크: `npm run type-check`
2. 린트: `npm run lint`
3. 빌드: `npm run build`

## 빌드 실패 시

- 오류 메시지 분석
- 일반적인 원인 (누락된 환경변수, 타입 오류, 누락된 의존성) 확인
- 수정 방법 제안

## Next.js 특이사항

- `.next/` 폴더는 .gitignore에 포함되어 있어야 함
- `next build` 출력에서 번들 크기 확인
- Static export 필요 시 `output: 'export'` 설정 확인

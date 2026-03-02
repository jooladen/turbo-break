# Type Check All

전체 프로젝트 타입 오류를 검사합니다.

## 실행

```bash
npm run type-check
```

또는 tsconfig.json이 있다면:

```bash
npx tsc --noEmit
```

## 오류 처리

- 타입 오류 목록 출력 후 수정 제안
- `// @ts-ignore`로 무시하지 말고 근본적으로 해결
- `any` 타입을 사용한 임시 해결책 금지

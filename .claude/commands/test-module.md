# Test Module

특정 모듈 또는 전체 테스트를 실행합니다.

## 사용법

```
/test-module [모듈명 또는 파일 경로]
```

예시:
- `/test-module` → 전체 테스트
- `/test-module auth` → auth 관련 테스트
- `/test-module components/Button` → 특정 컴포넌트 테스트

## 실행 명령어

```bash
# 전체 테스트
npm test

# 특정 파일
npm test -- --testPathPattern="[모듈명]"

# watch 모드
npm test -- --watch
```

## 결과 분석

- 실패한 테스트의 원인 분석
- 테스트 커버리지 확인
- 실패 원인에 따른 수정 제안

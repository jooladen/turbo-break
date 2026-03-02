# Commit, Push, and Create PR

현재 변경사항을 커밋하고 PR을 생성합니다.

## 순서

1. `git status`로 변경 파일 확인
2. `git diff`로 변경 내용 검토
3. 변경사항을 요약한 커밋 메시지 작성 (한국어 또는 영어)
4. `git add` → `git commit` 실행
5. `git push` (브랜치 없으면 현재 브랜치로)
6. `gh pr create`로 PR 생성 (gh CLI 설치된 경우)

## 커밋 메시지 규칙

- `feat:` 새 기능
- `fix:` 버그 수정
- `refactor:` 코드 개선 (기능 변경 없음)
- `docs:` 문서 수정
- `chore:` 설정, 빌드 등

## 주의사항

- `--force push`는 사용자 명시적 요청 없이 절대 사용 안 함
- 민감한 파일 (.env 등) 커밋 여부 반드시 확인

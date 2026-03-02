/**
 * bknd 임베디드 백엔드 API 라우트
 * /api/* 경로의 모든 요청을 bknd가 처리
 *
 * 제공되는 엔드포인트:
 * - POST /api/auth/login       - 로그인
 * - POST /api/auth/register    - 회원가입
 * - GET  /api/auth/me          - 현재 사용자 정보
 * - POST /api/auth/logout      - 로그아웃
 * - GET  /api/data/{entity}    - 데이터 조회 (인증 필요)
 * - GET  /api/system/ping      - 헬스 체크
 */
import { handler } from "@/lib/bknd";

export const dynamic = "force-dynamic";

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };

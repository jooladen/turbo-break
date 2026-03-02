/**
 * bknd 서버 사이드 설정
 * Next.js API 라우트에서 임베디드 백엔드로 동작
 *
 * 사용법: app/api/[...bknd]/route.ts 에서 import
 *
 * 제공되는 엔드포인트:
 * - POST /api/auth/login           - 로그인
 * - POST /api/auth/register        - 회원가입
 * - GET  /api/auth/me              - 현재 사용자
 * - POST /api/auth/logout          - 로그아웃
 * - GET  /api/data/{entity}        - 데이터 조회
 */
import { serve } from "bknd/adapter/nextjs";

export const handler = serve({
  connection: {
    url: process.env.DATABASE_URL ?? "file:./bknd.db",
  },
  config: {
    auth: {
      enabled: true,
      jwt: {
        secret: process.env.APP_SECRET ?? "fallback-secret-change-in-production",
        expires: 3600, // 액세스 토큰 만료: 1시간
      },
      strategies: {
        password: {
          enabled: true,
          type: "password",
          config: {},
        },
      },
    },
  },
});

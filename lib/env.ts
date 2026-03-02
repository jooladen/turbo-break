import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL은 필수입니다"),
  APP_SECRET: z.string().min(16, "APP_SECRET은 최소 16자 이상이어야 합니다"),
  NEXT_PUBLIC_APP_URL: z.string().url("유효한 URL이어야 합니다"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // 시장 데이터 어댑터 선택
  MARKET_DATA_ADAPTER: z.enum(["yahoo", "kiwoom", "mock"]).default("mock"),
  // 키움 REST API (MARKET_DATA_ADAPTER=kiwoom 선택 시 필요)
  KIWOOM_API_KEY: z.string().optional(),
  KIWOOM_SECRET_KEY: z.string().optional(),
  KIWOOM_API_BASE_URL: z.string().url().default("https://openapi.kiwoom.com"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url("유효한 URL이어야 합니다"),
});

function validateServerEnv() {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  - ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    throw new Error(`환경변수 설정 오류:\n${messages}`);
  }
  return result.data;
}

function validateClientEnv() {
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  - ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    throw new Error(`환경변수 설정 오류:\n${messages}`);
  }
  return result.data;
}

// 서버 환경변수 (서버 컴포넌트 / API 라우트에서만 사용)
export const serverEnv = validateServerEnv();

// 클라이언트 환경변수 (클라이언트 컴포넌트에서도 사용 가능)
export const clientEnv = validateClientEnv();

"use client";

/**
 * 클라이언트 사이드 bknd API 인스턴스
 * Client Components에서 import하여 사용
 *
 * 사용 예:
 *   import { api } from "@/lib/bknd-client";
 *   await api.auth.login("password", { email, password });
 */
import { Api } from "bknd/client";

const TOKEN_KEY = "bknd_token";

export const api = new Api({
  host: process.env.NEXT_PUBLIC_APP_URL ?? "",
  storage: {
    getItem: (key: string) => {
      if (typeof document === "undefined") return null;
      const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${key}=`));
      return match ? match.split("=")[1] : null;
    },
    setItem: (key: string, value: string) => {
      if (typeof document === "undefined") return;
      document.cookie = `${key}=${value}; path=/; max-age=3600; SameSite=Lax`;
    },
    removeItem: (key: string) => {
      if (typeof document === "undefined") return;
      document.cookie = `${key}=; path=/; max-age=0`;
    },
  },
});

/**
 * 이메일 + 비밀번호로 로그인
 */
export async function loginWithPassword(email: string, password: string) {
  const result = await api.auth.login("password", { email, password });

  if (!result.ok) {
    const body = result.body as { message?: string };
    throw new Error(body?.message ?? "로그인에 실패했습니다");
  }

  if (result.token) {
    setCookieToken(result.token);
  }

  return result.data;
}

/**
 * 이메일 + 비밀번호로 회원가입
 */
export async function registerWithPassword(email: string, password: string) {
  const result = await api.auth.register("password", { email, password });

  if (!result.ok) {
    const body = result.body as { message?: string };
    throw new Error(body?.message ?? "회원가입에 실패했습니다");
  }

  if (result.token) {
    setCookieToken(result.token);
  }

  return result.data;
}

/**
 * 로그아웃 (쿠키 제거)
 */
export function logout() {
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  }
}

function setCookieToken(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=3600; SameSite=Lax`;
  }
}

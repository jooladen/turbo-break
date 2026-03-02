/**
 * 서버 사이드 인증 헬퍼
 * Server Components 및 Server Actions에서 사용
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clientEnv } from "@/lib/env";

const TOKEN_KEY = "bknd_token";
const BASE_URL = clientEnv.NEXT_PUBLIC_APP_URL;

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  created_at: string;
};

/**
 * 현재 세션의 액세스 토큰을 쿠키에서 가져옴
 */
export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_KEY)?.value ?? null;
}

/**
 * 현재 로그인한 사용자 정보를 서버에서 조회
 * 토큰이 없거나 만료된 경우 null 반환
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { user: AuthUser | null };
    return json.user;
  } catch {
    return null;
  }
}

/**
 * 인증이 필요한 페이지에서 사용
 * 로그인되지 않은 경우 /login으로 리다이렉트
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * 이미 로그인된 상태에서 접근 불가 페이지 (login, signup)
 * 로그인된 경우 /dashboard로 리다이렉트
 */
export async function requireGuest(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }
}

import { NextRequest, NextResponse } from "next/server";

const TOKEN_KEY = "bknd_token";

// 보호된 경로 (로그인 필요)
const PROTECTED_ROUTES = ["/dashboard"];

// 인증된 사용자가 접근 불가한 경로 (로그인/회원가입)
const AUTH_ROUTES = ["/login", "/signup"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // 보호된 경로 접근 시 토큰 없으면 로그인 페이지로
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 이미 로그인된 상태로 인증 페이지 접근 시 대시보드로
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

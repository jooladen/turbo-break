import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "로그인 | turbo-break",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인</h1>
          <p className="text-gray-500 text-sm mb-8">
            계정에 로그인하여 계속하세요
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-gray-500">
            계정이 없으신가요?{" "}
            <a href="/signup" className="text-blue-600 hover:underline font-medium">
              회원가입
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import SignupForm from "./SignupForm";

export const metadata = {
  title: "회원가입 | turbo-break",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">회원가입</h1>
          <p className="text-gray-500 text-sm mb-8">
            새 계정을 만들어 시작하세요
          </p>
          <Suspense>
            <SignupForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              로그인
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

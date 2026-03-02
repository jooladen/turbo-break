import { requireAuth } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const metadata = {
  title: "대시보드 | turbo-break",
};

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">turbo-break</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            안녕하세요!
          </h2>
          <p className="text-gray-500">
            {user.email}님, 로그인 되었습니다.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <div className="text-blue-600 font-semibold text-sm mb-1">사용자 ID</div>
              <div className="text-gray-900 font-mono text-sm">{user.id}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-5 border border-green-100">
              <div className="text-green-600 font-semibold text-sm mb-1">역할</div>
              <div className="text-gray-900 text-sm">{user.role}</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
              <div className="text-purple-600 font-semibold text-sm mb-1">가입일</div>
              <div className="text-gray-900 text-sm">
                {new Date(user.created_at).toLocaleDateString("ko-KR")}
              </div>
            </div>
          </div>

          <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-600">
              🚀 다음 단계:{" "}
              <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                /plan-plus {"{기능명}"}
              </code>
              으로 원하는 기능을 설계하세요
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

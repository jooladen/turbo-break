// import { requireAuth } from "@/lib/auth";
// import LogoutButton from "./LogoutButton";

export const metadata = {
  title: "대시보드 | turbo-break",
};

export default async function DashboardPage() {
  // const user = await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            turbo-break
          </a>
          {/* <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user.email}</span>
            <LogoutButton />
          </div> */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            대시보드
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            turbo-break 고가 돌파 주식 스크리너에 오신 것을 환영합니다.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/screener"
              className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-5 border border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
            >
              <div className="text-blue-600 dark:text-blue-400 font-semibold text-sm mb-1">스크리너</div>
              <div className="text-gray-700 dark:text-gray-300 text-sm">고가 돌파 종목 필터링</div>
            </a>
            <a
              href="/intraday"
              className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-5 border border-purple-100 dark:border-purple-900 hover:border-purple-300 dark:hover:border-purple-700 transition-colors group"
            >
              <div className="text-purple-600 dark:text-purple-400 font-semibold text-sm mb-1">인트라데이</div>
              <div className="text-gray-700 dark:text-gray-300 text-sm">ORB + VWAP 분봉 분석</div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

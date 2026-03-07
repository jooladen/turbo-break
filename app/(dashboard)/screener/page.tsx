import { createAdapter, fetchAllStocks } from "@/lib/market-data";
import { evaluateAllStocks } from "@/lib/screener";
import ThemeToggle from "@/components/theme-toggle";
import ScreenerControls from "./ScreenerControls";
import ScreenerTable from "./ScreenerTable";

export const metadata = {
  title: "20일 고가 돌파 스크리너 | turbo-break",
};

// Yahoo Finance 실데이터 사용 시 매 요청마다 fresh fetch
export const dynamic = "force-dynamic";

type AdapterType = "yahoo" | "kiwoom" | "mock";

type Props = {
  searchParams: Promise<{ market?: string; date?: string; adapter?: string }>;
};

export default async function ScreenerPage({ searchParams }: Props) {
  const params = await searchParams;

  const rawMarket = params.market;
  const market =
    rawMarket === "KOSPI" || rawMarket === "KOSDAQ" || rawMarket === "ALL"
      ? rawMarket
      : "ALL";

  const dateParam = params.date;
  const date =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : new Date().toISOString().slice(0, 10);

  const rawAdapter = params.adapter;
  const adapterType: AdapterType =
    rawAdapter === "yahoo" || rawAdapter === "kiwoom" || rawAdapter === "mock"
      ? rawAdapter
      : ((process.env["MARKET_DATA_ADAPTER"] ?? "mock") as AdapterType);

  const adapter = createAdapter(adapterType);
  const stocks = await fetchAllStocks(adapter, market, 65);
  const results = evaluateAllStocks(stocks);

  // 차트 모달용 — ticker별 히스토리 전달 (서버에서 이미 조회된 데이터 재활용)
  const histories = Object.fromEntries(stocks.map((s) => [s.ticker, s.history]));

  const passed10 = results.filter((r) => r.passCount === 10).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* localStorage 설정 복원 — React 마운트 전 실행으로 깜빡임 방지 */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=new URLSearchParams(location.search);if(!p.has('market')&&!p.has('adapter')){var s=localStorage.getItem('screener-prefs');if(s){var v=JSON.parse(s),q=new URLSearchParams();if(v.market)q.set('market',v.market);if(v.adapter)q.set('adapter',v.adapter);location.replace('/screener?'+q.toString())}}}catch(e){}})()` }} />
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
              <a
                href="/dashboard"
                className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                대시보드
              </a>
              <span>/</span>
              <span className="text-gray-600 dark:text-gray-300">스크리너</span>
            </div>
            <ThemeToggle />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            20일 고가 돌파 스크리너
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            박스권 횡보 후 수급을 동반한 안전한 돌파 종목 필터링
          </p>
        </div>

        {/* 조회 컨트롤 */}
        <ScreenerControls market={market} date={date} adapterType={adapterType} />

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              기준일
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{date}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              스캔 종목
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {stocks.length}
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">종목</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
              완전 통과 (10/10)
            </div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {passed10}
              <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-1">종목</span>
            </div>
          </div>
        </div>

        {/* 결과 테이블 */}
        <ScreenerTable
          results={results}
          date={date}
          totalScanned={stocks.length}
          histories={histories}
        />
      </div>
    </div>
  );
}

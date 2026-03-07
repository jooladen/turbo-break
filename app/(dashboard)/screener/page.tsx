import { createAdapter, fetchAllStocks } from "@/lib/market-data";
import type { StockOHLCV } from "@/lib/screener-types";
import { toLocalDateStr } from "@/lib/date-utils";
import { evaluateAllStocks } from "@/lib/screener";
import ThemeToggle from "@/components/theme-toggle";
import ScreenerControls from "./ScreenerControls";
import ScreenerTable from "./ScreenerTable";

export const metadata = {
  title: "고가 돌파 스크리너 | turbo-break",
};

// Yahoo Finance 실데이터 사용 시 매 요청마다 fresh fetch
export const dynamic = "force-dynamic";

type AdapterType = "yahoo" | "kiwoom" | "mock";

type Props = {
  searchParams: Promise<{ market?: string; date?: string; adapter?: string; period?: string }>;
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
      : toLocalDateStr(new Date());

  const rawAdapter = params.adapter;
  const adapterType: AdapterType =
    rawAdapter === "yahoo" || rawAdapter === "kiwoom" || rawAdapter === "mock"
      ? rawAdapter
      : ((process.env["MARKET_DATA_ADAPTER"] ?? "mock") as AdapterType);

  const period = Number(params.period) === 20 ? 20 : 5;

  const adapter = createAdapter(adapterType);
  const stocks = await fetchAllStocks(adapter, market, 65, date);
  const results = evaluateAllStocks(stocks, period);

  // 차트 모달용 — 과거 조회 시 기준일 이후 5봉(미래)까지 포함
  const today = toLocalDateStr(new Date());
  const isPastDate = date < today;
  let histories: Record<string, StockOHLCV[]>;

  if (isPastDate) {
    // 오늘까지 데이터를 별도 조회하여 기준일 이후 봉 추가
    const futureStocks = await fetchAllStocks(adapter, market, 65, today);
    const futureMap = Object.fromEntries(futureStocks.map((s) => [s.ticker, s.history]));
    histories = Object.fromEntries(
      stocks.map((s) => {
        const futureHistory = futureMap[s.ticker];
        if (!futureHistory) return [s.ticker, s.history];
        // futureHistory는 최신→과거 순. 기준일 이후(date 초과) 봉만 추출
        const futureBars = futureHistory.filter((d) => d.date > date).slice(-5);
        return [s.ticker, [...futureBars, ...s.history]];
      }),
    );
  } else {
    histories = Object.fromEntries(stocks.map((s) => [s.ticker, s.history]));
  }

  const passed10 = results.filter((r) => r.passCount === 10).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* localStorage 설정 복원 — React 마운트 전 실행으로 깜빡임 방지 */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=new URLSearchParams(location.search);if(!p.has('market')&&!p.has('adapter')){var s=localStorage.getItem('screener-prefs');if(s){var v=JSON.parse(s),q=new URLSearchParams();if(v.market)q.set('market',v.market);if(v.adapter)q.set('adapter',v.adapter);if(v.period)q.set('period',v.period);location.replace('/screener?'+q.toString())}}}catch(e){}})()` }} />
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
            {period}일 고가 돌파 스크리너
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            박스권 횡보 후 수급을 동반한 안전한 돌파 종목 필터링
          </p>
        </div>

        {/* 조회 컨트롤 */}
        <ScreenerControls market={market} date={date} adapterType={adapterType} currentPeriod={String(period)} />

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
          period={period}
        />
      </div>
    </div>
  );
}

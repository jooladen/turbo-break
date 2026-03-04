export const dynamic = "force-dynamic";

import { generateIntradayMock, getMockStockName } from "@/lib/adapters/intraday-mock-adapter";
import IntradayView from "./IntradayView";

type SearchParams = Promise<{ ticker?: string; period?: string }>;

export default async function IntradayPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const ticker = params.ticker ?? "005930";
  const orbPeriod = Number(params.period ?? "5");

  const bars = generateIntradayMock(ticker);
  const name = getMockStockName(ticker);

  return <IntradayView ticker={ticker} name={name} bars={bars} orbPeriod={orbPeriod} />;
}

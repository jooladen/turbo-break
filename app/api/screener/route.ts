import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdapter, fetchAllStocks } from "@/lib/market-data";
import { toLocalDateStr } from "@/lib/date-utils";
import { runScreener } from "@/lib/screener";
import type { ScreenerApiResponse } from "@/lib/screener-types";

const querySchema = z.object({
  market: z.enum(["KOSPI", "KOSDAQ", "ALL"]).default("ALL"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adapter: z.enum(["yahoo", "kiwoom", "mock"]).optional(),
  period: z.coerce.number().refine((v) => v === 5 || v === 20).default(5),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    market: searchParams.get("market") ?? undefined,
    date: searchParams.get("date") ?? undefined,
    adapter: searchParams.get("adapter") ?? undefined,
    period: searchParams.get("period") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "잘못된 쿼리 파라미터", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { market, date, adapter: adapterParam, period } = parsed.data;
  const targetDate = date ?? toLocalDateStr(new Date());

  try {
    const adapter = createAdapter(adapterParam);
    const stocks = await fetchAllStocks(adapter, market, 65);
    const passed = runScreener(stocks, period);

    const response: ScreenerApiResponse = {
      date: targetDate,
      market,
      totalScanned: stocks.length,
      passed,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: "스크리너 실행 실패", message },
      { status: 500 },
    );
  }
}

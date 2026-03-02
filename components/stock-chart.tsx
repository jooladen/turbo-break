import type { StockOHLCV } from "@/lib/screener-types";

type Props = {
  data: StockOHLCV[];
};

function fmtPrice(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `${Math.round(p / 1_000)}K`;
  return String(Math.round(p));
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

export default function StockChart({ data }: Props) {
  // 최신→과거 순인 history를 차트용으로 과거→최신 순으로 뒤집기
  const candles = [...data].slice(0, 60).reverse();
  if (candles.length === 0) return null;

  const W = 640;
  const H = 320;
  const ML = 58; // left margin (y-axis)
  const MR = 10;
  const MT = 12;
  const MB = 22;
  const VOL_H = 52;
  const GAP = 5;
  const PRICE_H = H - VOL_H - MT - MB - GAP;
  const IW = W - ML - MR;

  const priceMin = Math.min(...candles.map((d) => d.low)) * 0.998;
  const priceMax = Math.max(...candles.map((d) => d.high)) * 1.002;
  const priceRange = priceMax - priceMin || 1;
  const volMax = Math.max(...candles.map((d) => d.volume)) || 1;

  const n = candles.length;
  const step = IW / n;
  const cw = Math.max(1, step * 0.65);

  const cx = (i: number) => ML + (i + 0.5) * step;
  const py = (p: number) =>
    MT + PRICE_H - ((p - priceMin) / priceRange) * PRICE_H;

  const priceBottom = MT + PRICE_H;
  const volTop = priceBottom + GAP;
  const volBottom = volTop + VOL_H;

  // Y축 눈금 (5개)
  const priceTicks = Array.from(
    { length: 5 },
    (_, i) => priceMin + (priceRange * i) / 4,
  );
  // X축 날짜 라벨 간격
  const labelEvery = Math.max(1, Math.floor(n / 7));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ fontFamily: "monospace" }}
    >
      {/* 배경 가이드라인 */}
      {priceTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={ML}
            y1={py(t)}
            x2={ML + IW}
            y2={py(t)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
          <text
            x={ML - 4}
            y={py(t) + 3.5}
            textAnchor="end"
            fontSize={9}
            fill="#9ca3af"
          >
            {fmtPrice(t)}
          </text>
        </g>
      ))}

      {/* 캔들스틱 + 거래량 바 */}
      {candles.map((d, i) => {
        const x = cx(i);
        const isUp = d.close >= d.open;
        const color = isUp ? "#22c55e" : "#ef4444";
        const lightColor = isUp ? "#86efac40" : "#fca5a540";

        const bodyTop = py(Math.max(d.open, d.close));
        const bodyBot = py(Math.min(d.open, d.close));
        const bodyH = Math.max(1, bodyBot - bodyTop);
        const barH = Math.max(1, (d.volume / volMax) * VOL_H);
        const showLabel = i % labelEvery === 0;

        return (
          <g key={d.date}>
            {/* 위아래 꼬리 */}
            <line
              x1={x}
              y1={py(d.high)}
              x2={x}
              y2={py(d.low)}
              stroke={color}
              strokeWidth={1}
            />
            {/* 캔들 몸통 */}
            <rect
              x={x - cw / 2}
              y={bodyTop}
              width={cw}
              height={bodyH}
              fill={color}
            />
            {/* 거래량 바 */}
            <rect
              x={x - cw / 2}
              y={volBottom - barH}
              width={cw}
              height={barH}
              fill={lightColor}
              stroke={color}
              strokeWidth={0.5}
            />
            {/* 날짜 라벨 */}
            {showLabel && (
              <text
                x={x}
                y={H - 5}
                textAnchor="middle"
                fontSize={8.5}
                fill="#9ca3af"
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}

      {/* 최신 종가 강조 */}
      {candles.length > 0 && (() => {
        const last = candles[candles.length - 1];
        const y = py(last.close);
        return (
          <>
            <line
              x1={ML}
              y1={y}
              x2={ML + IW}
              y2={y}
              stroke="#3b82f6"
              strokeWidth={0.8}
              strokeDasharray="4,4"
            />
            <rect x={ML + IW} y={y - 7} width={MR + 8} height={14} fill="#3b82f6" rx={2} />
            <text x={ML + IW + 4} y={y + 3.5} fontSize={8} fill="white">
              {fmtPrice(last.close)}
            </text>
          </>
        );
      })()}

      {/* 거래량 구분선 */}
      <line
        x1={ML}
        y1={volTop}
        x2={ML + IW}
        y2={volTop}
        stroke="#e5e7eb"
        strokeWidth={1}
      />

      {/* 거래량 라벨 */}
      <text x={ML - 4} y={volTop + 10} textAnchor="end" fontSize={8} fill="#9ca3af">
        {fmtVol(volMax)}
      </text>

      {/* 테두리 */}
      <rect
        x={ML}
        y={MT}
        width={IW}
        height={PRICE_H}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    </svg>
  );
}

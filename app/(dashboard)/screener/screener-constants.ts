import type { ScreenerResult, BuyGrade } from "@/lib/screener-types";

// 중요도 순 정렬
export const CONDITION_KEYS: Array<keyof ScreenerResult["conditions"]> = [
  "breakout",
  "sideways",
  "volumeSurge",
  "aboveMA60",
  "turnoverMin",
  "notOverbought5d",
  "noGap",
  "notOverheated",
  "bullish",
  "tailFilter",
];

export function getConditionLabels(period: number): Record<keyof ScreenerResult["conditions"], string> {
  return {
    breakout: `${period}일 돌파`,
    sideways: "횡보",
    volumeSurge: "거래량↑",
    tailFilter: "윗꼬리",
    turnoverMin: "거래대금",
    aboveMA60: "MA60↑",
    notOverheated: "과열X",
    bullish: "양봉",
    noGap: "갭X",
    notOverbought5d: "5일급등X",
  };
}

export type ConditionMeta = {
  label: string;
  score: number;
  easy: string;
  detail: string;
};

export function getConditionMeta(period: number, volMultiplier = 2, swRange = 15): Record<keyof ScreenerResult["conditions"], ConditionMeta> {
  const periodLabel = period <= 1 ? "하루" : period <= 2 ? "이틀" : period <= 5 ? `${period}일` : "한 달";
  return {
  breakout: {
    label: `${period}일 돌파`,
    score: 10,
    easy: `주가가 지난 ${period}일 중 가장 높은 가격을 넘어섰어요! 마치 오랫동안 막혀있던 댐이 드디어 터지는 순간이에요 🚀`,
    detail:
      `${period}일 저항선 돌파는 이 전략의 핵심 진입 시그널입니다. 박스권 상단 돌파 시 매집된 물량이 소화되며 강한 상승 에너지가 분출됩니다. 기관·외국인 매수세가 본격 유입되는 신호로, 추세 전환의 시작점입니다. 역사적으로 가장 높은 수익률을 기록한 진입 패턴 중 하나입니다.`,
  },
  sideways: {
    label: "횡보",
    score: 9,
    easy: `주가가 ${periodLabel} 동안 조용히 비슷한 가격 범위에서 움직였어요. 스프링이 꾹 눌려 있다가 튀어오르기 직전 같은 상태예요 🌀`,
    detail:
      `돌파 전 충분한 에너지가 응축됐다는 증거입니다. ${period}일간 주가 변동폭이 ±${swRange}% 이내로 유지됐다는 것은 매도 물량이 소화되고 저점 매수자들이 물량을 쌓아왔다는 신호입니다. 횡보 기간이 길수록 돌파 후 상승 폭도 커지는 경향이 있습니다. 갑자기 급등한 종목보다 훨씬 안전한 진입 패턴입니다.`,
  },
  volumeSurge: {
    label: "거래량↑",
    score: 9,
    easy: `오늘 거래량이 평소보다 ${volMultiplier}배 이상 많아요! 많은 사람들이 동시에 '이 주식 사야겠다!'고 판단한 거예요 📊`,
    detail:
      `거래량은 돌파의 신뢰성을 검증하는 핵심 필터입니다. 거래량이 ${period}일 평균의 ${volMultiplier}배 이상이면 개인·기관·외국인 모두가 적극 매수에 참여했다는 증거입니다. 거래량 없는 돌파는 '가짜 돌파(False Breakout)'일 가능성이 높아 곧 되돌림이 발생합니다. 수급이 동반된 돌파만이 지속적인 상승으로 이어집니다.`,
  },
  aboveMA60: {
    label: "MA60↑",
    score: 8,
    easy: "주가가 최근 3개월 평균 가격보다 위에 있어요. 비유하자면 성적이 꾸준히 평균 이상을 유지하는 우등생 같은 주식이에요 📈",
    detail:
      "60일 이동평균선은 약 3개월 추세를 나타내며, 중장기 상승 추세 확인에 사용합니다. 이 선 위에 있다는 것은 중기적으로 매수세가 매도세를 압도하고 있다는 의미입니다. MA60 아래에서의 돌파는 하락 추세 중 단순 반등일 가능성이 높습니다. 반드시 MA60 위에서 이뤄지는 돌파만 유효한 신호로 판단합니다.",
  },
  turnoverMin: {
    label: "거래대금",
    score: 8,
    easy: "하루에 500억 원 이상 거래됐어요. 거래가 활발해야 내가 사고 싶을 때 사고, 팔고 싶을 때 팔 수 있어요 💰",
    detail:
      "거래대금 500억 미만 종목은 유동성 부족으로 매수 시 가격이 크게 튀거나 매도 시 원하는 가격에 팔지 못하는 슬리피지가 발생합니다. 기관투자자들이 관심을 갖기 위한 최소 기준이기도 합니다. 거래대금이 낮은 종목은 소수 세력의 시세 조종 위험도 있어 필터링합니다. 실제 매매 가능성을 보장하는 유동성 기준입니다.",
  },
  notOverbought5d: {
    label: "5일급등X",
    score: 7,
    easy: "최근 5일 동안 이미 많이 오르지 않았는지 확인해요. 이미 많이 오른 주식을 뒤늦게 사면 꼭대기에서 사는 꼴이 될 수 있거든요 ⚠️",
    detail:
      "최근 5일간 15% 이상 급등한 종목은 단기 차익실현 매물이 대기 중입니다. 뒤늦게 진입하면 고점 매수가 될 확률이 높습니다. 진정한 돌파 종목은 조용히 횡보하다가 특정 시점에 처음으로 강하게 오르는 것이 이상적입니다. 추격매수의 덫을 피하는 안전장치입니다.",
  },
  noGap: {
    label: "갭X",
    score: 7,
    easy: "아침에 주식시장이 열릴 때 전날 종가와 크게 다르지 않게 시작했어요. 갑자기 훌쩍 높은 가격에서 시작하면 위험할 수 있어요 🕳️",
    detail:
      "시가가 전일 종가보다 3% 이상 높게 시작하면 이미 많은 사람이 매수해있는 상태입니다. 갭 상승은 기대감이 선반영된 것으로 추가 상승 여력이 줄어들고 되돌림 위험이 높습니다. 갭 없이 자연스럽게 상승하는 종목이 안정적인 진입 기회를 제공합니다. 시초가 리스크를 제거하는 필터입니다.",
  },
  notOverheated: {
    label: "과열X",
    score: 6,
    easy: "오늘 하루에만 너무 많이 오르지 않았는지 확인해요. 하루에 8% 넘게 오르면 흥분한 사람들이 무작정 산 것일 수 있어요 🌡️",
    detail:
      "당일 상승률이 8% 이상이면 단기 투기 세력이 몰린 과열 상태입니다. 이런 종목은 다음 날 차익실현 매물로 급락하는 경우가 많습니다. 건강한 돌파는 5~7% 수준에서 안정적으로 마감하는 것이 이상적입니다. 단기 과열에 의한 고점 진입을 방지합니다.",
  },
  bullish: {
    label: "양봉",
    score: 6,
    easy: "오늘 주가가 아침 시작 가격보다 높게 마감했어요. 하루 종일 사려는 사람이 팔려는 사람보다 많았다는 뜻이에요 ✅",
    detail:
      "양봉은 시가보다 종가가 높은 것으로, 당일 매수세가 매도세를 압도했음을 나타냅니다. 장중 내내 매수세가 살아있었다는 직접적인 증거입니다. 음봉 돌파는 장중 한때만 신고가를 찍고 매도 압력에 밀린 것으로 신뢰도가 낮습니다. 당일 매수 우위를 확인하는 기본 필터입니다.",
  },
  tailFilter: {
    label: "윗꼬리",
    score: 5,
    easy: "장 마감 가격이 오늘 최고 가격과 거의 같아요. 끝까지 팔려는 사람 없이 강하게 마감했다는 신호예요 🎯",
    detail:
      "종가가 당일 고가의 99% 이상이면 장 마감까지 매도 압력이 없었다는 뜻입니다. 윗꼬리가 긴 종목은 고점에서 차익실현 매물이 쏟아진 것으로 다음 날 하락 전환 가능성을 시사합니다. 특히 거래량이 많은 날의 긴 윗꼬리는 강한 매도 신호로 해석됩니다. 고점에서의 매도 압력 부재를 확인합니다.",
  },
  };
}

export const GRADE_CONFIG: Record<
  BuyGrade,
  {
    emoji: string; bigEmoji: string; label: string;
    verdict: string; verdictSub: string;
    bg: string; ring: string; bar: string; verdictBg: string;
  }
> = {
  A: {
    emoji: "🔥", bigEmoji: "🚀",
    label: "강력 추천",
    verdict: "지금 살 수 있어요!",
    verdictSub: "조건을 거의 다 통과한 아주 좋은 종목이에요. 마치 시험에서 100점 맞은 것처럼요! 😄",
    bg: "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/20",
    ring: "ring-red-400 dark:ring-red-500",
    bar: "bg-gradient-to-r from-red-400 to-orange-400",
    verdictBg: "bg-red-500",
  },
  B: {
    emoji: "👍", bigEmoji: "😊",
    label: "괜찮아요",
    verdict: "살 만한 종목이에요",
    verdictSub: "대부분의 조건을 통과했어요. 시험으로 치면 80점대 우등생! 조심만 하면 괜찮아요 👌",
    bg: "bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/20",
    ring: "ring-orange-400 dark:ring-orange-500",
    bar: "bg-gradient-to-r from-orange-400 to-yellow-400",
    verdictBg: "bg-orange-400",
  },
  C: {
    emoji: "🤔", bigEmoji: "⏳",
    label: "좀 더 기다려요",
    verdict: "아직은 애매해요",
    verdictSub: "몇 가지 조건이 부족해요. 서두르지 말고 조금 더 지켜보는 게 좋겠어요 🙏",
    bg: "bg-gradient-to-br from-yellow-50 to-gray-50 dark:from-yellow-900/20 dark:to-gray-800/30",
    ring: "ring-yellow-300 dark:ring-yellow-700",
    bar: "bg-gradient-to-r from-yellow-400 to-gray-400",
    verdictBg: "bg-yellow-500",
  },
  F: {
    emoji: "🚫", bigEmoji: "😬",
    label: "사지 마세요",
    verdict: "지금은 위험해요",
    verdictSub: "여러 조건이 빠져 있어요. 지금 샀다가는 손해볼 가능성이 높아요. 패스! ✋",
    bg: "bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800/50 dark:to-slate-800/30",
    ring: "ring-gray-300 dark:ring-gray-600",
    bar: "bg-gray-300 dark:bg-gray-600",
    verdictBg: "bg-gray-500",
  },
};

export type ExpertDef = {
  key: keyof ScreenerResult["conditions"];
  name: string;
  category: "추세" | "수급" | "모멘텀" | "리스크";
  catColor: string;
  target: string;
  getCurrent: (r: ScreenerResult) => string;
  getBarPct: (r: ScreenerResult) => number;
  what: string;
  why: string;
  good: string;
  bad: string;
  proTip: string;
};

export function getExpertDefs(period: number, volMultiplier = 2, swRange = 15): ExpertDef[] {
  const periodDesc = period <= 1 ? "약 1일" : period <= 5 ? `약 ${period}일` : "약 1달";
  return [
  {
    key: "breakout",
    name: `${period}일 고가 돌파`,
    category: "추세",
    catColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    target: `돌파율 > 0% (종가 > 최근 ${period}일 최고가)`,
    getCurrent: (r) =>
      r.metrics.breakoutPct >= 0
        ? `+${r.metrics.breakoutPct.toFixed(2)}% 돌파 ✅`
        : `${r.metrics.breakoutPct.toFixed(2)}% 미달 ❌`,
    getBarPct: (r) => Math.min(100, Math.max(0, 50 + r.metrics.breakoutPct * 10)),
    what: `최근 ${period}거래일(${periodDesc}) 동안 형성된 가격 저항선을 오늘 종가가 돌파했는지 확인합니다. 종가 기준으로 판단하며, 장중 일시 돌파는 인정하지 않습니다.`,
    why: "윌리엄 오닐의 CAN SLIM 전략에서 핵심 매수 시그널입니다. 가격이 저항선을 돌파할 때는 그동안 해당 가격에서 팔려던 매도세가 완전히 소화된 상태를 의미합니다. 이후 오버헤드 공급(overhead supply)이 없어져 상승이 가속됩니다.",
    good: "돌파율이 1~5%면 이상적. 너무 작으면(0%대) 힘이 약하고, 너무 크면(8%+) 갭 상승과 겹칠 수 있습니다.",
    bad: "음수면 아직 저항선 아래 — 미돌파 상태. 가짜 돌파(false breakout) 방지를 위해 다음 날도 저항선 위에서 마감하는지 확인 권장.",
    proTip: `돌파 당일 거래량이 ${period}일 평균의 ${volMultiplier}배 이상이어야 신뢰도 상승. 거래량 없는 돌파의 60% 이상은 되돌림 발생.`,
  },
  {
    key: "sideways",
    name: "박스권 횡보 (VCP)",
    category: "추세",
    catColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    target: `${period}일 변동폭 ≤ ${swRange}% (고가-저가)/저가`,
    getCurrent: (r) =>
      `변동폭 ${r.metrics.sidewaysRange.toFixed(1)}% (기준: ≤ ${swRange}%) ${r.conditions.sideways ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - (r.metrics.sidewaysRange / swRange) * 100)),
    what: `최근 ${period}일 동안 최고가와 최저가의 차이가 저가 대비 ${swRange}% 이내인지 확인합니다. 이를 VCP(Volatility Contraction Pattern) 또는 박스권 패턴이라 합니다.`,
    why: "마크 미너비니가 체계화한 VCP는 돌파 전 변동성이 수축되는 구간입니다. 이 기간 동안 약한 손(weak hands)의 물량이 소화되고, 강한 손(strong hands)이 매집합니다. 수축이 길수록 돌파 후 상승 에너지도 커집니다.",
    good: `5~${Math.min(swRange, 15)}% 범위가 이상적. 범위가 좁을수록 에너지가 더 응축된 상태.`,
    bad: `${swRange}% 초과 = 변동성 과다, 방향성 없음. ${swRange + 5}% 이상이면 하락 추세 중 반등일 가능성 높음.`,
    proTip: "횡보 기간 중 거래량이 점차 줄어드는 패턴(Volume Dry-up)이 함께 나타나면 더욱 강력한 신호입니다.",
  },
  {
    key: "volumeSurge",
    name: "거래량 폭증",
    category: "수급",
    catColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    target: `당일 거래량 ≥ ${period}일 평균 × ${volMultiplier}배`,
    getCurrent: (r) =>
      `${period}일 평균 대비 ${r.metrics.volumeMultiple.toFixed(1)}배 ${r.conditions.volumeSurge ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, (r.metrics.volumeMultiple / 5) * 100),
    what: `당일 거래량이 ${period}일 평균 거래량의 ${volMultiplier}배 이상인지 확인합니다. 거래량은 매수·매도 모두 포함한 총 체결량입니다.`,
    why: "거래량은 주가의 연료입니다. 기관·외국인·세력의 대량 매수는 반드시 거래량 증가를 수반합니다. 이를 'Accumulation Day'라 하며, 스탠 와인스타인의 Stage Analysis에서도 Stage 2 상승 구간의 필수 요건입니다.",
    good: `${volMultiplier}배는 최소 기준. ${volMultiplier * 1.5}배 이상이면 강한 매수 집중. 5배 이상이면 비정상적 수급 유입 — 대형 이벤트 또는 기관 매집 가능성.`,
    bad: `${volMultiplier}배 미만 돌파는 'False Breakout' 확률 60% 이상. 다음 1~3거래일 내 되돌림 확인 필요.`,
    proTip: "돌파 이후 2~3일 동안 거래량이 평균 이상을 유지하면 'Follow-Through Day' 개념에 부합 — 추세 지속 신뢰도 상승.",
  },
  {
    key: "tailFilter",
    name: "윗꼬리 필터",
    category: "수급",
    catColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    target: "종가 ≥ 당일 고가 × 99% (윗꼬리 최소화)",
    getCurrent: (r) =>
      `종가/고가 = ${r.metrics.tailRatio.toFixed(1)}% (기준: ≥ 99%) ${r.conditions.tailFilter ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, (r.metrics.tailRatio - 95) * 20)),
    what: "캔들차트에서 종가가 당일 고가의 99% 이상인지 확인합니다. 고가 대비 종가 비율이 낮을수록 '윗꼬리(upper shadow)'가 길어집니다.",
    why: "윗꼬리가 길면 장중 고점에서 대량 매도(차익실현)가 발생했다는 의미입니다. 특히 돌파 날에 긴 윗꼬리가 나타나면 저항선 근처에서 공급이 강하다는 경고 신호입니다. 'Shooting Star' 캔들 패턴이 이에 해당합니다.",
    good: "99~100%가 이상적 = 종가 ≈ 고가 = 'Closing Strong'. 강한 매수세가 장 마감까지 유지된 것.",
    bad: "95% 미만이면 위험 신호. 장중 5% 이상 되돌림 = 매도 압력 강함. 특히 거래량 많은 날의 긴 윗꼬리는 천장 신호.",
    proTip: "종가와 고가가 정확히 일치(100%)하면 최고의 신호. '마루보주(Marubozu)' 캔들이 이상적 형태입니다.",
  },
  {
    key: "turnoverMin",
    name: "거래대금 기준",
    category: "수급",
    catColor: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    target: "일 거래대금 ≥ 500억 원",
    getCurrent: (r) =>
      `${(r.turnover / 1e8).toFixed(0)}억 원 (기준: ≥ 500억) ${r.conditions.turnoverMin ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, (r.turnover / 5e10) * 100),
    what: "당일 총 거래대금(체결금액)이 500억 원 이상인지 확인합니다. 거래대금 = 거래량 × 가격으로, 실제 시장에서 움직인 금액입니다.",
    why: "기관투자자(펀드, 연기금 등)가 한 종목에서 의미 있는 포지션을 구축하려면 최소 수십억 원의 주문이 필요합니다. 거래대금 500억 미만 종목은 기관 참여가 어려워 지속적인 상승 동력이 부족합니다. 또한 슬리피지(slippage) 없이 매매할 수 있는 최소 유동성 기준이기도 합니다.",
    good: "500억~3000억: 적절한 유동성. 3000억 이상: 대형주 수준의 유동성. 기관 수급 유입 가능성 높음.",
    bad: "500억 미만: 소형주·테마주 특성. 세력에 의한 시세 조종 위험. 호가 스프레드가 넓어 매매 비용 증가.",
    proTip: "거래대금이 평소보다 5~10배 폭증하면 '빅 플레이어(Big Player)'의 진입 가능성. 이는 거래량 폭증과 함께 가장 강력한 수급 신호입니다.",
  },
  {
    key: "aboveMA60",
    name: "60일 이동평균선 위",
    category: "추세",
    catColor: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
    target: "종가 > MA60 (이격도 > 0%)",
    getCurrent: (r) =>
      `MA60 대비 ${r.metrics.ma60Distance >= 0 ? "+" : ""}${r.metrics.ma60Distance.toFixed(1)}% ${r.conditions.aboveMA60 ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 50 + r.metrics.ma60Distance * 5)),
    what: "현재 종가가 최근 60거래일 종가의 단순이동평균(SMA60)보다 높은지 확인합니다. MA60은 약 3개월간의 평균 매입 단가를 나타냅니다.",
    why: "스탠 와인스타인의 Stage Analysis에서 Stage 2(상승 구간)의 핵심 조건은 주가가 30주 이동평균선(=MA150) 위에 있는 것입니다. MA60은 그보다 단기적인 중기 추세 확인용입니다. MA60 아래에서의 돌파는 하락 추세 중 일시적 반등(Dead Cat Bounce)일 가능성이 높습니다.",
    good: "0~10%: 건강한 이격. 10~20%: 강한 상승 추세. 단, 20% 이상이면 이격 과다로 조정 가능성 있음.",
    bad: "음수 = MA60 하회 = 중기 하락 추세. 특히 MA60이 기울어져 내려가고 있으면 더욱 위험한 신호.",
    proTip: "MA60과 MA20이 모두 상향 기울기인 상태에서 주가가 두 선 위에 있을 때 돌파가 나오면 최상의 조건입니다. '골든 크로스' 이후 첫 번째 돌파에 주목하세요.",
  },
  {
    key: "notOverheated",
    name: "과열 방지 (당일 상승률)",
    category: "리스크",
    catColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    target: "당일 상승률 < 8% (전일 종가 대비)",
    getCurrent: (r) =>
      `당일 ${r.metrics.changeRate >= 0 ? "+" : ""}${r.metrics.changeRate.toFixed(2)}% (기준: < 8%) ${r.conditions.notOverheated ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - (r.metrics.changeRate / 8) * 100)),
    what: "당일 종가가 전일 종가 대비 8% 미만으로 상승했는지 확인합니다. 8% 이상 급등 종목을 필터링합니다.",
    why: "당일 8% 이상 급등은 단기 투기 세력(스캘퍼, 모멘텀 트레이더)의 과도한 참여를 의미합니다. 이들은 당일 or 익일 차익실현 매물을 대량으로 내놓습니다. 또한 8%+ 종목은 상한가(+30%) 근처에서 거래되는 경우가 많아 다음 날 갭 하락 위험이 있습니다.",
    good: "3~5%: 이상적인 돌파 등락률. 거래량이 충분하다면 5~7%도 허용 가능. 힘 있는 돌파이면서 과열은 아닌 구간.",
    bad: "8% 이상: 단기 과열. 익일 또는 그날 중 되돌림 가능성 높음. 15% 이상: 상한가 접근, 추격 절대 금지.",
    proTip: "돌파 당일 5~6% 상승 + 거래량 3배 이상의 조합이 가장 이상적인 패턴입니다. 이후 2~3% 조정 후 재상승을 매수 기회로 삼을 수 있습니다.",
  },
  {
    key: "bullish",
    name: "양봉 확인",
    category: "모멘텀",
    catColor: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
    target: "종가 > 시가 (당일 양봉 마감)",
    getCurrent: (r) =>
      r.conditions.bullish
        ? `양봉 마감 — 종가 > 시가 ✅`
        : `음봉 마감 — 종가 < 시가 ❌`,
    getBarPct: (r) => (r.conditions.bullish ? 100 : 10),
    what: "당일 시가(장 시작 가격)보다 종가(장 마감 가격)가 높은지 확인합니다. 이를 '양봉'이라 하며, 차트에서 붉은색(한국 기준) 캔들로 표시됩니다.",
    why: "양봉은 당일 매수세가 매도세를 압도했다는 직접적인 증거입니다. 돌파 당일 음봉이 나타나면 장중 고점에서 대량 매도가 있었다는 의미로, 돌파의 신뢰도가 크게 떨어집니다. 'Closing Price Reversal'이라고도 합니다.",
    good: "양봉의 실체(body)가 클수록 좋음. 시가 대비 종가 상승폭 5% 이상이면 강한 매수 의지 확인.",
    bad: "음봉 돌파는 장중 매도 압력이 강하다는 신호. 특히 거래량 많은 날의 음봉은 하락 반전 가능성 경고.",
    proTip: "시가에서 거의 변화 없이 종가에 급등하는 'Closing Strong' 패턴이 가장 강력합니다. 이는 장 마감 직전 기관의 대량 매수를 시사합니다.",
  },
  {
    key: "noGap",
    name: "갭 상승 제한",
    category: "리스크",
    catColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    target: "시가 ≤ 전일 종가 × 103% (갭 ≤ 3%)",
    getCurrent: (r) =>
      `갭 ${(r.metrics.gapRatio - 100) >= 0 ? "+" : ""}${(r.metrics.gapRatio - 100).toFixed(1)}% (기준: ≤ 3%) ${r.conditions.noGap ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - ((r.metrics.gapRatio - 100) / 3) * 100)),
    what: "당일 시가가 전일 종가 대비 3% 이상 높게 시작하지 않았는지 확인합니다. 시가/전일종가 × 100 - 100 = 갭 상승률.",
    why: "3% 이상 갭 상승은 전날 밤 또는 아침에 이미 대량 매수가 이루어진 상태입니다. 이 경우 기대감이 가격에 선반영되어 추가 상승 여력이 감소합니다. 또한 갭 상승 후 '갭 메우기(Gap Fill)' 현상으로 되돌림이 발생하는 경우가 많습니다.",
    good: "0~1%: 완벽. 1~2%: 양호. 2~3%: 허용 범위. 갭이 없을수록 추가 상승 여력이 큽니다.",
    bad: "3% 이상: 추격매수 위험 구간. 5% 이상: 과도한 선반영 — 익일 갭 하락 가능성. 특히 급락 후 단기 반등 시 갭 상승은 함정.",
    proTip: "3% 이상 갭 상승한 날 매수를 참고, 갭을 메우고 다시 올라오는 날(Pull-back after Gap)이 더 안전한 매수 타이밍입니다.",
  },
  {
    key: "notOverbought5d",
    name: "5일 누적 상승 제한",
    category: "리스크",
    catColor: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
    target: "직전 5거래일 누적 상승률 ≤ 15%",
    getCurrent: (r) =>
      `5일 누적 ${r.metrics.gain5d >= 0 ? "+" : ""}${r.metrics.gain5d.toFixed(1)}% (기준: ≤ 15%) ${r.conditions.notOverbought5d ? "✅" : "❌"}`,
    getBarPct: (r) => Math.min(100, Math.max(0, 100 - (r.metrics.gain5d / 15) * 100)),
    what: "직전 5거래일(약 1주일) 동안 누적 상승률이 15% 이하인지 확인합니다. 5일 전 종가 대비 어제 종가 기준으로 계산합니다.",
    why: "단기간 급등 후 진입은 가장 흔한 실수 중 하나입니다. 15% 이상 단기 급등 종목은 단기 차익실현 매물이 대기하고 있으며, 기술적 저항선(이동평균선 이격 과다)도 형성됩니다. '추격매수'라 불리며 손실 확률이 통계적으로 높습니다.",
    good: "0~7%: 건강한 상승. 7~12%: 약간 과열, 주의 필요. 12~15%: 경계 구간, 신중하게 접근.",
    bad: "15% 초과: 단기 과매수. RSI 70+ 구간과 유사. 평균 3~7거래일 내 조정 발생 가능성 높음.",
    proTip: "15% 이상 급등 후 3~5일 조정(가격 또는 시간 조정)을 거친 뒤 다시 상승 시도가 나타날 때가 더 안전한 매수 기회입니다. 이를 'Pullback Entry'라 합니다.",
  },
  ];
}

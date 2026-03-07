import type { ScreenerResult, SignalMetrics, BuyGrade } from "@/lib/screener-types";
import { CONDITION_KEYS, getConditionLabels } from "./screener-constants";

export function generateKeyPoint(m: SignalMetrics, _grade: BuyGrade, period: number): string {
  if (m.volumeMultiple >= 5) return `거래량 ${m.volumeMultiple.toFixed(1)}배 폭발 💥`;
  if (m.volumeMultiple >= 3) return `거래량 ${m.volumeMultiple.toFixed(1)}배로 큰손 유입 🔥`;
  if (m.sidewaysRange < 6) return `${m.sidewaysRange.toFixed(1)}% 초좁은 횡보 후 돌파 🎯`;
  if (m.breakoutPct > 3) return `${period}일 고가를 ${m.breakoutPct.toFixed(1)}% 강하게 돌파 🚀`;
  if (m.sidewaysRange < 10) return `${m.sidewaysRange.toFixed(1)}% 횡보 끝에 에너지 폭발 ⚡`;
  if (m.ma60Distance < 3) return `60일선 바로 위 황금 자리 ✨`;
  return `${m.volumeMultiple.toFixed(1)}배 거래량으로 상승 확인 📈`;
}

export function formatTurnover(turnover: number): string {
  if (turnover >= 1_000_000_000_000)
    return `${(turnover / 1_000_000_000_000).toFixed(1)}조`;
  if (turnover >= 100_000_000)
    return `${Math.floor(turnover / 100_000_000).toLocaleString()}억`;
  return `${Math.floor(turnover / 10_000).toLocaleString()}만`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toLocaleString();
}

export function downloadCsv(results: ScreenerResult[], date: string, period: number) {
  const labels = getConditionLabels(period);
  const headers = [
    "종목코드", "종목명", "시장", "종가", "등락률", "거래량", "거래대금",
    ...CONDITION_KEYS.map((k) => labels[k]),
    "통과조건수",
  ];
  const rows = results.map((r) => [
    r.ticker, r.name, r.market, r.close, r.changeRate.toFixed(2),
    r.volume, r.turnover,
    ...CONDITION_KEYS.map((k) => (r.conditions[k] ? "O" : "X")),
    r.passCount,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `screener_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getMetricTooltip(
  condKey: keyof ScreenerResult["conditions"],
  r: ScreenerResult,
  volMultiplier = 2,
  swRange = 15,
): string {
  const m = r.metrics;
  switch (condKey) {
    case "breakout":
      return `${m.breakoutPct >= 0 ? "+" : ""}${m.breakoutPct.toFixed(1)}% 돌파 / 기준: 0% 초과`;
    case "sideways":
      return `범위 ${m.sidewaysRange.toFixed(1)}% / 기준: ${swRange}% 이하`;
    case "volumeSurge":
      return `${m.volumeMultiple.toFixed(1)}배 / 기준: ${volMultiplier}배 이상`;
    case "aboveMA60":
      return `MA60 대비 ${m.ma60Distance >= 0 ? "+" : ""}${m.ma60Distance.toFixed(1)}% / 기준: 0% 초과`;
    case "turnoverMin":
      return `${(r.turnover / 1e8).toFixed(0)}억 / 기준: 500억`;
    case "notOverbought5d":
      return `5일 누적 ${m.gain5d >= 0 ? "+" : ""}${m.gain5d.toFixed(1)}% / 기준: 15% 이하`;
    case "notOverheated":
      return `당일 ${m.changeRate >= 0 ? "+" : ""}${m.changeRate.toFixed(1)}% / 기준: 8% 미만`;
    case "noGap":
      return `갭 ${(m.gapRatio - 100) >= 0 ? "+" : ""}${(m.gapRatio - 100).toFixed(1)}% / 기준: 3% 이하`;
    case "bullish":
      return r.conditions.bullish ? "종가 > 시가 (양봉)" : "종가 ≤ 시가 (음봉)";
    case "tailFilter":
      return `윗꼬리 비율 ${m.tailRatio.toFixed(1)}% / 기준: 99% 이상`;
  }
}

// raw 텍스트 → 조건 번호·이름 (CONDITION_KEYS 순서 기준)
function getConditionRawPatterns(period: number): Record<keyof ScreenerResult["conditions"], RegExp> {
  return {
    breakout: new RegExp(`${period}일 고가를|${period}일 돌파 미달`),
    sideways: /박스권 범위|횡보 범위/,
    volumeSurge: /거래량 평균 대비|거래량 부족/,
    aboveMA60: /MA60/,
    turnoverMin: /500억/,
    notOverbought5d: /5일 누적/,
    noGap: /갭 없이|갭 상승/,
    notOverheated: /당일 등락률|당일.*급등/,
    bullish: /양봉 마감|음봉 마감/,
    tailFilter: /윗꼬리 없이|윗꼬리 존재/,
  };
}

export function getConditionInfo(raw: string, period: number): { idx: number; name: string } {
  const patterns = getConditionRawPatterns(period);
  const labels = getConditionLabels(period);
  for (const [i, key] of CONDITION_KEYS.entries()) {
    if (patterns[key].test(raw)) {
      return { idx: i + 1, name: labels[key] };
    }
  }
  return { idx: 0, name: "" };
}

// ── 초딩용 긍정 설명 ──
export function toKidText(raw: string, period: number): { icon: string; title: string; story: string } {
  const periodLabel = period <= 1 ? "하루" : period <= 2 ? "이틀" : period <= 5 ? `${period}일` : "한 달";
  const map: Array<[RegExp, (m: RegExpMatchArray) => { icon: string; title: string; story: string }]> = [
    [
      new RegExp(`${period}일 고가를 ([\\d.]+)% 상향 돌파`),
      (m) => ({
        icon: "🚀",
        title: `${periodLabel} 동안 못 넘던 가격 벽을 오늘 드디어 뚫었어요! (+${m[1]}%)`,
        story: `비유하면 이래요: 우리 동네에 아주 유명한 떡볶이 가게가 있는데, 항상 줄이 너무 길어서 못 들어갔어요. 그런데 오늘 드디어 줄이 없어서 바로 들어갈 수 있게 된 거예요! 주식도 마찬가지예요. ${period}일 동안 "이 가격이면 팔겠다"는 사람들이 막고 있던 벽이 오늘 완전히 뚫렸어요. 이걸 전문용어로 "저항선 돌파"라고 해요. 이 앱에서 가장 중요한 신호예요 🏆`,
      }),
    ],
    [
      /거래량 평균 대비 ([\d.]+)배/,
      (m) => ({
        icon: "🎉",
        title: `오늘 평소보다 ${m[1]}배나 많은 사람들이 이 주식을 샀어요!`,
        story: `평소에 하루 10만 명이 사던 주식을 오늘은 ${Math.round(parseFloat(m[1]) * 10)}만 명이 샀다는 뜻이에요. 마치 평소엔 조용하던 유튜브 영상이 갑자기 알고리즘 추천을 타서 조회수가 터진 것 같은 상황이에요! 많은 사람이 동시에 "이거다!" 하고 달려들었다는 건 가짜 상승이 아닌 진짜 관심이라는 뜻이에요. 특히 기업 임원, 대형 투자자들도 포함됐을 가능성이 높아요 💥`,
      }),
    ],
    [
      new RegExp(`${period}일 박스권 범위 ([\\d.]+)%`),
      (m) => ({
        icon: "🌀",
        title: `${periodLabel} 동안 가격이 ${m[1]}% 범위 안에서 아주 조용히 움직였어요`,
        story: `스프링을 손으로 꾹꾹 누르고 있다고 상상해봐요. 누를수록 나중에 더 세게 튀어오르죠? 이 주식이 딱 그 상태였어요. ${periodLabel} 동안 가격이 별로 안 움직이면서 에너지를 조용히 쌓고 있었던 거예요. 오늘 그 스프링이 풀린 거예요! 오래 조용했던 종목일수록 돌파 후 더 크게 오르는 경우가 많아요 💪`,
      }),
    ],
    [
      /MA60 대비 ([\d.]+)% 위/,
      (m) => ({
        icon: "📈",
        title: `최근 3달 평균 가격보다 ${m[1]}% 위에 있어요 — 꾸준히 오르는 종목!`,
        story: `학교 중간고사 평균 점수가 70점인데 이 학생은 항상 ${m[1]}점 이상 더 받는 우등생 같은 거예요. 3달(60일) 동안 평균적으로 사고판 가격보다 지금 가격이 높다는 건, 이 주식을 3달 전에 산 사람들이 지금 이익을 보고 있다는 뜻이에요. 이익을 보는 사람이 많으면 주식이 더 올라가는 경향이 있어요 🌟`,
      }),
    ],
    [
      /거래대금 500억 이상/,
      () => ({
        icon: "💰",
        title: `오늘 하루에만 500억 원 이상 거래됐어요 — 언제든 팔 수 있어요!`,
        story: `500억 원이 얼마나 큰 돈이냐면, 1만 원짜리 지폐 500만 장을 쌓으면 약 50미터 높이가 돼요! 그만큼 많은 돈이 오늘 하루 이 주식에서 왔다갔다 했어요. 이게 왜 좋냐면, 내가 팔고 싶을 때 바로 팔 수 있거든요. 거래가 적으면 사줄 사람이 없어서 팔리지 않는 경우가 생겨요. 마치 시장에서 인기 많은 물건은 쉽게 팔리지만, 아무도 안 사는 물건은 못 파는 것처럼요 🏪`,
      }),
    ],
    [
      /5일 누적 ([\d.]+)% 상승/,
      (m) => ({
        icon: "✅",
        title: `최근 5일 동안 ${m[1]}%밖에 안 올랐어요 — 아직 기회가 있어요!`,
        story: `주식을 살 때 가장 위험한 건 이미 너무 많이 오른 걸 사는 거예요. 마치 인기 아이돌 콘서트 암표를 정가의 10배에 사는 것처럼요. 이 주식은 최근 5일 동안 ${m[1]}%밖에 안 올랐어요. 아직 많이 안 올랐으니까 지금 사도 늦지 않았다는 신호예요. 버스가 막 출발하려는 순간에 탄 것처럼요! 🚌`,
      }),
    ],
    [
      /당일 등락률 ([\d.]+)%/,
      (m) => ({
        icon: "🌿",
        title: `오늘 딱 ${m[1]}% 올랐어요 — 너무 급하지 않고 건강해요!`,
        story: `하루에 너무 많이(8% 이상) 오르면 오히려 위험해요. 흥분한 사람들이 생각 없이 막 산 거일 수 있거든요. 그런 주식은 다음 날 와르르 떨어지기 쉬워요. 이 주식은 오늘 ${m[1]}% 올랐는데, 이건 마치 100미터 달리기를 전력질주가 아니라 적당한 페이스로 뛰는 것 같아요. 내일도 계속 달릴 여력이 있다는 뜻이에요 🏃‍♂️`,
      }),
    ],
    [
      /갭 없이 자연스러운/,
      () => ({
        icon: "🌅",
        title: `오늘 아침 주식시장이 열릴 때 가격이 갑자기 뛰지 않았어요!`,
        story: `매일 아침 9시에 주식시장이 열려요. 이때 어떤 주식은 전날 마감 가격보다 훨씬 높은 가격에서 갑자기 시작하는 경우가 있어요. 이걸 "갭 상승"이라고 해요. 이러면 이미 너무 늦어요. 이 주식은 갑자기 뛰지 않고 자연스럽게 시작했어요. 마치 인기 있는 가게인데 웨이팅 없이 바로 들어갈 수 있는 것처럼요 😊`,
      }),
    ],
    [
      /양봉 마감/,
      () => ({
        icon: "🟢",
        title: `오늘 하루 내내 사려는 사람이 팔려는 사람보다 더 많았어요!`,
        story: `주식은 사려는 사람이 많으면 가격이 오르고, 팔려는 사람이 많으면 가격이 내려요. 오늘 아침 시작 가격보다 저녁 마감 가격이 더 높다는 건, 하루 종일 "이 주식 갖고 싶다!"는 사람이 "빨리 팔고 싶다!"는 사람보다 많았다는 뜻이에요. 투표로 치면 찬성표가 반대표보다 많이 나온 거예요 🗳️`,
      }),
    ],
    [
      /윗꼬리 없이 강하게 마감/,
      () => ({
        icon: "💪",
        title: `오늘 가장 높은 가격 근처에서 그대로 마감했어요 — 끝까지 강해요!`,
        story: `어떤 주식은 오늘 낮에 높이 올랐다가 마감 때는 다시 내려오는 경우가 있어요. 이걸 "윗꼬리"라고 해요. 이 주식은 높이 올라간 채로 그대로 장을 마쳤어요. 마치 달리기 선수가 결승선 직전에 힘이 빠지지 않고 끝까지 전속력으로 달린 것 같아요. 내일도 이 기세가 이어질 가능성이 높아요 🏅`,
      }),
    ],
  ];

  for (const [pattern, fn] of map) {
    const m = raw.match(pattern);
    if (m) return fn(m);
  }
  return { icon: "✅", title: raw.split(" — ")[0], story: raw.split(" — ")[1] ?? "" };
}

// ── 초딩용 경고 설명 ──
export function toKidWarning(raw: string, period: number, volMultiplier = 2, swRange = 15): { icon: string; title: string; story: string; fix: string } {
  const periodLabel = period <= 1 ? "하루" : period <= 2 ? "이틀" : period <= 5 ? `${period}일` : "한 달";
  const map: Array<[RegExp, (m: RegExpMatchArray) => { icon: string; title: string; story: string; fix: string }]> = [
    [
      new RegExp(`${period}일 돌파 미달`),
      () => ({
        icon: "🚧",
        title: "아직 가장 중요한 가격 벽을 못 넘었어요",
        story: `${periodLabel} 동안 가장 높은 가격이라는 '담장'이 있는데 아직 그걸 못 넘었어요. 담장 안에 맛있는 과일이 있는데 아직 못 들어간 상태예요. 담장을 넘는 날이 바로 매수 타이밍이에요! 이게 이 앱에서 가장 중요한 조건이에요.`,
        fix: `오늘 종가가 최근 ${period}일 최고가를 넘는 날 다시 확인해보세요!`,
      }),
    ],
    [
      /거래량 부족.*평균 ([\d.]+)배/,
      (m) => ({
        icon: "👻",
        title: `아직 많은 사람들이 관심을 안 가지고 있어요 (평균의 ${m[1]}배)`,
        story: `가격이 올랐는데 거래량이 적으면 위험해요. 마치 아무도 없는 놀이공원에서 갑자기 롤러코스터가 움직이는 것처럼 뭔가 이상해요. 진짜로 많은 사람이 사야 진짜 상승이에요. 지금은 평균의 ${m[1]}배밖에 안 돼서 아직 ${volMultiplier}배가 안 됐어요.`,
        fix: `거래량이 평소의 ${volMultiplier}배 이상 되는 날을 기다리세요! 그날이 진짜 신호예요.`,
      }),
    ],
    [
      /횡보 범위 초과.*?([\d.]+)%/,
      (m) => ({
        icon: "🎢",
        title: `가격이 최근 ${periodLabel} 동안 ${m[1]}%나 들쑥날쑥했어요`,
        story: `요즘 이 주식 가격이 롤러코스터처럼 오르락내리락 했어요. 좋은 돌파 신호가 나오려면 먼저 가격이 좁은 범위에서 조용히 안정됐다가 한 번에 터져야 해요. 에너지가 충분히 응축되지 않은 상태라 오늘 오른 것도 일시적일 수 있어요.`,
        fix: `가격이 ${swRange}% 이내 좁은 범위에서 조용히 움직이다가 터지는 날을 기다려요!`,
      }),
    ],
    [
      /MA60 하회/,
      () => ({
        icon: "📉",
        title: "3달 평균보다 낮은 가격에 있어요 — 전체 흐름이 하락 중이에요",
        story: "3달 전부터 지금까지 평균 가격보다 현재 가격이 낮아요. 학교 성적으로 치면 최근 3달 평균이 70점인데 지금 60점인 상태예요. 전체적인 방향이 아래로 향하고 있을 때 샀다가는 더 내려갈 수 있어요. 수영장에서 물이 빠져나가는 중인데 수영하려는 것 같아요 🏊",
        fix: "3달 평균 가격(MA60)을 다시 넘어오는 날 다시 체크하세요!",
      }),
    ],
    [
      /거래대금 부족/,
      () => ({
        icon: "🏜️",
        title: "하루 거래 금액이 500억도 안 돼요 — 팔고 싶을 때 못 팔 수 있어요",
        story: "거래가 적으면 내가 팔고 싶어도 사줄 사람이 없을 수 있어요. 마치 사막 한가운데서 아이스크림을 파는 것처럼요. 사는 사람은 없고 나만 있는 거예요. 주식은 살 때뿐만 아니라 팔 때도 쉬워야 해요. 이건 아주 중요해요!",
        fix: "하루 거래금액이 500억 원이 넘는 종목을 기다리세요! 그래야 안전해요.",
      }),
    ],
    [
      /5일 누적 ([\d.]+)% 급등/,
      (m) => ({
        icon: "⚡",
        title: `이미 5일 만에 ${m[1]}%나 올랐어요 — 버스가 이미 떠났을 수 있어요`,
        story: `5일 동안 ${m[1]}%나 올랐다는 건 이미 많이 올라버린 거예요. 인기 드라마 마지막 화를 보고 나서 "이 드라마 대박이래!"하고 1화부터 보러가는 것 같아요. 내용은 알겠는데 이미 끝난 거잖아요. 지금 사면 꼭대기에서 사는 꼴이 될 수 있어요.`,
        fix: "조금 쉬었다가 다시 오르기 시작할 때를 기다려요. 한번 쉬면 더 건강하게 올라요!",
      }),
    ],
    [
      /당일 ([\d.]+)% 급등/,
      (m) => ({
        icon: "🌋",
        title: `오늘 하루에만 ${m[1]}%나 폭발적으로 올랐어요 — 과열 상태예요`,
        story: `${m[1]}%가 얼마나 많냐면, 만약 이 주식을 어제 100만 원어치 샀으면 오늘 하루 만에 ${m[1]}만 원이 늘어난 거예요! 이렇게 하루에 많이 오르면 흥분한 사람들이 생각 없이 산 경우가 많아요. 그 흥분이 가라앉으면 다시 내려와요. 뜨거운 라면처럼 조금 식힌 다음에 먹어야 해요 🍜`,
        fix: "오늘처럼 크게 오른 날 사지 말고, 며칠 지켜보다가 안정될 때 사세요!",
      }),
    ],
    [
      /갭 상승.*\+([\d.]+)%/,
      (m) => ({
        icon: "😱",
        title: `아침에 이미 ${m[1]}% 높은 가격에서 시작했어요 — 기회를 놓쳤을 수 있어요`,
        story: `오늘 아침 9시에 주식시장이 열렸는데, 어젯밤 마감 가격보다 ${m[1]}% 높게 시작했어요. 이 말은 오늘 새벽부터 이미 많은 사람이 이 주식을 사놨다는 뜻이에요. 놀이공원 오픈런처럼 이미 줄 서고 들어간 사람들이 있어요. 지금 사면 이미 오른 가격에 사는 거예요.`,
        fix: "갑자기 높게 시작하지 않고 자연스럽게 시작하는 날 다시 체크하세요!",
      }),
    ],
    [
      /음봉 마감/,
      () => ({
        icon: "😞",
        title: "오늘 팔려는 사람이 사려는 사람보다 더 많았어요",
        story: "오늘 아침 시작 가격보다 저녁 마감 가격이 낮아요. 하루 종일 '이 주식 팔고 싶다'는 사람이 더 많았다는 뜻이에요. 반찬을 보여줬더니 아이들이 손을 안 드는 것 같아요. 오늘만큼은 인기가 없었어요. 주식이 오르려면 사려는 사람이 더 많아야 해요.",
        fix: "시작 가격보다 마감 가격이 높은 날(양봉)이 나올 때 다시 보세요!",
      }),
    ],
    [
      /윗꼬리 존재.*?([\d.]+)%/,
      (m) => ({
        icon: "🎣",
        title: "오늘 높이 올랐다가 마감 때 다시 내려왔어요",
        story: `오늘 낮에 많이 올랐는데, 그 높은 가격(고가)에서 "이 정도면 팔아야지!"하는 사람들이 쏟아져서 가격이 다시 내려왔어요. 지금 종가가 고가의 ${m[1]}% 수준이에요. 낚싯대를 세게 던졌는데 물고기가 도망간 것 같아요. 힘이 조금 빠진 거예요.`,
        fix: "높이 올라가도 안 내려오고 그 가격 근처에서 마감하는 날(고가 대비 99% 이상)을 기다려요!",
      }),
    ],
  ];

  for (const [pattern, fn] of map) {
    const m = raw.match(pattern);
    if (m) return fn(m);
  }
  return {
    icon: "⚠️",
    title: raw.split(" — ")[0],
    story: raw.split(" — ")[1] ?? "",
    fix: "조건이 충족되면 다시 확인해봐요!",
  };
}

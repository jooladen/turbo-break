export type MinuteBar = {
  time: string; // "09:05", "09:30" 등 HH:MM
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OrbLevel = {
  high: number; // 오프닝 레인지 고가
  low: number; // 오프닝 레인지 저가
  periodMinutes: number; // 5 | 15 | 30
  endTime: string; // "09:05", "09:15", "09:30"
};

export type OrbSignal = {
  type: "LONG" | "SHORT";
  time: string;
  price: number;
  volumeMultiple: number; // 돌파 시 거래량 / 평균 거래량
};

export type VwapPoint = {
  time: string;
  value: number;
};

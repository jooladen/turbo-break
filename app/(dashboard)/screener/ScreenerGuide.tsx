"use client";

import { useState } from "react";

const SECTIONS = [
  {
    num: 1,
    title: "기본 사용법",
    items: [
      "기본값(5일 돌파 / 거래량 2배 / 횡보 15%)으로 시작하세요.",
      "장이 안 좋으면 → 1일 돌파 + 거래량 0.5배로 바꿔 테스트해 보세요. 종목이 나온다면 기본값이 얼마나 까다로운 보물 조건인지 체감할 수 있습니다.",
      "반드시 Yahoo Finance 어댑터로 설정하고, 장 마감 후에만 확인하세요. 내일 아침 전략 설계에 활용합니다.",
    ],
  },
  {
    num: 2,
    title: "차트 & 검증 보기",
    items: [
      "종목 행 클릭 → 팝업 차트에서 N일 돌파 기준선을 확인하세요.",
      '"검증 보기" 토글 → 엑셀식 계산 과정(거래량 합계·평균·배수·PASS/FAIL)을 직접 확인할 수 있습니다.',
      "5일 돌파 = 5일간 최고가를 6일째에 종가로 돌파 + 5일 평균 거래량의 2배 이상 돌파.",
      "20일 돌파 = 20일간 최고가를 21일째에 종가로 돌파 + 20일 평균 거래량의 2배 이상 돌파.",
    ],
  },
  {
    num: 3,
    title: '비유 — "대박 식당의 법칙"',
    items: [
      "매일 가게 안에 손님이 많던 식당(횡보) → 어느 날 밖에서 줄까지 섬(거래량 폭증) = 돌파!",
      "평소 손님 수(평균 거래량)보다 2배 이상 줄 서야 진짜 대박 신호입니다.",
    ],
  },
  {
    num: 4,
    title: "ORB 인트라데이",
    badge: "준비 중",
    items: [
      "분봉 기반 ORB(Opening Range Breakout) + VWAP 인트라데이 전략은 현재 준비 중입니다.",
    ],
  },
] as const;

export default function ScreenerGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span
          className="inline-block transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        {open ? "사용법 닫기" : "사용법 보기"}
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map((sec) => (
            <div
              key={sec.num}
              className="rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs font-bold">
                  {sec.num}
                </span>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {sec.title}
                </h3>
                {"badge" in sec && sec.badge && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    {sec.badge}
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {sec.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400 dark:before:text-gray-600"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

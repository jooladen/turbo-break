"use client";

import { useState } from "react";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function LandingContact() {
  const [status, setStatus] = useState<FormStatus>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const accessKey = process.env["NEXT_PUBLIC_WEB3FORMS_KEY"];
    if (!accessKey) {
      setStatus("error");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;
    const message = fd.get("message") as string;

    try {
      const res = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `[turbo-break] ${name}님의 문의`,
          from_name: name,
          name,
          email,
          message,
        }),
      });
      const data = (await res.json()) as { success?: boolean };
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="py-24 px-4 md:px-6 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="relative max-w-xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-pink-400 uppercase tracking-widest mb-3">Contact</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            문의하기
          </h2>
          <p className="text-gray-500 text-base">
            기능 제안, 버그 리포트, 제휴 문의 등 무엇이든 보내주세요
          </p>
        </div>

        <div className="relative bg-[#0c0c14] rounded-2xl p-8 border border-white/[0.08]">
          {status === "success" ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                전송 완료!
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                빠른 시일 내 답변 드리겠습니다.
              </p>
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="px-6 py-2.5 text-sm font-medium text-white border border-white/10 hover:border-white/25 rounded-full transition-all duration-300"
              >
                새 메시지 작성
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  이름
                </label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  placeholder="홍길동"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all duration-300"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  이메일
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all duration-300"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  메시지
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={4}
                  placeholder="문의 내용을 입력하세요..."
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/30 transition-all duration-300 resize-none"
                />
              </div>

              {status === "error" && (
                <p className="text-red-400 text-xs flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  전송에 실패했습니다. 다시 시도해주세요.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-3.5 text-sm font-semibold bg-white text-black rounded-full hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] disabled:opacity-40 transition-all duration-500"
              >
                {status === "submitting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    전송 중...
                  </span>
                ) : "메시지 보내기"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

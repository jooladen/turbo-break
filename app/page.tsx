import Link from "next/link";
import LandingContact from "./LandingContact";

/* ─── Mock chart SVG path for hero ─── */
const CHART_PATH = "M0,120 L30,115 L60,118 L90,110 L120,112 L150,108 L180,105 L210,108 L240,102 L270,105 L300,98 L330,95 L360,92 L390,88 L420,85 L450,80 L480,75 L510,78 L540,65 L570,55 L600,45 L630,40 L660,35 L690,42 L720,38";
const CHART_FILL = "M0,120 L30,115 L60,118 L90,110 L120,112 L150,108 L180,105 L210,108 L240,102 L270,105 L300,98 L330,95 L360,92 L390,88 L420,85 L450,80 L480,75 L510,78 L540,65 L570,55 L600,45 L630,40 L660,35 L690,42 L720,38 L720,150 L0,150 Z";
const VOL_BARS = [30,25,35,20,28,40,32,22,38,45,28,55,42,35,65,50,38,85,72,90,95,60,48,55];

const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "10가지 조건 필터링",
    description: "박스권 횡보, 거래량 급증, MA60 위치 등 엄선된 10가지 기술적 조건으로 노이즈를 제거합니다.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: "AI 매수 신호",
    description: "A/B/C/F 등급 자동 평가. 점수 기반 순위와 경고 메시지로 리스크를 사전에 파악합니다.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "인트라데이 ORB",
    description: "분봉 차트에서 Opening Range Breakout + VWAP 기반 장중 돌파 시그널을 실시간 포착합니다.",
    gradient: "from-pink-500 to-rose-400",
  },
] as const;

const STEPS = [
  { step: "01", title: "시장 & 기간 선택", description: "KOSPI / KOSDAQ / 전체 시장, 1~20일 돌파 기간, 거래량 배수를 설정하세요.", icon: "M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" },
  { step: "02", title: "자동 필터링", description: "10가지 기술적 조건이 동시에 적용되어 가장 안전한 돌파 후보만 선별됩니다.", icon: "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" },
  { step: "03", title: "신호 & 차트 확인", description: "A/B/C 등급 매수 신호와 캔들차트로 최적의 진입 타이밍을 잡으세요.", icon: "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" },
] as const;

const STATS = [
  { value: "10+", label: "필터 조건", suffix: "개" },
  { value: "2,000+", label: "스캔 종목", suffix: "개" },
  { value: "A~F", label: "매수 등급", suffix: "" },
  { value: "1~20", label: "돌파 기간", suffix: "일" },
] as const;

const TICKER_ITEMS = [
  { name: "삼성전자", change: "+2.4%", up: true },
  { name: "SK하이닉스", change: "+3.1%", up: true },
  { name: "LG에너지솔루션", change: "+1.8%", up: true },
  { name: "현대차", change: "-0.5%", up: false },
  { name: "NAVER", change: "+4.2%", up: true },
  { name: "카카오", change: "+1.2%", up: true },
  { name: "셀트리온", change: "+2.8%", up: true },
  { name: "KB금융", change: "-1.1%", up: false },
  { name: "POSCO홀딩스", change: "+0.9%", up: true },
  { name: "삼성바이오", change: "+5.1%", up: true },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060b] text-white overflow-hidden">
      {/* ═══ Nav ═══ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#06060b]/95 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight">turbo-break</span>
          </Link>
          <div className="flex items-center gap-8">
            <a href="#features" className="hidden md:block text-[13px] text-gray-500 hover:text-white transition-colors duration-300">
              기능
            </a>
            <a href="#how-it-works" className="hidden md:block text-[13px] text-gray-500 hover:text-white transition-colors duration-300">
              사용법
            </a>
            <a href="#contact" className="hidden md:block text-[13px] text-gray-500 hover:text-white transition-colors duration-300">
              문의
            </a>
            <Link
              href="/screener"
              className="px-5 py-2 text-[13px] font-semibold bg-white text-black rounded-full hover:bg-gray-200 transition-all duration-300"
            >
              스크리너 시작
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ Ticker bar ═══ */}
      <div className="fixed top-16 inset-x-0 z-40 bg-[#06060b]/95 border-b border-white/[0.03] overflow-hidden">
        <div className="animate-ticker flex items-center gap-8 py-2 whitespace-nowrap" style={{ width: "max-content" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-500">{t.name}</span>
              <span className={t.up ? "text-emerald-400" : "text-red-400"}>{t.change}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ Hero ═══ */}
      <section className="relative pt-40 pb-8 px-4 md:px-6">
        {/* Grid background */}
        <div className="absolute inset-0 grid-bg opacity-50" />

        {/* Orb glows */}
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[150px] animate-glow-strong pointer-events-none" />
        <div className="absolute top-[20%] right-[5%] w-[400px] h-[400px] bg-violet-600/12 rounded-full blur-[130px] animate-glow pointer-events-none" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[10%] left-[30%] w-[350px] h-[350px] bg-cyan-500/8 rounded-full blur-[120px] animate-glow pointer-events-none" style={{ animationDelay: "3.5s" }} />

        <div className="relative max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-blue-300/90 bg-blue-500/[0.07] border border-blue-500/15 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
              KOSPI &middot; KOSDAQ &middot; 2,000+ 종목 실시간 스캔
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-6">
              <span className="text-shimmer">박스권 돌파를</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent animate-gradient">
                포착하라
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
              10가지 기술적 조건으로 횡보 구간을 돌파하는 종목을 자동 선별.
              <br className="hidden md:block" />
              AI 등급 시스템으로 최적의 매수 타이밍을 제안합니다.
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Link
              href="/screener"
              className="group relative px-8 py-4 text-sm font-semibold bg-white text-black rounded-full hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500"
            >
              <span className="relative z-10 flex items-center gap-2">
                스크리너 시작하기
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
            <a
              href="#features"
              className="px-8 py-4 text-sm font-semibold text-gray-400 border border-white/10 rounded-full hover:border-white/25 hover:text-white transition-all duration-300"
            >
              더 알아보기
            </a>
          </div>

          {/* ── Hero Chart mockup ── */}
          <div className="animate-slide-up" style={{ animationDelay: "0.6s" }}>
            <div className="relative max-w-4xl mx-auto">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-pink-500/10 rounded-3xl blur-2xl pointer-events-none" />

              <div className="relative bg-[#0c0c14] rounded-2xl overflow-hidden border border-white/[0.08]">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/60" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-3 h-3 rounded-full bg-green-500/60" />
                    </div>
                    <span className="text-xs text-gray-600 font-mono">turbo-break / screener</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">LIVE</span>
                  </div>
                </div>

                {/* Fake stats row */}
                <div className="flex items-center gap-6 px-5 py-3 border-b border-white/[0.03]">
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider">스캔</div>
                    <div className="text-sm font-bold text-white">2,847</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider">돌파</div>
                    <div className="text-sm font-bold text-emerald-400">47</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider">A등급</div>
                    <div className="text-sm font-bold text-blue-400">12</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-wider">10/10 통과</div>
                    <div className="text-sm font-bold text-violet-400">5</div>
                  </div>
                </div>

                {/* Chart area */}
                <div className="relative px-5 pt-4 pb-2">
                  <svg viewBox="0 0 720 150" className="w-full h-auto" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[30, 60, 90, 120].map((y) => (
                      <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    ))}
                    {/* Fill gradient */}
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <path d={CHART_FILL} fill="url(#chartGrad)" />
                    <path d={CHART_PATH} fill="none" stroke="url(#lineGrad)" strokeWidth="2" strokeLinecap="round" className="animate-chart-draw" />
                    {/* Breakout marker */}
                    <circle cx="600" cy="45" r="4" fill="#3b82f6" opacity="0.9" />
                    <circle cx="600" cy="45" r="8" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.4" />
                  </svg>

                  {/* Volume bars */}
                  <div className="flex items-end gap-[2px] h-8 mt-1">
                    {VOL_BARS.map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${(h / 95) * 100}%`,
                          background: i >= 18 ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.06)",
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Fake table rows */}
                <div className="px-5 pb-4 space-y-1">
                  {[
                    { rank: 1, name: "하이브", grade: "A", score: 87, pct: "+8.3%", pass: "10/10" },
                    { rank: 2, name: "에코프로비엠", grade: "A", score: 82, pct: "+6.1%", pass: "10/10" },
                    { rank: 3, name: "포스코퓨처엠", grade: "B", score: 71, pct: "+4.5%", pass: "9/10" },
                  ].map((row) => (
                    <div key={row.rank} className="flex items-center gap-4 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <span className="text-xs text-gray-600 w-4">{row.rank}</span>
                      <span className="text-sm font-medium text-white flex-1">{row.name}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${row.grade === "A" ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}`}>
                        {row.grade}
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right">{row.score}점</span>
                      <span className="text-xs text-emerald-400 w-14 text-right">{row.pct}</span>
                      <span className="text-[10px] text-gray-600 w-12 text-right">{row.pass}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="py-32 px-4 md:px-6 relative">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Features</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              강력한 스크리닝 엔진
            </h2>
            <p className="text-gray-500 text-base max-w-lg mx-auto">
              복잡한 기술적 분석을 자동화하여 가장 유망한 돌파 종목만 찾아냅니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group relative rounded-2xl p-8 bg-[#0e0e16] border border-white/[0.06] hover:bg-[#121220] hover:border-white/[0.1] transition-all duration-500 hover:translate-y-[-4px]"
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} mb-6 text-white shadow-lg`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-3 group-hover:text-blue-400 transition-colors duration-300">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.description}
                </p>
                {/* Hover glow */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section id="how-it-works" className="py-32 px-4 md:px-6 relative">
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-violet-400 uppercase tracking-widest mb-3">How it works</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              3단계로 완성
            </h2>
            <p className="text-gray-500 text-base">
              복잡한 설정 없이 바로 시작하세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {STEPS.map((s, i) => (
              <div key={s.step} className="relative text-center group">
                {/* Step circle */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-600/10 group-hover:from-blue-500/20 group-hover:to-violet-600/20 transition-all duration-500" />
                  <div className="absolute inset-[3px] rounded-full bg-[#06060b]" />
                  <div className="relative">
                    <svg className="w-7 h-7 text-gray-400 group-hover:text-blue-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                    </svg>
                  </div>
                </div>
                <div className="text-xs font-bold text-blue-400/60 mb-2">STEP {s.step}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Stats ═══ */}
      <section className="py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-[#0c0c14] rounded-2xl p-12 overflow-hidden border border-white/[0.08]">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
              {STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl md:text-5xl font-extrabold text-white mb-1">
                    {s.value}
                    {s.suffix && <span className="text-lg text-gray-600 font-medium">{s.suffix}</span>}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA banner ═══ */}
      <section className="py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-pink-600/10 rounded-3xl blur-3xl pointer-events-none" />
          <div className="relative bg-[#0e0e16] border border-white/[0.06] rounded-3xl py-16 px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              회원가입 없이 무료로 사용 가능합니다. 오늘의 돌파 종목을 확인하세요.
            </p>
            <Link
              href="/screener"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-semibold bg-white text-black rounded-full hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all duration-500"
            >
              스크리너 열기
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Contact ═══ */}
      <LandingContact />

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-white/[0.04] py-10 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">
              &copy; {new Date().getFullYear()} turbo-break
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/screener" className="text-xs text-gray-600 hover:text-gray-300 transition-colors duration-300">
              스크리너
            </Link>
            <Link href="/intraday" className="text-xs text-gray-600 hover:text-gray-300 transition-colors duration-300">
              인트라데이
            </Link>
            <a href="#contact" className="text-xs text-gray-600 hover:text-gray-300 transition-colors duration-300">
              문의
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

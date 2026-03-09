import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://turbo-break.vercel.app";

export const metadata: Metadata = {
  title: "turbo-break | 고가 돌파 주식 스크리너",
  description: "박스권 횡보 후 수급을 동반한 안전한 돌파 종목을 자동으로 필터링하는 KOSPI/KOSDAQ 주식 스크리너",
  keywords: ["주식 스크리너", "고가 돌파", "KOSPI", "KOSDAQ", "거래량 돌파", "박스권 횡보", "주식 필터링", "turbo-break"],
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "turbo-break | 고가 돌파 주식 스크리너",
    description: "박스권 횡보 후 수급을 동반한 안전한 돌파 종목을 자동으로 필터링하는 KOSPI/KOSDAQ 주식 스크리너",
    url: BASE_URL,
    siteName: "turbo-break",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "turbo-break | 고가 돌파 주식 스크리너",
    description: "박스권 횡보 후 수급을 동반한 안전한 돌파 종목을 자동으로 필터링하는 KOSPI/KOSDAQ 주식 스크리너",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "q3vp3LyDmgQmf35ljxaZCN_z8FbHb1xGJSAcgEw4THM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: 인라인 스크립트가 서버/클라이언트 class 불일치를 일으킬 수 있음
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지: 페인트 전에 localStorage에서 테마를 읽어 class 적용 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

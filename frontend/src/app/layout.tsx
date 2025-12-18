import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "../components/contexts/auth-context";
import ConsoleFilter from "../components/clients/console-filter";

const inter = Inter({ 
  subsets: ["latin"],
  display: "swap",
  // 日本語サブセットは含まれないため、デフォルトのシステムフォントにフォールバック
  fallback: ['system-ui', 'sans-serif'],
});

// 動的レンダリングを強制（キャッシュを無効化）
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "nomoca 香川 - 管理画面",
  description: "nomoca 香川の管理画面です",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [
      { url: "/favicon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Material Symbols Outlined: 使用する設定のみ読み込み（opsz:24, wght:400, FILL:0, GRAD:0） */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
        {/* 明示的にファビコンを指定（ブラウザキャッシュや拡張子差異に強い）*/}
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png?v=2" />
        <link rel="apple-touch-icon" href="/favicon.png?v=2" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ConsoleFilter />
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

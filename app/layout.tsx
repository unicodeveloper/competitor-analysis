import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GitHubCorner from "./components/GitHubCorner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Competitor Analysis | AI-Powered Deep Research",
  description: "Get comprehensive competitor insights with AI-powered deep research. Analyze products, market positioning, and strategy using Valyu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GitHubCorner url="https://github.com/unicodeveloper/competitor-analysis" />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

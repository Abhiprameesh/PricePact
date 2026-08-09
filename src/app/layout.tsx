import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Flame, Plus } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PricePact - Collective Community Buying Power",
  description: "Turn scattered local demand into group negotiation power. Save together with your hostel, college, or apartment neighborhood.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090a0f] text-[#f3f4f6]">
        {/* Sticky Glass Navbar */}
        <nav className="sticky top-0 z-50 w-full bg-[#090a0f]/60 backdrop-blur-md border-b border-white/5 py-3.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#06b6d4] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Flame className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white group-hover:text-[#6366f1] transition-colors">
                PricePact
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link 
                href="/pact/new"
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-[#6366f1] hover:bg-[#4f46e5] rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Start a Pact
              </Link>
            </div>
          </div>
        </nav>
        
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}

// Root layout — loads fonts, sets metadata, and wraps everything in providers.
// Poppins is the primary UI font; Geist Mono is used for latency/debug readouts.
import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CallDraft — AI Voice Agent for HVAC",
  description: "AI-powered voice agent that answers phone calls for HVAC businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* CSS variables for fonts are set on <body> so Tailwind can reference them */}
      <body
        className={`${poppins.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

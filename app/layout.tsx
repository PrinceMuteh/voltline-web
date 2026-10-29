import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Voltline", template: "%s · Voltline" },
  description:
    "Run every charger from one console. Voltline is a product of Flex Mobility Limited.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
          <p className="sticky top-0 z-50 bg-ink px-4 py-1.5 text-center text-[12.5px] text-white">
            Demo with sample data: no real chargers or payments. Driver sessions
            stay in this browser; other changes reset when you reload.
          </p>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

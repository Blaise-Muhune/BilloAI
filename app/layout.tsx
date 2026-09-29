import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-ui",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BilloAI",
    template: "%s · BilloAI",
  },
  description: "After you network, know who from the room is worth staying connected to.",
  icons: {
    icon: "/brand/mark.svg",
    apple: "/brand/mark.png",
  },
  openGraph: {
    title: "BilloAI",
    description: "After you network, know who from the room is worth staying connected to.",
    images: [{ url: "/brand/og.png", width: 1376, height: 768 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}

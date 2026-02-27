import type { Metadata } from "next";
import { Outfit, Fira_Code } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dry Runner — 3D DSA Visualizer",
  description: "Visualize data structures and algorithms in 3D. Write code, execute it, and watch the trace come alive.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${firaCode.variable} antialiased text-[var(--foreground)] bg-[var(--background)] font-sans`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

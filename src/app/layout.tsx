import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const headingFont = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  applicationName: "PlatePlan",
  title: {
    default: "PlatePlan",
    template: "%s | PlatePlan",
  },
  description: "Recipe planning, meal planning, and shopping list app",
  keywords: ["recipes", "meal planner", "shopping list", "supabase", "next.js"],
  openGraph: {
    title: "PlatePlan",
    description: "Recipe planning, meal planning, and shopping list app",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>{children}</body>
    </html>
  );
}

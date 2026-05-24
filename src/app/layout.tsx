import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

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
  applicationName: "Plate Plan",
  title: {
    default: "Plate Plan",
    template: "%s | Plate Plan",
  },
  description:
    "Recipe planning, meal planning, recipe import, recipe scanning, and shopping lists.",
  keywords: ["recipes", "meal planner", "shopping list", "supabase", "next.js"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Plate Plan",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/icon-192.png"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Plate Plan",
    description:
      "Recipe planning, meal planning, recipe import, recipe scanning, and shopping lists.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6D8B74",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { BRAND } from "@/lib/brand";

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

function resolveMetadataBase() {
  const fallback = "http://localhost:3000";
  const rawValue = process.env.NEXT_PUBLIC_SITE_URL || fallback;

  try {
    return new URL(rawValue);
  } catch {
    return new URL(fallback);
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  applicationName: BRAND.name,
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: ["recipes", "meal planner", "shopping list", "supabase", "next.js"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.description,
    type: "website",
    images: [
      {
        url: BRAND.assets.socialPreview,
        width: 1536,
        height: 1024,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.name,
    description: BRAND.description,
    images: [BRAND.assets.socialPreview],
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

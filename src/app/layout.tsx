import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clan Companion",
  description: "Recipe planning, meal prep, and shopping list organization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

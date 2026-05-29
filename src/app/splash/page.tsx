import type { Metadata } from "next";

import { BrandedLoadingScreen } from "@/components/brand/branded-loading-screen";

export const metadata: Metadata = {
  title: "Splash",
};

export default function SplashPage() {
  return <BrandedLoadingScreen message="Good meals start here." />;
}

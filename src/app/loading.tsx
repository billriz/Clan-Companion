import { BrandMark } from "@/components/brand/brand-mark";
import { BRAND } from "@/lib/brand";

export default function AppLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gravy-cream px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-gravy-paper px-6 py-8 text-center shadow-soft">
        <BrandMark className="mx-auto h-auto w-full max-w-[12.5rem]" priority />
        <p className="mt-4 text-sm text-muted-foreground">
          {BRAND.tagline} Loading your kitchen workspace...
        </p>
      </div>
    </main>
  );
}

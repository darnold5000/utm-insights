import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingView } from "@/components/landing-view";
import { redirectIfLiveAnalyticsHome } from "@/lib/analytics/demo-routes";

export const metadata: Metadata = { title: "Sample landing page" };

export default function LandingPage() {
  redirectIfLiveAnalyticsHome();
  return (
    <Suspense fallback={<div className="px-6 py-16 text-sm">Loading sample landing page…</div>}>
      <LandingView />
    </Suspense>
  );
}

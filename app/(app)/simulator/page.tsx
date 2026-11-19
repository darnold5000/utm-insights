import type { Metadata } from "next";
import { SimulatorView } from "@/components/simulator-view";
import { redirectIfLiveAnalyticsHome } from "@/lib/analytics/demo-routes";

export const metadata: Metadata = { title: "Campaign simulator" };

export default function SimulatorPage() {
  redirectIfLiveAnalyticsHome();
  return <SimulatorView />;
}

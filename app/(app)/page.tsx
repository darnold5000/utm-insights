import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard-view";
import { LiveDashboardView } from "@/components/live-dashboard-view";
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  if (isAnalyticsBackendConfigured()) return <LiveDashboardView />;
  return <DashboardView />;
}

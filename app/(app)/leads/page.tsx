import type { Metadata } from "next";
import { LeadsView } from "@/components/leads-view";
import { redirectIfLiveAnalyticsHome } from "@/lib/analytics/demo-routes";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  redirectIfLiveAnalyticsHome();
  return <LeadsView />;
}

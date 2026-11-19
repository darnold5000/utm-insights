import type { Metadata } from "next"
import { LinksView } from "@/components/links-view"
import { LiveLinksView } from "@/components/live-links-view"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"

export const metadata: Metadata = { title: "Campaign links" }

export default function LinksPage() {
  if (isAnalyticsBackendConfigured()) return <LiveLinksView />
  return <LinksView />
}

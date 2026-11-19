import type { Metadata } from "next"
import { LinkDetail } from "@/components/link-detail"
import { redirectIfLiveAnalyticsHome } from "@/lib/analytics/demo-routes"

export const metadata: Metadata = { title: "Link performance" }

export default function LinkDetailPage() {
  redirectIfLiveAnalyticsHome()
  return <LinkDetail />
}

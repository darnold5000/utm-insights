import type { Metadata } from "next"
import { Suspense } from "react"
import { VisitView } from "@/components/visit-view"
import { redirectIfLiveAnalyticsHome } from "@/lib/analytics/demo-routes"

export const metadata: Metadata = { title: "Simulated visit" }

export default function VisitPage() {
  redirectIfLiveAnalyticsHome()
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading visit…</p>}>
      <VisitView />
    </Suspense>
  )
}

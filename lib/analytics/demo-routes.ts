import { redirect } from "next/navigation"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"

/** Demo-only pages must not render when Supabase analytics mode is enabled. */
export function redirectIfLiveAnalyticsHome() {
  if (isAnalyticsBackendConfigured()) redirect("/")
}
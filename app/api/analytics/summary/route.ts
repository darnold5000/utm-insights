import { type NextRequest, NextResponse } from "next/server"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"
import {
  fetchEvents,
  summarizeEvents,
  type AnalyticsRangeDays,
  type AttributionMode,
} from "@/lib/analytics/queries"
import { getSessionUser, isDashboardAdmin } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  if (!isAnalyticsBackendConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 })
  }

  const user = await getSessionUser()
  if (!user || !(await isDashboardAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const projectId = params.get("projectId")
  const daysRaw = Number(params.get("days") ?? "30")
  const days = ([7, 30, 90] as const).includes(daysRaw as AnalyticsRangeDays)
    ? (daysRaw as AnalyticsRangeDays)
    : 30
  const mode = params.get("attribution") === "last_touch" ? "last_touch" : "first_touch"
  const conversionFilter = params.get("conversion") ?? "all"

  const events = await fetchEvents({
    projectId: projectId && projectId !== "all" ? projectId : null,
    days,
  })

  const summary = summarizeEvents(
    events,
    mode as AttributionMode,
    conversionFilter === "all" ? null : conversionFilter,
  )
  return NextResponse.json({ summary, eventCount: events.length })
}
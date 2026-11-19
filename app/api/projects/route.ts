import { NextResponse } from "next/server"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"
import { listProjects } from "@/lib/analytics/queries"
import { getSessionUser, isDashboardAdmin } from "@/lib/supabase/server"

export async function GET() {
  if (!isAnalyticsBackendConfigured()) {
    return NextResponse.json({ projects: [] })
  }

  const user = await getSessionUser()
  if (!user || !(await isDashboardAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const projects = await listProjects()
  return NextResponse.json({ projects })
}
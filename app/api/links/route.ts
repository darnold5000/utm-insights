import { type NextRequest, NextResponse } from "next/server"
import { destinationAllowed } from "@/lib/analytics/origins"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"
import { listSavedLinks, type DbSavedLink } from "@/lib/analytics/queries"
import { getSessionUser, isDashboardAdmin, createServiceClient } from "@/lib/supabase/server"
import { slugify, buildTrackedUrl } from "@/lib/traffic"

export async function GET(request: NextRequest) {
  if (!isAnalyticsBackendConfigured()) {
    return NextResponse.json({ links: [] })
  }

  const user = await getSessionUser()
  if (!user || !(await isDashboardAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const projectId = request.nextUrl.searchParams.get("projectId")
  const links = await listSavedLinks(projectId && projectId !== "all" ? projectId : null)
  return NextResponse.json({ links })
}

type SaveLinkBody = {
  projectId: string
  name: string
  destinationUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign?: string
  utmContent?: string | null
  utmTerm?: string | null
  linkType?: string
}

export async function POST(request: NextRequest) {
  if (!isAnalyticsBackendConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 })
  }

  const user = await getSessionUser()
  if (!user || !(await isDashboardAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: SaveLinkBody
  try {
    body = (await request.json()) as SaveLinkBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  if (!body.projectId || !body.name?.trim() || !body.destinationUrl?.trim()) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: project } = await supabase
    .from("sw_projects")
    .select("website_domain, allowed_origins")
    .eq("id", body.projectId)
    .maybeSingle()

  if (!project) return NextResponse.json({ error: "Unknown project." }, { status: 404 })

  const destination = body.destinationUrl.trim()
  if (
    !destinationAllowed(
      destination,
      project.website_domain,
      Array.isArray(project.allowed_origins) ? project.allowed_origins : [],
    )
  ) {
    return NextResponse.json({ error: "Destination must match the project domain." }, { status: 400 })
  }

  const utmCampaign = slugify(body.utmCampaign ?? body.name)
  const row = {
    project_id: body.projectId,
    name: body.name.trim(),
    destination_url: destination,
    utm_source: body.utmSource.trim(),
    utm_medium: body.utmMedium.trim(),
    utm_campaign: utmCampaign,
    utm_content: body.utmContent?.trim() || null,
    utm_term: body.utmTerm?.trim() || null,
    link_type: body.linkType ?? "organic",
  }

  const { data, error } = await supabase.from("sw_saved_links").insert(row).select("*").single()
  if (error || !data) {
    return NextResponse.json({ error: "Failed to save link." }, { status: 500 })
  }

  const saved = data as DbSavedLink
  const trackedUrl = buildTrackedUrl({
    destination: saved.destination_url,
    source: saved.utm_source,
    medium: saved.utm_medium,
    campaign: saved.utm_campaign,
    content: saved.utm_content,
  })

  return NextResponse.json({ link: saved, trackedUrl }, { status: 201 })
}
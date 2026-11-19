import { type NextRequest, NextResponse } from "next/server"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"
import { ingestTrackEvent, type TrackEventPayload, verifyConversionSecret } from "@/lib/analytics/ingest"
import { createServiceClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!isAnalyticsBackendConfigured()) {
    return NextResponse.json({ error: "Analytics backend is not configured." }, { status: 503 })
  }

  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 })
  }
  const secret = auth.slice("Bearer ".length).trim()
  if (!secret) {
    return NextResponse.json({ error: "Missing bearer token." }, { status: 401 })
  }

  let body: TrackEventPayload
  try {
    body = (await request.json()) as TrackEventPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.projectKey?.trim()) {
    return NextResponse.json({ error: "Missing project key." }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: project } = await supabase
    .from("sw_projects")
    .select("conversion_secret_hash, is_active, allowed_origins")
    .eq("public_key", body.projectKey.trim())
    .maybeSingle()

  if (!project?.is_active) {
    return NextResponse.json({ error: "Unknown or inactive project." }, { status: 404 })
  }

  if (!verifyConversionSecret(secret, project.conversion_secret_hash ?? null)) {
    return NextResponse.json({ error: "Invalid project secret." }, { status: 403 })
  }

  const result = await ingestTrackEvent(body, { allowHighValueConversions: true })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ ok: true, deduplicated: result.deduplicated ?? false }, { status: result.status })
}
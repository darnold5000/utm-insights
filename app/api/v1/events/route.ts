import { type NextRequest, NextResponse } from "next/server"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"
import { ingestTrackEvent, type TrackEventPayload } from "@/lib/analytics/ingest"

export const runtime = "nodejs"

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
  if (origin) headers["Access-Control-Allow-Origin"] = origin
  return headers
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(request: NextRequest) {
  if (!isAnalyticsBackendConfigured()) {
    return NextResponse.json({ error: "Analytics backend is not configured." }, { status: 503 })
  }

  const origin = request.headers.get("origin")
  let body: TrackEventPayload
  try {
    const raw = await request.json()
    body = raw as TrackEventPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: corsHeaders(origin) })
  }

  const result = await ingestTrackEvent(body, { requestOrigin: origin })
  const headers = corsHeaders(origin)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status, headers })
  }
  return NextResponse.json(
    { ok: true, deduplicated: result.deduplicated ?? false },
    { status: result.status, headers },
  )
}
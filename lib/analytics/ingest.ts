import { createHash, timingSafeEqual } from "crypto"
import {
  CLIENT_ALLOWED_CONVERSIONS,
  isConversionEventType,
  isPublicEventType,
  type PublicEventType,
} from "@/lib/analytics/config"
import { eventOriginAllowed } from "@/lib/analytics/origins"
import { createServiceClient } from "@/lib/supabase/server"

export type TrackEventPayload = {
  projectKey: string
  eventId?: string | null
  visitorId: string
  sessionId: string
  eventType: string
  occurredAt?: string
  pagePath?: string | null
  landingPage?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  utmTerm?: string | null
  utmId?: string | null
  firstTouch?: {
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    utmContent?: string | null
    utmTerm?: string | null
  } | null
  lastTouch?: {
    utmSource?: string | null
    utmMedium?: string | null
    utmCampaign?: string | null
    utmContent?: string | null
    utmTerm?: string | null
  } | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function trimField(value: string | null | undefined, max = 500): string | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function parseOccurredAt(value?: string): string {
  if (!value) return new Date().toISOString()
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return new Date().toISOString()
  const ageMs = Date.now() - parsed
  if (ageMs > 1000 * 60 * 60 * 24 * 7 || ageMs < -1000 * 60 * 5) {
    return new Date().toISOString()
  }
  return new Date(parsed).toISOString()
}

export function hashConversionSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex")
}

export function verifyConversionSecret(provided: string, hash: string | null): boolean {
  if (!hash || !provided) return false
  const digest = createHash("sha256").update(provided).digest()
  const expected = Buffer.from(hash, "hex")
  if (digest.length !== expected.length) return false
  return timingSafeEqual(digest, expected)
}

type IngestOptions = {
  requestOrigin?: string | null
  allowHighValueConversions?: boolean
}

export async function ingestTrackEvent(payload: TrackEventPayload, options: IngestOptions = {}) {
  if (!payload.projectKey?.trim()) return { ok: false as const, status: 400, error: "Missing project key." }
  if (!UUID_RE.test(payload.visitorId) || !UUID_RE.test(payload.sessionId)) {
    return { ok: false as const, status: 400, error: "visitorId and sessionId must be UUIDs." }
  }
  if (!isPublicEventType(payload.eventType)) {
    return { ok: false as const, status: 400, error: "Unsupported event type." }
  }

  const eventType = payload.eventType as PublicEventType
  if (
    isConversionEventType(eventType) &&
    !options.allowHighValueConversions &&
    !CLIENT_ALLOWED_CONVERSIONS.has(eventType)
  ) {
    return { ok: false as const, status: 403, error: "Use the server conversion endpoint for this event type." }
  }

  const supabase = createServiceClient()
  const { data: project, error: projectError } = await supabase
    .from("sw_projects")
    .select("id, is_active, allowed_origins")
    .eq("public_key", payload.projectKey.trim())
    .maybeSingle()

  if (projectError || !project) return { ok: false as const, status: 404, error: "Unknown project." }
  if (!project.is_active) return { ok: false as const, status: 403, error: "Project is inactive." }

  const allowedOrigins = Array.isArray(project.allowed_origins) ? project.allowed_origins : []
  if (
    !eventOriginAllowed(
      payload.pagePath,
      payload.referrer,
      options.requestOrigin ?? null,
      allowedOrigins,
    )
  ) {
    return { ok: false as const, status: 403, error: "Origin not allowed for this project." }
  }

  const row = {
    project_id: project.id,
    event_id: trimField(payload.eventId, 120),
    visitor_id: payload.visitorId,
    session_id: payload.sessionId,
    event_type: eventType,
    occurred_at: parseOccurredAt(payload.occurredAt),
    page_path: trimField(payload.pagePath, 2000),
    landing_page: trimField(payload.landingPage, 2000),
    referrer: trimField(payload.referrer, 2000),
    utm_source: trimField(payload.utmSource, 200),
    utm_medium: trimField(payload.utmMedium, 200),
    utm_campaign: trimField(payload.utmCampaign, 200),
    utm_content: trimField(payload.utmContent, 200),
    utm_term: trimField(payload.utmTerm, 200),
    utm_id: trimField(payload.utmId, 200),
    ft_utm_source: trimField(payload.firstTouch?.utmSource, 200),
    ft_utm_medium: trimField(payload.firstTouch?.utmMedium, 200),
    ft_utm_campaign: trimField(payload.firstTouch?.utmCampaign, 200),
    ft_utm_content: trimField(payload.firstTouch?.utmContent, 200),
    ft_utm_term: trimField(payload.firstTouch?.utmTerm, 200),
    lt_utm_source: trimField(payload.lastTouch?.utmSource, 200),
    lt_utm_medium: trimField(payload.lastTouch?.utmMedium, 200),
    lt_utm_campaign: trimField(payload.lastTouch?.utmCampaign, 200),
    lt_utm_content: trimField(payload.lastTouch?.utmContent, 200),
    lt_utm_term: trimField(payload.lastTouch?.utmTerm, 200),
  }

  const { error } = await supabase.from("sw_tracking_events").insert(row)
  if (error) {
    if (error.code === "23505") return { ok: true as const, status: 200, deduplicated: true }
    return { ok: false as const, status: 500, error: "Failed to record event." }
  }

  return { ok: true as const, status: 201, deduplicated: false }
}
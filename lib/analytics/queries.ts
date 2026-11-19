import { createServiceClient } from "@/lib/supabase/server"
import { isConversionEventType } from "@/lib/analytics/config"

export type DbProject = {
  id: string
  name: string
  website_domain: string
  public_key: string
  allowed_origins: string[]
  is_active: boolean
}

export type DbSavedLink = {
  id: string
  project_id: string
  name: string
  destination_url: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string | null
  utm_term: string | null
  link_type: string
  created_at: string
}

export type DbTrackingEvent = {
  id: string
  project_id: string
  event_id: string | null
  visitor_id: string
  session_id: string
  event_type: string
  occurred_at: string
  page_path: string | null
  landing_page: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ft_utm_source: string | null
  ft_utm_medium: string | null
  ft_utm_campaign: string | null
  ft_utm_content: string | null
  ft_utm_term: string | null
  lt_utm_source: string | null
  lt_utm_medium: string | null
  lt_utm_campaign: string | null
  lt_utm_content: string | null
  lt_utm_term: string | null
}

export type AttributionMode = "first_touch" | "last_touch"

export type AnalyticsRangeDays = 7 | 30 | 90

function rangeStart(days: AnalyticsRangeDays): string {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return start.toISOString()
}

function pickAttribution(event: DbTrackingEvent, mode: AttributionMode) {
  if (mode === "last_touch") {
    return {
      source: event.lt_utm_source ?? event.utm_source,
      medium: event.lt_utm_medium ?? event.utm_medium,
      campaign: event.lt_utm_campaign ?? event.utm_campaign,
      content: event.lt_utm_content ?? event.utm_content,
    }
  }
  return {
    source: event.ft_utm_source ?? event.utm_source,
    medium: event.ft_utm_medium ?? event.utm_medium,
    campaign: event.ft_utm_campaign ?? event.utm_campaign,
    content: event.ft_utm_content ?? event.utm_content,
  }
}

export function classifyTrafficSource(source: string | null, medium: string | null, referrer: string | null) {
  const s = (source ?? "").toLowerCase()
  const m = (medium ?? "").toLowerCase()
  if (s.includes("facebook") && m.includes("paid")) return "Facebook paid"
  if (s.includes("facebook")) return "Facebook organic"
  if (s.includes("instagram")) return "Instagram"
  if (s.includes("google") && (m.includes("cpc") || m.includes("paid"))) return "Google paid"
  if (s.includes("google")) return "Google"
  if (m.includes("email") || s === "email") return "Email"
  if (referrer) return "Referral"
  if (!s && !m && !referrer) return "Direct"
  if (s) return "Other"
  return "Direct"
}

export async function listProjects(): Promise<DbProject[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("sw_projects")
    .select("id, name, website_domain, public_key, allowed_origins, is_active")
    .order("name")
  if (error || !data) return []
  return data as DbProject[]
}

export async function listSavedLinks(projectId: string | null): Promise<DbSavedLink[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from("sw_saved_links")
    .select("*")
    .order("created_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error || !data) return []
  return data as DbSavedLink[]
}

export async function fetchEvents(input: {
  projectId: string | null
  days: AnalyticsRangeDays
}): Promise<DbTrackingEvent[]> {
  const supabase = createServiceClient()
  let query = supabase
    .from("sw_tracking_events")
    .select("*")
    .gte("occurred_at", rangeStart(input.days))
    .order("occurred_at", { ascending: false })
    .limit(50000)

  if (input.projectId) query = query.eq("project_id", input.projectId)

  const { data, error } = await query
  if (error || !data) return []
  return data as DbTrackingEvent[]
}

export type CampaignRow = {
  campaign: string
  source: string | null
  medium: string | null
  content: string | null
  visitors: number
  conversions: number
  rate: number | null
}

export type AnalyticsSummary = {
  uniqueVisitors: number
  sessions: number
  pageViews: number
  conversionEvents: number
  convertedVisitors: number
  conversionRate: number | null
  topCampaign: string | null
  campaignRows: CampaignRow[]
  trafficSources: { label: string; visitors: number }[]
}

export function summarizeEvents(
  events: DbTrackingEvent[],
  mode: AttributionMode,
  conversionEventType?: string | null,
): AnalyticsSummary {
  const pageViews = events.filter((e) => e.event_type === "page_view")
  const uniqueVisitors = new Set(pageViews.map((e) => e.visitor_id)).size
  const sessions = new Set(pageViews.map((e) => e.session_id)).size

  const conversionEvents = events.filter((e) => {
    if (!isConversionEventType(e.event_type)) return false
    if (conversionEventType && conversionEventType !== "all" && e.event_type !== conversionEventType) {
      return false
    }
    return true
  })

  const convertedVisitors = new Set(conversionEvents.map((e) => e.visitor_id)).size
  const conversionRate = uniqueVisitors > 0 ? convertedVisitors / uniqueVisitors : null

  const campaignMap = new Map<string, CampaignRow>()
  for (const event of pageViews) {
    const attr = pickAttribution(event, mode)
    const key = [attr.campaign ?? "(none)", attr.source ?? "", attr.medium ?? "", attr.content ?? ""].join("|")
    const row =
      campaignMap.get(key) ??
      ({
        campaign: attr.campaign ?? "(none)",
        source: attr.source,
        medium: attr.medium,
        content: attr.content,
        visitors: 0,
        conversions: 0,
        rate: null,
      } satisfies CampaignRow)
    row.visitors += 1
    campaignMap.set(key, row)
  }

  for (const event of conversionEvents) {
    const attr = pickAttribution(event, mode)
    const key = [attr.campaign ?? "(none)", attr.source ?? "", attr.medium ?? "", attr.content ?? ""].join("|")
    const row = campaignMap.get(key)
    if (row) row.conversions += 1
    else {
      campaignMap.set(key, {
        campaign: attr.campaign ?? "(none)",
        source: attr.source,
        medium: attr.medium,
        content: attr.content,
        visitors: 0,
        conversions: 1,
        rate: null,
      })
    }
  }

  const campaignRows = [...campaignMap.values()]
    .map((row) => ({
      ...row,
      rate: row.visitors > 0 ? row.conversions / row.visitors : null,
    }))
    .sort((a, b) => b.visitors - a.visitors || b.conversions - a.conversions)

  const topCampaign = campaignRows.find((r) => r.campaign !== "(none)")?.campaign ?? null

  const sourceMap = new Map<string, number>()
  const visitorSeen = new Map<string, string>()
  for (const event of pageViews) {
    const attr = pickAttribution(event, mode)
    const label = classifyTrafficSource(attr.source, attr.medium, event.referrer)
    const prior = visitorSeen.get(event.visitor_id)
    if (prior === label) continue
    visitorSeen.set(event.visitor_id, label)
    sourceMap.set(label, (sourceMap.get(label) ?? 0) + 1)
  }

  const trafficSources = [...sourceMap.entries()]
    .map(([label, visitors]) => ({ label, visitors }))
    .sort((a, b) => b.visitors - a.visitors)

  return {
    uniqueVisitors,
    sessions,
    pageViews: pageViews.length,
    conversionEvents: conversionEvents.length,
    convertedVisitors,
    conversionRate,
    topCampaign,
    campaignRows,
    trafficSources,
  }
}
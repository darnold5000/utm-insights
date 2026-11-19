export function isAnalyticsBackendConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  )
}

export const CONVERSION_EVENT_TYPES = [
  "signup_completed",
  "lead_submitted",
  "gym_interest_submitted",
  "booking_completed",
  "purchase_completed",
  "contact_form_submitted",
  "demo_requested",
  "registration_completed",
  "recruiting_interest_submitted",
] as const

export type ConversionEventType = (typeof CONVERSION_EVENT_TYPES)[number]

export const PUBLIC_EVENT_TYPES = ["page_view", ...CONVERSION_EVENT_TYPES] as const

export type PublicEventType = (typeof PUBLIC_EVENT_TYPES)[number]

export function isPublicEventType(value: string): value is PublicEventType {
  return (PUBLIC_EVENT_TYPES as readonly string[]).includes(value)
}

export function isConversionEventType(value: string): value is ConversionEventType {
  return (CONVERSION_EVENT_TYPES as readonly string[]).includes(value)
}

/** Client-reported conversions; server-signed conversions use the server route. */
export const CLIENT_ALLOWED_CONVERSIONS = new Set<string>([
  "page_view",
  "lead_submitted",
  "contact_form_submitted",
  "gym_interest_submitted",
  "recruiting_interest_submitted",
])
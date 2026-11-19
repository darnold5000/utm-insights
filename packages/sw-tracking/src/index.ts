export type SwTrackingOptions = {
  projectKey: string
  apiUrl: string
  /** Respect user opt-out (e.g. analytics consent cookie). */
  consent?: () => boolean
  /** Default true in browser apps. */
  trackNavigation?: boolean
}

export type SwConversionEvent = {
  eventType: string
  eventId?: string
}

type TouchUtm = {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

type AttributionState = {
  visitorId: string
  sessionId: string
  landingPage: string
  referrer: string | null
  firstTouch: TouchUtm
  lastTouch: TouchUtm
  expiresAt: number
}

const VISITOR_KEY = "sw_track_visitor_id"
const SESSION_KEY = "sw_track_session_id"
const ATTR_KEY = "sw_track_attribution"
const ATTR_TTL_MS = 1000 * 60 * 60 * 24 * 90

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore quota / privacy mode
  }
}

function parseUtm(search: string): TouchUtm | null {
  const params = new URLSearchParams(search)
  const source = params.get("utm_source")
  const medium = params.get("utm_medium")
  const campaign = params.get("utm_campaign")
  const content = params.get("utm_content")
  const term = params.get("utm_term")
  const hasCampaign = Boolean(source || medium || campaign || content || term)
  if (!hasCampaign) return null
  return {
    utmSource: source,
    utmMedium: medium,
    utmCampaign: campaign,
    utmContent: content,
    utmTerm: term,
  }
}

function touchFromDirect(): TouchUtm {
  return {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
  }
}

export class SwTracking {
  private options: SwTrackingOptions
  private lastPath: string | null = null
  private initialized = false

  constructor(options: SwTrackingOptions) {
    this.options = options
  }

  init() {
    if (typeof window === "undefined" || this.initialized) return
    this.initialized = true
    this.ensureAttribution()
    if (this.options.trackNavigation !== false) {
      this.trackPageView()
      this.lastPath = `${window.location.pathname}${window.location.search}`
    }
  }

  private hasConsent() {
    return this.options.consent ? this.options.consent() : true
  }

  private ensureAttribution() {
    let visitorId = readStorage(VISITOR_KEY)
    if (!visitorId) {
      visitorId = uuid()
      writeStorage(VISITOR_KEY, visitorId)
    }

    let sessionId = readStorage(SESSION_KEY)
    if (!sessionId) {
      sessionId = uuid()
      writeStorage(SESSION_KEY, sessionId)
    }

    const now = Date.now()
    const raw = readStorage(ATTR_KEY)
    let state: AttributionState | null = null
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AttributionState
        if (parsed.expiresAt > now) state = parsed
      } catch {
        state = null
      }
    }

    const incoming = parseUtm(window.location.search)
    const landingPage = `${window.location.pathname}${window.location.search}`
    const referrer = document.referrer || null

    if (!state) {
      const first = incoming ?? touchFromDirect()
      state = {
        visitorId,
        sessionId,
        landingPage,
        referrer,
        firstTouch: first,
        lastTouch: incoming ?? first,
        expiresAt: now + ATTR_TTL_MS,
      }
      writeStorage(ATTR_KEY, JSON.stringify(state))
      return
    }

    state.visitorId = visitorId
    state.sessionId = sessionId

    if (incoming) {
      state.lastTouch = incoming
      state.expiresAt = now + ATTR_TTL_MS
    }

    writeStorage(ATTR_KEY, JSON.stringify(state))
  }

  private readAttribution(): AttributionState | null {
    const raw = readStorage(ATTR_KEY)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as AttributionState
      if (parsed.expiresAt <= Date.now()) return null
      return parsed
    } catch {
      return null
    }
  }

  private async send(payload: Record<string, unknown>) {
    if (!this.hasConsent()) return
    await fetch(this.options.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: "cors",
    }).catch(() => {
      // fire-and-forget
    })
  }

  async trackPageView() {
    if (typeof window === "undefined" || !this.hasConsent()) return
    this.ensureAttribution()
    const attr = this.readAttribution()
    if (!attr) return

    const path = `${window.location.pathname}${window.location.search}`
    if (this.lastPath === path) return
    this.lastPath = path

    const eventId = `pv:${attr.sessionId}:${path}`
    await this.send({
      projectKey: this.options.projectKey,
      eventId,
      visitorId: attr.visitorId,
      sessionId: attr.sessionId,
      eventType: "page_view",
      occurredAt: new Date().toISOString(),
      pagePath: window.location.href,
      landingPage: attr.landingPage,
      referrer: attr.referrer,
      utmSource: attr.lastTouch.utmSource,
      utmMedium: attr.lastTouch.utmMedium,
      utmCampaign: attr.lastTouch.utmCampaign,
      utmContent: attr.lastTouch.utmContent,
      utmTerm: attr.lastTouch.utmTerm,
      firstTouch: {
        utmSource: attr.firstTouch.utmSource,
        utmMedium: attr.firstTouch.utmMedium,
        utmCampaign: attr.firstTouch.utmCampaign,
        utmContent: attr.firstTouch.utmContent,
        utmTerm: attr.firstTouch.utmTerm,
      },
      lastTouch: {
        utmSource: attr.lastTouch.utmSource,
        utmMedium: attr.lastTouch.utmMedium,
        utmCampaign: attr.lastTouch.utmCampaign,
        utmContent: attr.lastTouch.utmContent,
        utmTerm: attr.lastTouch.utmTerm,
      },
    })
  }

  async trackEvent(event: SwConversionEvent) {
    if (typeof window === "undefined" || !this.hasConsent()) return
    this.ensureAttribution()
    const attr = this.readAttribution()
    if (!attr) return

    await this.send({
      projectKey: this.options.projectKey,
      eventId: event.eventId,
      visitorId: attr.visitorId,
      sessionId: attr.sessionId,
      eventType: event.eventType,
      occurredAt: new Date().toISOString(),
      pagePath: window.location.href,
      landingPage: attr.landingPage,
      referrer: attr.referrer,
      utmSource: attr.lastTouch.utmSource,
      utmMedium: attr.lastTouch.utmMedium,
      utmCampaign: attr.lastTouch.utmCampaign,
      utmContent: attr.lastTouch.utmContent,
      utmTerm: attr.lastTouch.utmTerm,
      firstTouch: {
        utmSource: attr.firstTouch.utmSource,
        utmMedium: attr.firstTouch.utmMedium,
        utmCampaign: attr.firstTouch.utmCampaign,
        utmContent: attr.firstTouch.utmContent,
        utmTerm: attr.firstTouch.utmTerm,
      },
      lastTouch: {
        utmSource: attr.lastTouch.utmSource,
        utmMedium: attr.lastTouch.utmMedium,
        utmCampaign: attr.lastTouch.utmCampaign,
        utmContent: attr.lastTouch.utmContent,
        utmTerm: attr.lastTouch.utmTerm,
      },
    })
  }
}

export function createSwTracking(options: SwTrackingOptions) {
  return new SwTracking(options)
}
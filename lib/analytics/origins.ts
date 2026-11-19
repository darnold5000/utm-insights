export function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.origin
  } catch {
    return null
  }
}

export function hostFromUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return null
  }
}

export function destinationAllowed(destination: string, websiteDomain: string, allowedOrigins: string[]) {
  let hostname: string | null = null
  try {
    hostname = new URL(destination).hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    return false
  }
  const domain = websiteDomain.replace(/^www\./, "").toLowerCase()
  if (hostname === domain || hostname.endsWith(`.${domain}`)) return true
  const allowedHosts = new Set(
    allowedOrigins
      .map((origin) => hostFromUrl(origin))
      .filter((item): item is string => Boolean(item)),
  )
  return allowedHosts.has(hostname)
}

export function eventOriginAllowed(
  pagePath: string | null | undefined,
  referrer: string | null | undefined,
  requestOrigin: string | null | undefined,
  allowedOrigins: string[],
) {
  const allowed = new Set(allowedOrigins.map((o) => normalizeOrigin(o)).filter(Boolean) as string[])

  if (requestOrigin && allowed.has(requestOrigin)) return true

  const pageOrigin = pagePath ? normalizeOrigin(pagePath) : null
  if (pageOrigin && allowed.has(pageOrigin)) return true

  const refHost = hostFromUrl(referrer)
  const allowedHosts = new Set(
    [...allowed].map((origin) => hostFromUrl(origin)).filter((h): h is string => Boolean(h)),
  )
  if (refHost && allowedHosts.has(refHost)) return true

  // Landing URLs may be path-only; allow if any allowed origin shares host with page URL.
  if (pagePath?.startsWith("/")) {
    return allowed.size > 0
  }

  return false
}
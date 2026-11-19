# Integrating product sites

Copy `packages/sw-tracking/src/index.ts` into each Next.js app (or import from this repo once published).

## 1. Environment

```env
NEXT_PUBLIC_SW_ANALYTICS_URL=https://your-analytics-app.vercel.app/api/v1/events
NEXT_PUBLIC_SW_PROJECT_KEY=pk_mdl_dev_seed_001
```

Use the `public_key` from `sw_projects` for that product.

## 2. Initialize once

```tsx
// app/providers.tsx
"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { createSwTracking } from "@/lib/sw-tracking"

const tracking = createSwTracking({
  projectKey: process.env.NEXT_PUBLIC_SW_PROJECT_KEY!,
  apiUrl: process.env.NEXT_PUBLIC_SW_ANALYTICS_URL!,
  consent: () => true, // wire to your cookie banner
})

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    tracking.init()
  }, [])

  useEffect(() => {
    void tracking.trackPageView()
  }, [pathname])

  return children
}
```

Wrap your root layout with `TrackingProvider`.

## 3. Conversion events (client)

Fire only after a **completed** action succeeds (not on button click).

### MeetDayLive

```ts
await tracking.trackEvent({
  eventType: "signup_completed",
  eventId: `signup:${userId}`,
})
```

```ts
await tracking.trackEvent({
  eventType: "gym_interest_submitted",
  eventId: `gym-interest:${submissionId}`,
})
```

`signup_completed` and paid events should use the **server** endpoint with the project bearer secret (see SETUP.md).

### CoachSlate

```ts
await tracking.trackEvent({
  eventType: "registration_completed",
  eventId: `registration:${userId}`,
})
```

```ts
await tracking.trackEvent({
  eventType: "recruiting_interest_submitted",
  eventId: `recruit:${submissionId}`,
})
```

### Signal Works

```ts
await tracking.trackEvent({
  eventType: "contact_form_submitted",
  eventId: `contact:${messageId}`,
})
```

```ts
await tracking.trackEvent({
  eventType: "demo_requested",
  eventId: `demo:${requestId}`,
})
```

## 4. Server-side conversions

```ts
await fetch("https://your-analytics-app.vercel.app/api/v1/events/server", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.SW_ANALYTICS_PROJECT_SECRET}`,
  },
  body: JSON.stringify({
    projectKey: process.env.SW_ANALYTICS_PROJECT_KEY,
    eventType: "purchase_completed",
    eventId: `purchase:${paymentIntentId}`,
    visitorId, // from your session if available
    sessionId,
    firstTouch: { ... },
    lastTouch: { ... },
  }),
})
```

## Attribution behavior

- First-touch UTMs are stored for 90 days in `localStorage` on each site.
- A new campaign in the URL updates last-touch only; direct return visits do not clear first-touch.
- Page views dedupe per session + path.
- No cross-domain cookies; each app keeps its own visitor ID.
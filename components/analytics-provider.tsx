"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { AnalyticsSummary, AnalyticsRangeDays, AttributionMode, DbProject, DbSavedLink } from "@/lib/analytics/queries"

type AnalyticsContextValue = {
  projects: DbProject[]
  projectId: string
  setProjectId: (id: string) => void
  days: AnalyticsRangeDays
  setDays: (days: AnalyticsRangeDays) => void
  attribution: AttributionMode
  setAttribution: (mode: AttributionMode) => void
  conversionFilter: string
  setConversionFilter: (value: string) => void
  summary: AnalyticsSummary | null
  links: DbSavedLink[]
  loading: boolean
  refresh: () => Promise<void>
  saveLink: (input: {
    projectId: string
    name: string
    destinationUrl: string
    utmSource: string
    utmMedium: string
    utmContent?: string | null
    utmTerm?: string | null
    linkType?: string
  }) => Promise<{ trackedUrl: string } | { error: string }>
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<DbProject[]>([])
  const [projectId, setProjectId] = useState("all")
  const [days, setDays] = useState<AnalyticsRangeDays>(30)
  const [attribution, setAttribution] = useState<AttributionMode>("first_touch")
  const [conversionFilter, setConversionFilter] = useState("all")
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [links, setLinks] = useState<DbSavedLink[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [projectsRes, summaryRes, linksRes] = await Promise.all([
        fetch("/api/projects"),
        fetch(
          `/api/analytics/summary?projectId=${encodeURIComponent(projectId)}&days=${days}&attribution=${attribution}&conversion=${encodeURIComponent(conversionFilter)}`,
        ),
        fetch(`/api/links?projectId=${encodeURIComponent(projectId)}`),
      ])

      if (projectsRes.ok) {
        const body = (await projectsRes.json()) as { projects: DbProject[] }
        setProjects(body.projects ?? [])
      }
      if (summaryRes.ok) {
        const body = (await summaryRes.json()) as { summary: AnalyticsSummary }
        setSummary(body.summary ?? null)
      } else {
        setSummary(null)
      }
      if (linksRes.ok) {
        const body = (await linksRes.json()) as { links: DbSavedLink[] }
        setLinks(body.links ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, days, attribution, conversionFilter])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveLink = useCallback(
    async (input: Parameters<AnalyticsContextValue["saveLink"]>[0]) => {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      const body = (await res.json()) as { trackedUrl?: string; error?: string }
      if (!res.ok) return { error: body.error ?? "Failed to save link." }
      await refresh()
      return { trackedUrl: body.trackedUrl ?? "" }
    },
    [refresh],
  )

  const value = useMemo(
    () => ({
      projects,
      projectId,
      setProjectId,
      days,
      setDays,
      attribution,
      setAttribution,
      conversionFilter,
      setConversionFilter,
      summary,
      links,
      loading,
      refresh,
      saveLink,
    }),
    [
      projects,
      projectId,
      days,
      attribution,
      conversionFilter,
      summary,
      links,
      loading,
      refresh,
      saveLink,
    ],
  )

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext)
  if (!ctx) throw new Error("useAnalytics must be used within AnalyticsProvider")
  return ctx
}
"use client"

import { useAnalytics } from "@/components/analytics-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CONVERSION_EVENT_TYPES } from "@/lib/analytics/config"
import { formatDay, formatNumber, formatPercent, formatTimestamp } from "@/lib/format"

const RANGE_ITEMS: Record<string, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
}

const ATTRIBUTION_ITEMS: Record<string, string> = {
  first_touch: "First touch",
  last_touch: "Last touch",
}

export function LiveDashboardView() {
  const {
    summary,
    loading,
    days,
    setDays,
    attribution,
    setAttribution,
    conversionFilter,
    setConversionFilter,
    projectId,
    projects,
  } = useAnalytics()

  const projectName =
    projectId === "all" ? "All Projects" : (projects.find((p) => p.id === projectId)?.name ?? "Project")

  const conversionItems: Record<string, string> = { all: "All conversion types" }
  for (const type of CONVERSION_EVENT_TYPES) {
    conversionItems[type] = type.replace(/_/g, " ")
  }

  if (loading && !summary) {
    return <p className="text-sm text-muted-foreground">Loading analytics…</p>
  }

  const s = summary ?? {
    uniqueVisitors: 0,
    sessions: 0,
    pageViews: 0,
    conversionEvents: 0,
    convertedVisitors: 0,
    conversionRate: null,
    topCampaign: null,
    rangeStart: "",
    rangeEnd: "",
    campaignRows: [],
    trafficSources: [],
    activity: [],
  }
  const windowLabel =
    s.rangeStart && s.rangeEnd
      ? `${formatDay(s.rangeStart.slice(0, 10))} – ${formatDay(s.rangeEnd.slice(0, 10))}`
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Campaign dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {projectName}
            {windowLabel ? ` · ${windowLabel}` : ""}. Live data from the centralized tracking API.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={String(days)}
            onValueChange={(v) => setDays(Number(v) as 7 | 30 | 90)}
            items={RANGE_ITEMS}
          >
            <SelectTrigger className="w-[160px] bg-white" aria-label="Date range">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={attribution}
            onValueChange={(v) => setAttribution(v === "last_touch" ? "last_touch" : "first_touch")}
            items={ATTRIBUTION_ITEMS}
          >
            <SelectTrigger className="w-[150px] bg-white" aria-label="Attribution model">
              <SelectValue placeholder="First touch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_touch">First touch</SelectItem>
              <SelectItem value="last_touch">Last touch</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={conversionFilter}
            onValueChange={(v) => setConversionFilter(v ?? "all")}
            items={conversionItems}
          >
            <SelectTrigger className="w-[220px] bg-white" aria-label="Conversion event type">
              <SelectValue placeholder="All conversion types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conversion types</SelectItem>
              {CONVERSION_EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Unique visitors" value={formatNumber(s.uniqueVisitors)} />
        <MetricCard title="Sessions" value={formatNumber(s.sessions)} />
        <MetricCard title="Page views" value={formatNumber(s.pageViews)} />
        <MetricCard title="Conversion events" value={formatNumber(s.conversionEvents)} />
        <MetricCard title="Converted visitors" value={formatNumber(s.convertedVisitors)} />
        <MetricCard
          title="Visitor → conversion rate"
          value={s.conversionRate == null ? "—" : formatPercent(s.conversionRate)}
        />
        <MetricCard title="Top campaign" value={s.topCampaign ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign performance</CardTitle>
          <CardDescription>Grouped by UTM campaign, source, medium, and content.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Last seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.campaignRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No campaign data in this range yet.
                  </TableCell>
                </TableRow>
              ) : (
                s.campaignRows.map((row) => (
                  <TableRow key={`${row.campaign}-${row.source}-${row.medium}-${row.content}`}>
                    <TableCell className="font-medium">{row.campaign}</TableCell>
                    <TableCell>{row.source ?? "—"}</TableCell>
                    <TableCell>{row.medium ?? "—"}</TableCell>
                    <TableCell>{row.content ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.visitors)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.views)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.conversions)}</TableCell>
                    <TableCell className="text-right">
                      {row.rate == null ? "—" : formatPercent(row.rate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.firstSeen ? formatTimestamp(row.firstSeen) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.lastSeen ? formatTimestamp(row.lastSeen) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Newest events in this range, with the page and referrer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Campaign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.activity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No events in this range yet.
                  </TableCell>
                </TableRow>
              ) : (
                s.activity.map((row, index) => (
                  <TableRow key={`${row.occurredAt}-${row.eventType}-${index}`}>
                    <TableCell className="whitespace-nowrap">{formatTimestamp(row.occurredAt)}</TableCell>
                    <TableCell>{row.eventType.replace(/_/g, " ")}</TableCell>
                    <TableCell className="max-w-[280px] truncate" title={row.page}>
                      {row.page}
                    </TableCell>
                    <TableCell>{row.referrer ?? "—"}</TableCell>
                    <TableCell>{row.campaign ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Traffic sources</CardTitle>
          <CardDescription>From UTM parameters and referrer data — unattributed traffic is not labeled as social.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.trafficSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No traffic yet.
                  </TableCell>
                </TableRow>
              ) : (
                s.trafficSources.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.visitors)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
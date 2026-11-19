"use client"

import { useMemo, useState } from "react"
import { QrCode } from "@/components/qr-code"
import { useAnalytics } from "@/components/analytics-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { buildTrackedUrl, mediumForLink, slugify } from "@/lib/traffic"
import type { LinkType, Source } from "@/lib/types"
import { LINK_SOURCES, SOURCE_META } from "@/lib/labels"
import { LINK_TYPES } from "@/lib/traffic"

export function LiveLinksView() {
  const { projects, projectId, setProjectId, links, saveLink } = useAnalytics()
  const selectedProject = projects.find((p) => p.id === projectId) ?? projects[0] ?? null

  const [destination, setDestination] = useState("")
  const [name, setName] = useState("")
  const [source, setSource] = useState<Source>("facebook")
  const [linkType, setLinkType] = useState<LinkType>("organic")
  const [content, setContent] = useState("")
  const [term, setTerm] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const medium = mediumForLink(source, linkType)
  const trackedUrl = useMemo(() => {
    if (!destination.trim() || !name.trim()) return ""
    return buildTrackedUrl({
      destination: destination.startsWith("http") ? destination : `https://${destination}`,
      source,
      medium,
      campaign: slugify(name),
      content: content.trim() || null,
    })
  }, [destination, name, source, medium, content])

  async function onSave() {
    if (!selectedProject || projectId === "all") {
      setError("Select a project before saving a link.")
      return
    }
    setError(null)
    const result = await saveLink({
      projectId: selectedProject.id,
      name: name.trim(),
      destinationUrl: destination.trim(),
      utmSource: source,
      utmMedium: medium,
      utmContent: content.trim() || null,
      utmTerm: term.trim() || null,
      linkType,
    })
    if ("error" in result) {
      setError(result.error)
      return
    }
    setPreviewUrl(result.trackedUrl)
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const sourceItems = Object.fromEntries(LINK_SOURCES.map((s) => [s, SOURCE_META[s].label]))
  const typeItems = Object.fromEntries(LINK_TYPES.map((t) => [t.id, t.label]))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Campaign links</h1>
        <p className="text-sm text-muted-foreground">Build tracked URLs and QR codes per product.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign link generator</CardTitle>
          <CardDescription>
            Destination must match the selected project&apos;s configured domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Project</Label>
            <Select
              value={projectId === "all" ? (selectedProject?.id ?? "") : projectId}
              onValueChange={(v) => setProjectId(v ?? "all")}
              items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
            >
              <SelectTrigger className="w-full bg-white" aria-label="Project">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="destination">Destination URL</Label>
            <Input
              id="destination"
              placeholder={selectedProject ? `https://${selectedProject.website_domain}/` : "https://"}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={(v) => setSource(v as Source)} items={sourceItems}>
              <SelectTrigger className="w-full bg-white" aria-label="UTM source">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {LINK_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SOURCE_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Medium (via link type)</Label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)} items={typeItems}>
              <SelectTrigger className="w-full bg-white" aria-label="Link type">
                <SelectValue placeholder="Link type" />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Resolved medium: {medium}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Content identifier</Label>
            <Input
              id="content"
              placeholder="plainfield_parent_post"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="term">Term (optional)</Label>
            <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>

          {trackedUrl ? (
            <div className="md:col-span-2 rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
              <p className="break-all font-mono text-sm">{trackedUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void copyUrl(trackedUrl)}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <QrCode value={trackedUrl} />
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2 flex gap-2">
            <Button type="button" onClick={() => void onSave()}>
              Save to database
            </Button>
            {previewUrl ? (
              <p className="self-center text-xs text-muted-foreground">Last saved URL ready to share.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saved links</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Content</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No saved links for this filter.
                  </TableCell>
                </TableRow>
              ) : (
                links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell>{link.utm_source}</TableCell>
                    <TableCell>{link.utm_medium}</TableCell>
                    <TableCell>{link.utm_content ?? "—"}</TableCell>
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

"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAnalytics } from "@/components/analytics-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { cn } from "cn"

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/links", label: "Links" },
]

export function LiveAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { projects, projectId, setProjectId } = useAnalytics()

  async function signOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const projectItems: Record<string, string> = { all: "All Projects" }
  for (const project of projects) projectItems[project.id] = project.name

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 bg-[#0c0d10] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#0057ff] text-xs font-semibold">SW</span>
            <span>
              <span className="block text-sm font-semibold leading-tight">Signal Works Digital</span>
              <span className="block text-xs text-white/60">Centralized campaign analytics</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium",
                    active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
            <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "all")} items={projectItems}>
              <SelectTrigger className="w-[200px] border-white/20 bg-white/10 text-white" />
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="border-white/30 bg-transparent text-white" onClick={() => void signOut()}>
              Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">{children}</main>
    </div>
  )
}
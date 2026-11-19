import { type NextRequest, NextResponse } from "next/server"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"
import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/login", "/auth", "/lp", "/visit", "/api/v1/events"]

function isPublicPath(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true
  if (pathname.startsWith("/api/v1/events")) return true
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)

  if (!isAnalyticsBackendConfigured()) return response

  const { pathname } = request.nextUrl
  if (
    pathname.startsWith("/leads") ||
    pathname.startsWith("/simulator") ||
    pathname.startsWith("/visit") ||
    pathname.match(/^\/links\/[^/]+$/)
  ) {
    const dash = request.nextUrl.clone()
    dash.pathname = "/"
    return NextResponse.redirect(dash)
  }
  if (isPublicPath(pathname)) return response

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const { createServerClient } = await import("@supabase/ssr")
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const login = request.nextUrl.clone()
    login.pathname = "/login"
    login.searchParams.set("next", pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
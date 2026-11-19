import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config"

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service role is not configured.")
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function createAuthServerClient() {
  if (!isAnalyticsBackendConfigured()) {
    throw new Error("Supabase auth is not configured.")
  }
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a Server Component; middleware refreshes sessions.
          }
        },
      },
    },
  )
}

export async function getSessionUser() {
  const supabase = await createAuthServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function isDashboardAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("sw_project_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()
  return !error && Boolean(data)
}
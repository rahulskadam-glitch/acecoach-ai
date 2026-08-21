import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";

const protectedPrefixes = [
  "/analysis",
  "/coach",
  "/dashboard",
  "/feedback",
  "/home",
  "/library",
  "/practice",
  "/profile",
  "/progress",
  "/report",
  "/settings",
  "/start",
  "/support",
  "/upload",
];
const authRoutes = ["/login", "/signup", "/forgot-password", "/signup/success"];

// Mirrors visualQaEnabled() in @/lib/supabase/server, duplicated here (not imported)
// so this file stays free of the `next/headers` import that function's module pulls
// in, which isn't guaranteed safe in the Edge Middleware runtime. These three routes
// each independently check the same condition plus an exact "visual-qa" id before
// rendering without a real session — middleware must not redirect them to /login first.
function isVisualQaBypassRoute(pathname: string) {
  const isDevQaBuild = process.env.NODE_ENV !== "production" && process.env.ACECOACH_VISUAL_QA === "true";
  if (!isDevQaBuild) return false;
  return pathname === "/report/visual-qa" || pathname === "/analysis/visual-qa" || pathname === "/coach/visual-qa";
}

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Apply cookies to the request first
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Rebuild response preserving existing headers, then apply cookies
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser validates the token with Supabase and refreshes the session when needed.
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  // If Supabase is unreachable, let the request through rather than locking everyone out.
  if (getUserError && getUserError.message !== "Auth session missing!") {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) && !isVisualQaBypassRoute(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && authRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

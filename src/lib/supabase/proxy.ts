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
  );

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

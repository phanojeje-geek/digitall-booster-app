import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessRoute } from "@/lib/rbac";
import { isDemoMode } from "@/lib/runtime";
import type { Role } from "@/lib/types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const protectedPath = request.nextUrl.pathname.startsWith("/app");
  const authPath = ["/login", "/signup"].includes(request.nextUrl.pathname);

  if (isDemoMode) {
    if (protectedPath) {
      const demoRole =
        (request.cookies.get("demo_role")?.value as Role | undefined) ??
        ((process.env.NEXT_PUBLIC_DEMO_ROLE as Role | undefined) ?? "admin");
      if (!canAccessRoute(demoRole, request.nextUrl.pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = "/app";
        url.searchParams.set("forbidden", "1");
        return NextResponse.redirect(url);
      }
    }
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (protectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (authPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  if (protectedPath && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role,is_blocked")
      .eq("id", user.id)
      .single();

    const role = (profile?.role as Role | undefined) ?? "dev";
    if (profile?.is_blocked) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("blocked", "1");
      return NextResponse.redirect(url);
    }
    if (!canAccessRoute(role, request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/app";
      url.searchParams.set("forbidden", "1");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionProblem } from "@/lib/auth";

// First line of defence for /admin. Every admin page and action also calls requireAdmin().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/") || pathname.startsWith("/admin/login.")) {
    return NextResponse.next();
  }
  const problem = sessionProblem(request.cookies.get(SESSION_COOKIE)?.value);
  if (problem) {
    if (process.env.NODE_ENV !== "production") console.warn(`[admin-auth] proxy blocked ${pathname}: ${problem}`);
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

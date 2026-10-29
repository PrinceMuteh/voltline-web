import { NextResponse, type NextRequest } from "next/server";

const REFRESH_COOKIE = "vl_refresh";
const SIGN_IN = "/console/sign-in";

/**
 * Optimistic check only: it looks for the refresh cookie and never validates it.
 * voltline-api decides on every request; an expired session is caught there.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  if (pathname === SIGN_IN) {
    return hasSession
      ? NextResponse.redirect(new URL("/console", request.url))
      : NextResponse.next();
  }
  if (!hasSession) {
    const url = new URL(SIGN_IN, request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/console", "/console/:path*"],
};

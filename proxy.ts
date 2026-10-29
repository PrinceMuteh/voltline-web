import { NextResponse, type NextRequest } from "next/server";

const REFRESH_COOKIE = "vl_refresh";
const DRIVER_COOKIE = "vl_driver";
const SIGN_IN = "/console/sign-in";
const APP_WELCOME = "/app/welcome";

/**
 * Optimistic check only: it looks for the refresh cookie and never validates it.
 * voltline-api decides on every request; an expired session is caught there.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Driver app: anything but the welcome flow needs a driver sign-in
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const signedIn = request.cookies.has(DRIVER_COOKIE);
    // A charger's QR code holds /app/c/{chargePointId}: open its confirm sheet
    const charger = /^\/app\/c\/([^/]+)$/.exec(pathname);
    if (charger && signedIn) {
      const url = new URL("/app/scan", request.url);
      url.searchParams.set("code", decodeURIComponent(charger[1]));
      return NextResponse.redirect(url);
    }
    if (!signedIn && !pathname.startsWith(APP_WELCOME)) {
      const url = new URL(APP_WELCOME, request.url);
      if (charger) url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

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
  matcher: ["/console", "/console/:path*", "/app", "/app/:path*"],
};

import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only ever talks to this origin, so voltline-api's httpOnly
  // auth cookies are first-party and no CORS preflight is needed.
  async rewrites() {
    // The backend-free demo answers /api calls in the browser, so there is nothing to proxy
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return [];
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;

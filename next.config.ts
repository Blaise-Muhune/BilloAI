import type { NextConfig } from "next";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const privateSources = [
  "/home",
  "/home/:path*",
  "/people",
  "/people/:path*",
  "/events",
  "/events/:path*",
  "/capture",
  "/capture/:path*",
  "/tasks",
  "/tasks/:path*",
  "/profile",
  "/profile/:path*",
  "/account",
  "/account/:path*",
  "/billing",
  "/billing/:path*",
  "/onboarding",
  "/onboarding/:path*",
  "/join",
  "/join/:path*",
  "/group",
  "/group/:path*",
  "/team",
  "/team/:path*",
  "/organizer",
  "/organizer/:path*",
  "/auth/:path*",
  "/login",
  "/login/:path*",
  "/signup",
  "/signup/:path*",
  "/api/:path*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  async redirects() {
    return [
      { source: "/organizer", destination: "/group", permanent: false },
      {
        source: "/",
        has: [{ type: "host", value: "www.billoai.com" }],
        destination: "https://billoai.com/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.billoai.com" }],
        destination: "https://billoai.com/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/__/auth/action", destination: "/auth/action" },
      { source: "/ai.txt", destination: "/llms.txt" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "geolocation=(), browsing-topics=()" },
        ],
      },
      ...privateSources.map((source) => ({ source, headers: noindex })),
    ];
  },
};

export default nextConfig;

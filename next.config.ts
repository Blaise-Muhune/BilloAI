import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  async redirects() {
    return [{ source: "/organizer", destination: "/group", permanent: false }];
  },
};

export default nextConfig;

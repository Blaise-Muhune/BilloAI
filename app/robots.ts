import type { MetadataRoute } from "next";
import { SEO_INDEX, SITE_URL } from "@/lib/seo";

const privatePaths = [
  "/home",
  "/people",
  "/people/",
  "/events",
  "/events/",
  "/capture",
  "/tasks",
  "/profile",
  "/account",
  "/billing",
  "/onboarding",
  "/join",
  "/group",
  "/team",
  "/organizer",
  "/admin",
  "/auth/",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  if (!SEO_INDEX) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "Google-Extended", "anthropic-ai", "ClaudeBot", "PerplexityBot", "CCBot"],
        allow: ["/", "/for-organizers", "/for-teams", "/contact", "/privacy", "/terms", "/llms.txt", "/llms-full.txt"],
        disallow: privatePaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

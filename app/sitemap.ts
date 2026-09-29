import type { MetadataRoute } from "next";
import { SEO_INDEX, SITE_CONTENT_UPDATED, absoluteUrl } from "@/lib/seo";

const pages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/for-organizers", changeFrequency: "monthly", priority: 0.8 },
  { path: "/for-teams", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SEO_INDEX) return [];
  return pages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: SITE_CONTENT_UPDATED,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

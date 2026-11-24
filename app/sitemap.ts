import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";

// Read NEXT_PUBLIC_APP_URL / VERCEL_* at request time (Docker images are built without them).
export const dynamic = "force-dynamic";

/** Public, indexable pages only (the dashboard is private and marked noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl();
  const lastModified = new Date();
  return [
    { url: `${baseUrl}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/docs`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}

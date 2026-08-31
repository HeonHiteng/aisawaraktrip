import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${site.url}/`, lastModified: now, priority: 1 },
    { url: `${site.url}/login`, lastModified: now, priority: 0.5 },
    { url: `${site.url}/register`, lastModified: now, priority: 0.5 },
    { url: `${site.url}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${site.url}/terms`, lastModified: now, priority: 0.3 },
  ];
}

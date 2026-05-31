import type { MetadataRoute } from "next";
import { canonicalRoutes, canonicalUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return canonicalRoutes.map((route) => ({
    url: canonicalUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}

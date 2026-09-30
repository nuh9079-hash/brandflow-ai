import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://brandflow-rocket-preview.vercel.app/", priority: 1 }];
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Lets the dev server be opened from other devices on the LAN.
  allowedDevOrigins: ["192.168.*.*"],
  partialPrefetching: true,
  experimental: {
    // admin image uploads (one image per request, max 8 MB)
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;

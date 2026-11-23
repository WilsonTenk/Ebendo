import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Product photos taken on phones are often 2–4 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;

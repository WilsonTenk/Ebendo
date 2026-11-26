import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vercel caps request bodies at 4.5 MB. Product photos are shrunk in the
    // browser (~200–400 KB each) before upload, so 4 photos fit easily.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Needed for the local /vehicles/placeholder-*.svg fallback images.
    dangerouslyAllowSVG: true,
    remotePatterns: [
      // Square-hosted catalog item images.
      { protocol: "https", hostname: "*.squarecdn.com" },
      { protocol: "https", hostname: "items-images-*.s3.*.amazonaws.com" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  transpilePackages: ["@inmoai/api"],
  typescript: {
    // Skip type checking during build - run tsc separately
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

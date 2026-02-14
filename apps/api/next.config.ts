import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  // Ignore ESLint warnings during build (handled separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.idealista.com',
      },
      {
        protocol: 'https',
        hostname: '*.fotocasa.es',
      },
    ],
  },
};

export default nextConfig;

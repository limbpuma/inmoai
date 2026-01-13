import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
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

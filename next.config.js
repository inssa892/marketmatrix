/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.ignoreWarnings = [{ module: /@supabase\/realtime-js/ }];
    return config;
  },
  images: {
    domains: ["fcempygvfykaxytifbop.supabase.co", "images.unsplash.com"],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60, // cache des images côté Next.js
  },
  experimental: {
    appDir: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
  redirects: async () => [
    {
      source: "/old-route",
      destination: "/new-route",
      permanent: true,
    },
  ],
};

module.exports = nextConfig;

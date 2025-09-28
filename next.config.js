// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // pour ignorer les erreurs ESLint pendant le build
  },
  images: {
    domains: ["fcempygvfykaxytifbop.supabase.co"], // ajouter ton domaine Supabase
  },
};

module.exports = nextConfig;

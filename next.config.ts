import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  serverExternalPackages: ['canvg', 'pdfjs-dist'],
};

export default nextConfig;

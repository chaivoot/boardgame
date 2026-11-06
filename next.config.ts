import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Served at the root of boardgame.chaivoot.com. Old /boardgame/... links still work.
  async redirects() {
    return [
      { source: "/boardgame", destination: "/", permanent: false },
      { source: "/boardgame/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default nextConfig;

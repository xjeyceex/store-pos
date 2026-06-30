import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/adapter-better-sqlite3", "better-sqlite3"],
  // Next.js dev server starts on localhost but is also reachable via LAN IP.
  // Without this, client JS / HMR / server actions break when opened at 192.168.x.x.
  allowedDevOrigins: ["192.168.99.26", "192.168.*"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "192.168.99.26:3000",
        "192.168.*:3000",
        "localhost:3001",
        "127.0.0.1:3001",
        "192.168.99.26:3001",
        "192.168.*:3001",
      ],
    },
  },
};

export default nextConfig;

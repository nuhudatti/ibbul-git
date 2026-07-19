import type { NextConfig } from "next";
import path from "path";

/** Monorepo root — hoisted deps (e.g. qrcode) live in ../../node_modules */
const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ["qrcode"],
};

export default nextConfig;

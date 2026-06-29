import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, "../..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.9", "127.0.0.1"],
  reactCompiler: true,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;

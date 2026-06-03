import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(appRoot, "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.100.9", "127.0.0.1"],
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;

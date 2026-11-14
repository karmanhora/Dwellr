import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @dwellr/core ships TypeScript source so web and (later) Expo share one implementation.
  transpilePackages: ["@dwellr/core"],
  poweredByHeader: false,
};

export default nextConfig;

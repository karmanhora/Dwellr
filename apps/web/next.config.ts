import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @dwellr/core ships TypeScript source so web and (later) Expo share one implementation.
  transpilePackages: ["@dwellr/core"],
  poweredByHeader: false,
  // Playwright and the preview panel load the dev server over 127.0.0.1 rather
  // than localhost; without this, Next blocks its own HMR resources.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Property photos and avatars are served from Supabase Storage's public
    // object endpoint. Uploads are content-checked and size-limited by the
    // bucket, so the optimiser only ever sees our own images.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;

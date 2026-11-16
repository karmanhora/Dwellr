import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @hauscrawl/core ships TypeScript source so web and (later) Expo share one implementation.
  transpilePackages: ["@hauscrawl/core"],
  poweredByHeader: false,
  // Playwright and the preview panel load the dev server over 127.0.0.1 rather
  // than localhost; without this, Next blocks its own HMR resources.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/waitlist/status/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/waitlist/confirm",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
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

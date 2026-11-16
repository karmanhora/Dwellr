/**
 * Brand tokens. Kept in core so a future Expo app renders the same identity
 * without importing anything from the web app.
 *
 * The wordmark is always written "HausCrawl", with a capital H and C.
 */
export const BRAND = {
  name: "HausCrawl",
  tagline: "Find a home. Together.",
  typeface: "Outfit",
  colors: {
    /** Primary ink, sampled from the logo mark. */
    ink: "#1F2422",
    paper: "#FFFFFF",
    mist: "#F5F4EF",
    line: "#E5E2DA",
    stone: "#6E736D",
    moss: "#2F4F43",
  },
} as const;

export type BrandColor = keyof typeof BRAND.colors;

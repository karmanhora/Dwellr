import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./redirect";

const FALLBACK = "/me";

describe("safeRedirectPath", () => {
  it.each([
    ["protocol-relative", "//evil.com"],
    ["backslash", "/\\evil.com"],
    ["double backslash", "/\\\\evil.com"],
    ["encoded backslash", "/%5Cevil.com"],
    ["lowercase encoded backslash", "/%5cevil.com"],
    ["absolute https URL", "https://evil.com"],
    ["absolute http URL", "http://evil.com"],
    ["other scheme", "javascript:alert(1)"],
    ["empty string", ""],
    ["whitespace only", "   "],
    ["relative path without slash", "me"],
    ["leading whitespace", " /me"],
    ["trailing newline", "/me\n"],
    ["header injection attempt", "/me\r\nSet-Cookie: session=x"],
    ["tab character", "/me\t"],
    ["NUL byte", "/\u0000"],
    ["DEL character", "/\u007f"],
    ["encoded double slash", "/%2F%2Fevil.com"],
    ["malformed percent-encoding", "/%"],
  ])("rejects %s (%j)", (_label, value) => {
    expect(safeRedirectPath(value)).toBe(FALLBACK);
  });

  it.each([[undefined], [null], [123], [true], [{}], [[]], [/^\/me$/]])(
    "rejects non-string %j",
    (value) => {
      expect(safeRedirectPath(value)).toBe(FALLBACK);
    },
  );

  it.each([["/me"], ["/me?tab=1"], ["/sign-in?next=/me"], ["/"], ["/me#profile"]])(
    "allows %j",
    (value) => {
      expect(safeRedirectPath(value)).toBe(value);
    },
  );

  it("uses a caller-provided fallback", () => {
    expect(safeRedirectPath("//evil.com", "/")).toBe("/");
    expect(safeRedirectPath(undefined, "/sign-in")).toBe("/sign-in");
  });
});

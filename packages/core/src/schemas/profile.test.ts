import { describe, expect, it } from "vitest";

import {
  avatarUrlSchema,
  bioSchema,
  displayNameSchema,
  updateProfileSchema,
  usernameSchema,
} from "./profile";
import { formatMemberSince, getDisplayName, getInitials, toProfile } from "../services/profile";
import { getFieldErrors } from "../services/validation";
import type { ProfileRow } from "../types/profile";

describe("usernameSchema", () => {
  it("trims and lowercases a valid username", () => {
    const result = usernameSchema.safeParse("  Dwellr_Fan  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("dwellr_fan");
  });

  it.each(["ab", "has space", "emoji🙂", "dot.name", "a".repeat(25)])("rejects %j", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });

  it("rejects reserved names case-insensitively", () => {
    expect(usernameSchema.safeParse("Support").success).toBe(false);
  });
});

describe("displayNameSchema and bioSchema", () => {
  it("trims display names", () => {
    const result = displayNameSchema.safeParse("  Karman  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("Karman");
  });

  it("rejects an over-long bio", () => {
    expect(bioSchema.safeParse("a".repeat(161)).success).toBe(false);
  });

  it("accepts a bio at the limit", () => {
    expect(bioSchema.safeParse("a".repeat(160)).success).toBe(true);
  });

  it("treats an empty bio as not provided", () => {
    const result = bioSchema.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });
});

describe("avatarUrlSchema", () => {
  it("accepts http and https URLs", () => {
    expect(avatarUrlSchema.safeParse("https://cdn.dwellr.com/a.png").success).toBe(true);
    expect(avatarUrlSchema.safeParse("http://localhost:3000/a.png").success).toBe(true);
  });

  it.each(["javascript:alert(1)", "ftp://example.com/a.png", "not a url"])(
    "rejects %j",
    (value) => {
      expect(avatarUrlSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("updateProfileSchema", () => {
  it("accepts a partial update", () => {
    const result = updateProfileSchema.safeParse({ bio: "House hunting in Lisbon." });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBeUndefined();
  });

  it("rejects an invalid username even when other fields are fine", () => {
    expect(updateProfileSchema.safeParse({ username: "no spaces" }).success).toBe(false);
  });
});

describe("getFieldErrors", () => {
  it("returns the first message per field", () => {
    const parsed = updateProfileSchema.safeParse({ username: "", avatarUrl: "nope" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const errors = getFieldErrors(parsed.error);
    expect(errors.username).toBeDefined();
    expect(errors.avatarUrl).toBe("Enter a valid http or https URL.");
    expect(Object.keys(errors)).toHaveLength(2);
  });
});

describe("profile services", () => {
  const row: ProfileRow = {
    id: "5b0d1c2e-0000-4000-8000-000000000000",
    username: "karman",
    display_name: "Karman Hora",
    avatar_url: null,
    bio: null,
    created_at: "2026-01-15T12:00:00.000Z",
  };

  it("maps a snake_case row to a camelCase profile", () => {
    expect(toProfile(row)).toEqual({
      id: row.id,
      username: "karman",
      displayName: "Karman Hora",
      avatarUrl: null,
      bio: null,
      createdAt: "2026-01-15T12:00:00.000Z",
    });
  });

  it("falls back to the username when no display name is set", () => {
    expect(getDisplayName({ displayName: null, username: "karman" })).toBe("karman");
    expect(getDisplayName({ displayName: "   ", username: "karman" })).toBe("karman");
  });

  it("derives initials", () => {
    expect(getInitials("Karman Hora")).toBe("KH");
    expect(getInitials("karman_hora")).toBe("KH");
    expect(getInitials("dwellr")).toBe("D");
    expect(getInitials("")).toBe("?");
  });

  it("formats the join date", () => {
    expect(formatMemberSince("2026-01-15T12:00:00.000Z")).toBe("Member since January 2026");
    expect(formatMemberSince("not-a-date")).toBe("Member");
  });
});

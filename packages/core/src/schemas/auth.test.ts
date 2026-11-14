import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./auth";

const validSignUp = {
  email: "Karman@Example.com",
  password: "dwellr2026",
  username: "karman_h",
  displayName: "Karman Hora",
};

describe("signUpSchema", () => {
  it("accepts a complete, valid submission", () => {
    const result = signUpSchema.safeParse(validSignUp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("karman@example.com");
      expect(result.data.username).toBe("karman_h");
      expect(result.data.displayName).toBe("Karman Hora");
    }
  });

  it("normalizes email whitespace and mixed case", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, email: "  HELLO@Dwellr.CO  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("hello@dwellr.co");
  });

  it("normalizes usernames to lowercase", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, username: "  DwellrFan  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBe("dwellrfan");
  });

  it("treats a blank display name as not provided", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, displayName: "   " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBeUndefined();
  });

  it.each(["", "   ", "not-an-email", "karman@", "@example.com", "karman@example"])(
    "rejects invalid email %j",
    (email) => {
      expect(signUpSchema.safeParse({ ...validSignUp, email }).success).toBe(false);
    },
  );

  it("requires at least 8 characters", () => {
    // 7 characters, otherwise satisfying every class rule.
    expect(signUpSchema.safeParse({ ...validSignUp, password: "Dwellr2" }).success).toBe(false);

    // 8 characters is the boundary and must be accepted.
    const boundary = signUpSchema.safeParse({ ...validSignUp, password: "Dwellr26" });
    expect(boundary.success).toBe(true);
  });

  it.each([
    ["too short", "dw3llr"],
    ["no number", "dwellrhouse"],
    ["no letter", "12345678"],
    ["too long", `dwellr2026${"x".repeat(70)}`],
  ])("rejects a password that is %s", (_label, password) => {
    expect(signUpSchema.safeParse({ ...validSignUp, password }).success).toBe(false);
  });

  it.each([
    ["a space", "karman hora"],
    ["an uppercase-only symbol", "karman!"],
    ["a hyphen", "karman-hora"],
    ["two characters", "kh"],
    ["25 characters", "a".repeat(25)],
  ])("rejects a username containing %s", (_label, username) => {
    expect(signUpSchema.safeParse({ ...validSignUp, username }).success).toBe(false);
  });

  it("rejects usernames reserved for the product", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, username: "admin" });
    expect(result.success).toBe(false);
  });

  it("rejects a display name longer than 50 characters", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, displayName: "K".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("accepts an email and password", () => {
    const result = signInSchema.safeParse({ email: "a@b.co", password: "x" });
    expect(result.success).toBe(true);
  });

  it("requires a password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("does not apply sign-up password rules to existing accounts", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "old" }).success).toBe(true);
  });
});

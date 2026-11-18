import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Database } from "./database.types";
import { ensureWaitlistAuthUser } from "./admin";

function mockAdmin() {
  const createUser = vi.fn();
  const listUsers = vi.fn();
  const admin = {
    auth: { admin: { createUser, listUsers } },
  } as unknown as SupabaseClient<Database>;

  return { admin, createUser, listUsers };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ensureWaitlistAuthUser", () => {
  it("fails when a duplicate Auth user cannot be found for linking", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin, createUser, listUsers } = mockAdmin();

    createUser.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "User already registered" },
    });
    listUsers.mockResolvedValue({ data: { users: [] }, error: null });

    await expect(
      ensureWaitlistAuthUser(admin, {
        email: "waitlist@example.com",
        signupId: "00000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({ status: "failed" });

    expect(listUsers).toHaveBeenCalledWith({ page: 1, perPage: 1000 });
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining("existing auth user could not be found"),
    );
  });

  it("fails visibly when the duplicate lookup itself errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { admin, createUser, listUsers } = mockAdmin();

    createUser.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "User already registered" },
    });
    listUsers.mockResolvedValue({
      data: { users: null },
      error: { code: "unavailable", message: "Auth unavailable" },
    });

    await expect(
      ensureWaitlistAuthUser(admin, {
        email: "waitlist@example.com",
        signupId: "00000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({ status: "failed" });
  });

  it("links an existing Auth user after an idempotent duplicate create", async () => {
    const { admin, createUser, listUsers } = mockAdmin();

    createUser.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", message: "User already registered" },
    });
    listUsers.mockResolvedValue({
      data: { users: [{ id: "auth-user-1", email: "waitlist@example.com" }] },
      error: null,
    });

    await expect(
      ensureWaitlistAuthUser(admin, {
        email: "waitlist@example.com",
        signupId: "00000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({ status: "exists", userId: "auth-user-1" });
  });
});

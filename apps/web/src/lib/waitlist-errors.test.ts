import { describe, expect, it } from "vitest";

import { isMissingAuthUserIdColumnError } from "./waitlist-errors";

describe("isMissingAuthUserIdColumnError", () => {
  it("recognizes PostgREST's schema-cache error", () => {
    expect(
      isMissingAuthUserIdColumnError({
        code: "PGRST204",
        message:
          "Could not find the 'auth_user_id' column of 'waitlist_signups' in the schema cache",
      }),
    ).toBe(true);
  });

  it("recognizes Postgres's undefined-column error", () => {
    expect(
      isMissingAuthUserIdColumnError({
        code: "42703",
        message: 'column "auth_user_id" does not exist',
      }),
    ).toBe(true);
  });

  it("recognizes the schema-cache message when only the message is available", () => {
    expect(
      isMissingAuthUserIdColumnError({
        message:
          'Could not find the "auth_user_id" column of "waitlist_signups" in the schema cache',
      }),
    ).toBe(true);
  });

  it("does not swallow a different write failure on the same column", () => {
    expect(
      isMissingAuthUserIdColumnError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "waitlist_signups_auth_user_id_key"',
      }),
    ).toBe(false);
  });

  it("does not swallow a permission failure", () => {
    expect(
      isMissingAuthUserIdColumnError({
        code: "42501",
        message: "permission denied for table waitlist_signups",
      }),
    ).toBe(false);
  });
});

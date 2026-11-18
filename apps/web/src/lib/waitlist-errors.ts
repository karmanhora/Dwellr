/**
 * PostgREST can report a write against a column missing from its schema cache
 * as PGRST204, even when Postgres itself would report 42703. Keep both forms
 * together so the waitlist can tolerate a code-before-migration deploy without
 * swallowing unrelated write failures.
 */
export function isMissingAuthUserIdColumnError(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /column .*auth_user_id.*does not exist/i.test(error.message ?? "") ||
    /could not find the ['"]?auth_user_id['"]? column .*schema cache/i.test(error.message ?? "")
  );
}

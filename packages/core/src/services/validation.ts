import type { z } from "zod";

/**
 * Collapses a Zod error into the first message per form field, which is the
 * shape our form components consume. Field names match the schema keys.
 */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || key.length === 0) continue;
    if (errors[key] === undefined) errors[key] = issue.message;
  }

  return errors;
}

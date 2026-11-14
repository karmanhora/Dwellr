/** Shared state shape for the auth forms (useActionState). */
export type AuthFormState = {
  status: "idle" | "error" | "notice";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: {
    email?: string;
    username?: string;
    displayName?: string;
  };
};

export const initialAuthState: AuthFormState = { status: "idle" };

/** Only allow same-origin, absolute-path redirects. */
export function safeRedirectPath(value: unknown, fallback = "/me"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

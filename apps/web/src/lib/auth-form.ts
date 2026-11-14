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

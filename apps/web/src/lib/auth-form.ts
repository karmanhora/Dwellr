/** Shared state shape for the auth forms (useActionState). */
export type AuthFormState = {
  status: "idle" | "error" | "notice";
  message?: string;
  recoverAccount?: boolean;
  fieldErrors?: Record<string, string>;
  values?: {
    email?: string;
    username?: string;
    displayName?: string;
  };
};

export const initialAuthState: AuthFormState = { status: "idle" };

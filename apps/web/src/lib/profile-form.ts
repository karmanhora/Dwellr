export type ProfileFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: { displayName?: string; bio?: string };
};

export const initialProfileFormState: ProfileFormState = { status: "idle" };

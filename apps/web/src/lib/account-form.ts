export type DeleteAccountState = {
  status: "idle" | "error";
  message?: string;
};

export const initialDeleteAccountState: DeleteAccountState = { status: "idle" };

export { BRAND, type BrandColor } from "./constants/brand";
export {
  AVATAR_URL_MAX_LENGTH,
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESERVED_USERNAMES,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "./constants/validation";

export { emailSchema, signInSchema, signUpSchema } from "./schemas/auth";
export type { SignInInput, SignUpInput } from "./schemas/auth";
export {
  avatarUrlSchema,
  bioSchema,
  displayNameSchema,
  updateProfileSchema,
  usernameSchema,
} from "./schemas/profile";
export type { UpdateProfileInput } from "./schemas/profile";

export type { Profile, ProfileField, ProfileRow } from "./types/profile";

export { formatMemberSince, getDisplayName, getInitials, toProfile } from "./services/profile";
export { safeRedirectPath } from "./services/redirect";
export { getFieldErrors } from "./services/validation";

/** Collection constants shared by clients and mirrored by database checks. */

export const COLLECTION_NAME_MIN_LENGTH = 1;
export const COLLECTION_NAME_MAX_LENGTH = 60;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500;
export const COLLECTION_NOTE_MAX_LENGTH = 500;
export const COLLECTION_MAX_ITEMS = 100;
export const COLLECTION_SHARE_SLUG_LENGTH = 12;
export const COLLECTION_SHARE_SLUG_PATTERN = /^[a-z0-9]{12}$/;

export const COLLECTION_ROLES = ["owner", "editor", "viewer"] as const;
export type CollectionRoleValue = (typeof COLLECTION_ROLES)[number];

export const COLLECTION_INVITE_ROLES = ["editor", "viewer"] as const;
export const COLLECTION_INVITE_DEFAULT_DAYS = 7;
export const COLLECTION_INVITE_MAX_DAYS = 30;
export const COLLECTION_INVITE_MAX_USES = 50;
export const COLLECTION_EVALUATION_NOTE_MAX_LENGTH = 500;
export const COLLECTION_EVALUATION_TAG_MAX_LENGTH = 40;
export const COLLECTION_EVALUATION_MAX_TAGS = 6;

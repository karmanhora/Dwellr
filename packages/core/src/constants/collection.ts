/** Collection constants shared by clients and mirrored by database checks. */

export const COLLECTION_NAME_MIN_LENGTH = 1;
export const COLLECTION_NAME_MAX_LENGTH = 60;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500;
export const COLLECTION_NOTE_MAX_LENGTH = 500;
export const COLLECTION_MAX_ITEMS = 100;
export const COLLECTION_SHARE_SLUG_LENGTH = 12;
export const COLLECTION_SHARE_SLUG_PATTERN = /^[a-z0-9]{12}$/;

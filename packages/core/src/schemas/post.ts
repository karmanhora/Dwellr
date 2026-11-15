import { z } from "zod";

import {
  POST_CAPTION_MAX_LENGTH,
  POST_CATEGORIES,
  POST_CATEGORY_MAX,
  POST_CITY_MAX_LENGTH,
  POST_KINDS,
  POST_MAX_PHOTOS,
  POST_NEIGHBORHOOD_MAX_LENGTH,
  POST_PHOTO_ALT_MAX_LENGTH,
  POST_PHOTO_MAX_BYTES,
  POST_PHOTO_MAX_DIMENSION,
  VIDEO_CAPTIONS_MAX_LENGTH,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DIMENSION,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_MIN_DURATION_SECONDS,
  VIDEO_MIME_TYPES,
} from "../constants/post";

export const postKindSchema = z.enum(POST_KINDS);
export const postCategorySchema = z.enum(POST_CATEGORIES);

const UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Server-generated keys only: <author-id>/<uuid>.<ext>. */
export const postPhotoPathSchema = z
  .string()
  .regex(
    new RegExp(`^${UUID}/${UUID}\\.(jpg|jpeg|png|webp)$`, "i"),
    "That photo reference is not valid.",
  );

export const videoStoragePathSchema = z
  .string()
  .regex(
    new RegExp(`^${UUID}/${UUID}\\.(mp4|webm)$`, "i"),
    "That video reference is not valid.",
  );

const optionalUuid = z
  .union([z.uuid("That property link is not valid."), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const postCategoriesSchema = z
  .array(postCategorySchema)
  .max(POST_CATEGORY_MAX, `Choose at most ${POST_CATEGORY_MAX} categories.`)
  .default([])
  .refine((values) => new Set(values).size === values.length, "Choose each category once.");

export const postCaptionSchema = z
  .string()
  .trim()
  .max(POST_CAPTION_MAX_LENGTH, `Captions are ${POST_CAPTION_MAX_LENGTH} characters or fewer.`)
  .default("");

export const postPhotoInputSchema = z
  .object({
    storagePath: postPhotoPathSchema,
    altText: optionalText(POST_PHOTO_ALT_MAX_LENGTH, "Alt text"),
    width: z.number().int().min(1).max(POST_PHOTO_MAX_DIMENSION).optional(),
    height: z.number().int().min(1).max(POST_PHOTO_MAX_DIMENSION).optional(),
    sizeBytes: z
      .number()
      .int()
      .min(1, "A photo cannot be empty.")
      .max(POST_PHOTO_MAX_BYTES, "Photos are 5 MB or smaller."),
  })
  .refine((photo) => (photo.width === undefined) === (photo.height === undefined), {
    message: "Width and height must be recorded together.",
    path: ["width"],
  });

export const postVideoInputSchema = z.object({
  storagePath: videoStoragePathSchema,
  posterPath: postPhotoPathSchema,
  durationSeconds: z
    .number()
    .min(VIDEO_MIN_DURATION_SECONDS, "That video has no playable length.")
    .max(VIDEO_MAX_DURATION_SECONDS, "Videos must be 30 seconds or shorter."),
  width: z.number().int().min(1).max(VIDEO_MAX_DIMENSION),
  height: z.number().int().min(1).max(VIDEO_MAX_DIMENSION),
  sizeBytes: z
    .number()
    .int()
    .min(1, "That video is empty.")
    .max(VIDEO_MAX_BYTES, "Videos must be 25 MB or smaller."),
  mimeType: z.enum(VIDEO_MIME_TYPES, "Use an MP4 (H.264) or WebM video."),
  captions: optionalText(VIDEO_CAPTIONS_MAX_LENGTH, "Captions"),
});

const postFieldsSchema = z.object({
  caption: postCaptionSchema,
  categories: postCategoriesSchema,
  propertyId: optionalUuid,
  neighborhood: optionalText(POST_NEIGHBORHOOD_MAX_LENGTH, "Neighborhood"),
  city: optionalText(POST_CITY_MAX_LENGTH, "City"),
});

export const createPostSchema = postFieldsSchema
  .extend({
    kind: postKindSchema,
    photos: z.array(postPhotoInputSchema).max(POST_MAX_PHOTOS).default([]),
    video: postVideoInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "text") {
      if (value.caption.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["caption"],
          message: "Write something for a text post.",
        });
      }
      if (value.photos.length > 0 || value.video) {
        ctx.addIssue({
          code: "custom",
          path: ["kind"],
          message: "A text post cannot carry photos or a video.",
        });
      }
    }

    if (value.kind === "photo") {
      if (value.photos.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["photos"],
          message: "Add at least one photo.",
        });
      }
      if (value.video) {
        ctx.addIssue({
          code: "custom",
          path: ["kind"],
          message: "A photo post cannot carry a video.",
        });
      }
    }

    if (value.kind === "video") {
      if (!value.video) {
        ctx.addIssue({
          code: "custom",
          path: ["video"],
          message: "Add a video first.",
        });
      }
      if (value.photos.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["kind"],
          message: "A video post cannot also carry photos.",
        });
      }
    }
  });

/** Media is immutable after publish; this covers the editable copy and tags. */
export const updatePostSchema = postFieldsSchema;

export const videoMetadataSchema = postVideoInputSchema;

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostPhotoInput = z.infer<typeof postPhotoInputSchema>;
export type PostVideoInput = z.infer<typeof postVideoInputSchema>;

import type { PostPhotoInput, PostVideoInput } from "@hauscrawl/core";

export type PostFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: {
    caption: string;
    categories: string[];
    propertyId: string;
    neighborhood: string;
    city: string;
  };
};

export function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function snapshotPostForm(formData: FormData): NonNullable<PostFormState["values"]> {
  return {
    caption: readText(formData, "caption"),
    categories: formData
      .getAll("categories")
      .filter((value): value is string => typeof value === "string"),
    propertyId: readText(formData, "propertyId"),
    neighborhood: readText(formData, "neighborhood"),
    city: readText(formData, "city"),
  };
}

function parseArray(raw: string): unknown[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePhotos(formData: FormData): PostPhotoInput[] {
  return parseArray(readText(formData, "photos")).flatMap((entry): PostPhotoInput[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const value = entry as Record<string, unknown>;
    if (typeof value.storagePath !== "string" || typeof value.sizeBytes !== "number") return [];
    return [
      {
        storagePath: value.storagePath,
        sizeBytes: value.sizeBytes,
        width: typeof value.width === "number" ? value.width : undefined,
        height: typeof value.height === "number" ? value.height : undefined,
        altText: typeof value.altText === "string" ? value.altText : undefined,
      },
    ];
  });
}

export function parseVideo(formData: FormData): PostVideoInput | undefined {
  const raw = readText(formData, "video");
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return undefined;
    const record = value as Record<string, unknown>;
    if (
      typeof record.storagePath !== "string" ||
      typeof record.posterPath !== "string" ||
      typeof record.durationSeconds !== "number" ||
      typeof record.width !== "number" ||
      typeof record.height !== "number" ||
      typeof record.sizeBytes !== "number" ||
      typeof record.mimeType !== "string"
    ) {
      return undefined;
    }
    return {
      storagePath: record.storagePath,
      posterPath: record.posterPath,
      durationSeconds: record.durationSeconds,
      width: record.width,
      height: record.height,
      sizeBytes: record.sizeBytes,
      mimeType: record.mimeType as PostVideoInput["mimeType"],
      captions: typeof record.captions === "string" ? record.captions : undefined,
    };
  } catch {
    return undefined;
  }
}

export function publishErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("quota")) {
    return "You've reached this month's post storage allowance. Delete an older post before uploading more.";
  }
  if (lower.includes("ten posts")) return "You can publish ten posts an hour. Try again in a little while.";
  if (lower.includes("three videos")) return "You can publish three videos a day. Try again tomorrow.";
  if (lower.includes("different account") || lower.includes("belong")) {
    return "Those files belong to a different account. Remove them and upload again.";
  }
  if (lower.includes("30 seconds")) return "Videos must be 30 seconds or shorter.";
  if (lower.includes("25 mb") || lower.includes("25mb")) return "Videos must be 25 MB or smaller.";
  if (lower.includes("property does not exist")) return "That tagged home no longer exists. Remove the tag and try again.";
  return "We couldn't publish that post. Nothing was saved — try again.";
}

import { readText } from "@/lib/property-form";

export type CollectionFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: { name?: string; description?: string; isPublic?: boolean };
};

export const initialCollectionFormState: CollectionFormState = { status: "idle" };

export function readCollectionFields(formData: FormData) {
  return {
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    isPublic: readText(formData, "isPublic") === "on" || readText(formData, "isPublic") === "true",
  };
}

export function snapshotCollectionForm(formData: FormData) {
  const fields = readCollectionFields(formData);
  return { name: fields.name, description: fields.description, isPublic: fields.isPublic };
}

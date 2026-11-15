/**
 * Storage-agnostic video boundary. The web app implements this with Supabase
 * Storage today; Mux, Cloudflare Stream or a self-hosted pipeline can replace
 * it without changing the domain or UI contracts.
 */
export interface VideoUploadInput {
  /** Server-generated path: <author-id>/<uuid>.<ext>. */
  path: string;
  file: Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

export interface VideoUploadResult {
  path: string;
  sizeBytes: number;
}

export interface VideoProvider {
  readonly name: string;
  upload(input: VideoUploadInput): Promise<VideoUploadResult>;
  remove(path: string): Promise<void>;
  playbackUrl(path: string): string;
  posterUrl(path: string): string;
}

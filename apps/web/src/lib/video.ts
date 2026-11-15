"use client";

import {
  VIDEO_MAX_BYTES,
  VIDEO_MAX_DIMENSION,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_MIME_TYPES,
  type VideoMimeType,
} from "@dwellr/core";

export type VideoMetadata = {
  durationSeconds: number;
  width: number;
  height: number;
  mimeType: VideoMimeType;
  sizeBytes: number;
};

export type VideoInspection = VideoMetadata & {
  previewUrl: string;
  posterBlob: Blob;
  posterPreviewUrl: string;
};

function waitFor(
  target: HTMLVideoElement,
  event: "loadedmetadata" | "loadeddata" | "seeked",
): Promise<void> {
  if (event === "loadedmetadata" && target.readyState >= 1) return Promise.resolve();
  if (event === "loadeddata" && target.readyState >= 2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let poll: number | undefined;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("That video took too long to read. Try a smaller clip."));
    }, 12_000);

    function cleanup() {
      window.clearTimeout(timeout);
      if (poll !== undefined) window.clearInterval(poll);
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
    }
    function onEvent() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error("Your browser couldn't read that video. Try MP4 (H.264) or WebM."));
    }

    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });

    // A tiny local file can advance readyState in the gap between the check
    // above and listener attachment, losing the event entirely.
    if (event !== "seeked") {
      const required = event === "loadedmetadata" ? 1 : 2;
      poll = window.setInterval(() => {
        if (target.readyState < required) return;
        cleanup();
        resolve();
      }, 50);
    }
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The poster frame couldn't be made."))),
      "image/webp",
      0.84,
    );
  });
}

/**
 * Reads duration and dimensions with the browser's own decoder, then captures
 * a poster frame. This is validation, not transcoding: the original file is
 * uploaded unchanged, so container metadata is not stripped in this milestone.
 */
export async function inspectVideo(file: File): Promise<VideoInspection> {
  if (!VIDEO_MIME_TYPES.includes(file.type as VideoMimeType)) {
    throw new Error("Use an MP4 (H.264) or WebM video.");
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error("Videos must be 25 MB or smaller. Trim the clip and try again.");
  }
  if (file.size <= 0) {
    throw new Error("That video file is empty.");
  }

  const previewUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = previewUrl;
  // Chromium does not reliably load metadata for a detached media element.
  // Keep it out of layout but in the document while it decodes.
  video.style.position = "fixed";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.setAttribute("aria-hidden", "true");
  document.body.appendChild(video);
  video.load();

  try {
    await waitFor(video, "loadedmetadata");

    // MediaRecorder WebM blobs often report Infinity until the browser seeks
    // to the end. Resolve the real duration before enforcing the limit.
    if (!Number.isFinite(video.duration)) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("That video has no readable length."));
        }, 6_000);
        function cleanup() {
          window.clearTimeout(timeout);
          video.removeEventListener("timeupdate", onTimeUpdate);
          video.removeEventListener("durationchange", onTimeUpdate);
        }
        function onTimeUpdate() {
          if (!Number.isFinite(video.duration)) return;
          cleanup();
          video.currentTime = 0;
          resolve();
        }
        video.addEventListener("timeupdate", onTimeUpdate);
        video.addEventListener("durationchange", onTimeUpdate);
        video.currentTime = 1e101;
      });
    }

    const durationSeconds = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error("That video has no readable length.");
    }
    if (durationSeconds > VIDEO_MAX_DURATION_SECONDS + 0.05) {
      throw new Error("Videos must be 30 seconds or shorter. Trim the clip and try again.");
    }
    if (
      width < 1 ||
      height < 1 ||
      width > VIDEO_MAX_DIMENSION ||
      height > VIDEO_MAX_DIMENSION
    ) {
      throw new Error("That video's dimensions aren't supported.");
    }

    if (video.readyState < 2) await waitFor(video, "loadeddata");

    const seekTo = Math.min(
      Math.max(durationSeconds * 0.25, 0.05),
      Math.max(durationSeconds - 0.05, 0.05),
    );
    if (video.seekable.length > 0 && Math.abs(video.currentTime - seekTo) > 0.01) {
      try {
        video.currentTime = seekTo;
        await waitFor(video, "seeked");
      } catch {
        // Some browser-recorded WebM files are not seekable; use the frame the
        // decoder already has rather than failing an otherwise valid clip.
      }
    }

    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't prepare the poster frame.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const posterBlob = await canvasToBlob(canvas);
    video.remove();
    return {
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      width,
      height,
      mimeType: file.type as VideoMimeType,
      sizeBytes: file.size,
      previewUrl,
      posterBlob,
      posterPreviewUrl: URL.createObjectURL(posterBlob),
    };
  } catch (error) {
    video.remove();
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

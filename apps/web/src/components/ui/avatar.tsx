import { getInitials } from "@hauscrawl/core";
import Image from "next/image";

const sizes = {
  xs: { box: "h-7 w-7 text-[10px]", pixels: 56 },
  sm: { box: "h-9 w-9 text-xs", pixels: 72 },
  md: { box: "h-12 w-12 text-sm", pixels: 96 },
  lg: { box: "h-20 w-20 text-xl", pixels: 160 },
  xl: { box: "h-28 w-28 text-2xl", pixels: 224 },
} as const;

type AvatarProps = {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

/**
 * Initials fallback is the default: photos only render when a stored avatar
 * path exists, so a broken URL never leaves a blank hole.
 */
export function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const { box, pixels } = sizes[size];
  const hasImage = Boolean(src && /^(https?:\/\/|\/)/.test(src));

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist font-medium tracking-wide text-ink ${box} ${className}`}
    >
      {hasImage && src ? (
        <Image
          src={src}
          alt=""
          width={pixels}
          height={pixels}
          className="h-full w-full object-cover"
          sizes={`${pixels}px`}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}

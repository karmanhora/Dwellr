import type { ElementType, ReactNode } from "react";

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-[88rem]",
} as const;

type ContainerProps = {
  children: ReactNode;
  size?: keyof typeof widths;
  as?: ElementType;
  className?: string;
};

/** Consistent page gutters and max widths across every surface. */
export function Container({ children, size = "default", as: Tag = "div", className = "" }: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full px-5 sm:px-8 ${widths[size]} ${className}`}>{children}</Tag>
  );
}

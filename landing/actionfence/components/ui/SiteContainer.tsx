import type { ReactNode } from "react";

type SiteContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function SiteContainer({
  children,
  className = "",
}: SiteContainerProps) {
  const classes = ["mx-auto w-full max-w-[1440px] px-6 md:px-12", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

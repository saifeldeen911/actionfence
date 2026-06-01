import type { ReactNode } from "react";

type SectionShellProps = {
  children: ReactNode;
  className?: string;
};

export default function SectionShell({ children, className = "" }: SectionShellProps) {
  return (
    <div
      className={[
        "mx-auto w-full max-w-360 px-6 md:px-12 lg:px-16",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

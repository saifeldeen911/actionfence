"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { repoDocMetaList } from "@/lib/docs-meta";

export default function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-5 border-b border-zinc-800 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-500 md:px-12">
      {repoDocMetaList.map((item) => (
        <Link
          key={item.route}
          href={item.route}
          className={`transition-colors hover:text-zinc-100 ${item.route === pathname ? "text-zinc-100" : ""}`}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}

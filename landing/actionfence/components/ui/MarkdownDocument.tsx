import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { repoDocs, type RepoDoc } from "@/lib/repo-docs";
import SiteHeader from "@/components/ui/SiteHeader";

type MarkdownDocumentProps = {
  doc: RepoDoc;
  source: string;
};

const repoUrl = "https://github.com/saifeldeen911/actionfence";

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#]/g, "")
    .replace(/\\\|/g, "|")
    .trim();
}

function slugify(value: string): string {
  return stripMarkdown(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHref(href: string): string {
  if (/^(https?:|mailto:|#)/.test(href)) {
    return href;
  }

  const clean = href.replace(/^\.\//, "");
  const route = Object.values(repoDocs).find((doc) => doc.fileName === clean);

  if (route) {
    return route.route;
  }

  return `${repoUrl}/tree/main/${clean}`;
}

function renderInline(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = tokenPattern.exec(value))) {
    if (match.index > cursor) {
      nodes.push(value.slice(cursor, match.index));
    }

    if (match[1] !== undefined && match[2]) {
      nodes.push(
        <Image
          key={`${keyPrefix}-img-${index}`}
          src={match[2]}
          alt={match[1]}
          width={120}
          height={20}
          unoptimized
          className="mr-2 inline-block h-5 align-middle"
        />,
      );
    } else if (match[3] !== undefined && match[4]) {
      const href = normalizeHref(match[4]);
      const isExternal = /^(https?:|mailto:)/.test(href);
      nodes.push(
        <a
          key={`${keyPrefix}-link-${index}`}
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-zinc-100 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-200"
        >
          {renderInline(match[3], `${keyPrefix}-link-${index}`)}
        </a>,
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${index}`}
          className="border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-100"
        >
          {match[5]}
        </code>,
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold text-zinc-100">
          {renderInline(match[6], `${keyPrefix}-strong-${index}`)}
        </strong>,
      );
    }

    cursor = tokenPattern.lastIndex;
    index += 1;
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes;
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of line.trim()) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());

  if (cells[0] === "") cells.shift();
  if (cells[cells.length - 1] === "") cells.pop();

  return cells;
}

function renderBlocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const codeFence = line.match(/^```(\w+)?/);
    if (codeFence) {
      const language = codeFence[1] ?? "text";
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }

      index += 1;
      blocks.push(
        <figure key={`code-${index}`} className="my-8 overflow-hidden border border-zinc-800 bg-[#09090b]">
          <figcaption className="border-b border-zinc-800 px-4 py-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
            {language}
          </figcaption>
          <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-zinc-300 md:p-6">
            <code>{code.join("\n")}</code>
          </pre>
        </figure>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2];
      const id = slugify(content);
      const className =
        level === 1
          ? "mt-0 text-5xl font-medium leading-[0.95] tracking-tighter text-zinc-50 md:text-7xl"
          : level === 2
            ? "mt-20 border-t border-zinc-800 pt-10 text-3xl font-medium leading-tight tracking-tighter text-zinc-50 md:text-5xl"
            : level === 3
              ? "mt-12 text-2xl font-medium tracking-tight text-zinc-100"
              : "mt-8 font-mono text-sm uppercase tracking-widest text-zinc-400";

      const children = renderInline(content, `heading-${index}`);

      if (level === 1) {
        blocks.push(
          <h1 key={`h-${index}`} id={id} className={className}>
            {children}
          </h1>,
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h-${index}`} id={id} className={className}>
            {children}
          </h2>,
        );
      } else if (level === 3) {
        blocks.push(
          <h3 key={`h-${index}`} id={id} className={className}>
            {children}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 key={`h-${index}`} id={id} className={className}>
            {children}
          </h4>,
        );
      }

      index += 1;
      continue;
    }

    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      blocks.push(
        <div key={`table-${index}`} className="my-8 overflow-x-auto border border-zinc-800">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-zinc-900/70 text-xs uppercase tracking-widest text-zinc-400">
              <tr>
                {header.map((cell, cellIndex) => (
                  <th key={cellIndex} className="border-b border-r border-zinc-800 px-4 py-3 font-mono font-normal last:border-r-0">
                    {renderInline(cell, `th-${index}-${cellIndex}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-zinc-900 last:border-b-0">
                  {header.map((_, cellIndex) => (
                    <td key={cellIndex} className="border-r border-zinc-900 px-4 py-3 align-top last:border-r-0">
                      {renderInline(row[cellIndex] ?? "", `td-${index}-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*(?:[-*]\s+|\d+\.\s+)/.test(line)) {
      const items: { content: string; indent: number }[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);

      while (index < lines.length && /^\s*(?:[-*]\s+|\d+\.\s+)/.test(lines[index])) {
        const itemLine = lines[index];
        const indent = itemLine.match(/^\s*/)?.[0].length ?? 0;
        items.push({
          content: itemLine.replace(/^\s*(?:[-*]\s+|\d+\.\s+)/, ""),
          indent,
        });
        index += 1;
      }

      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={`list-${index}`} className={`my-5 space-y-3 ${ordered ? "list-decimal" : "list-disc"} pl-6 text-zinc-400`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className={item.indent > 0 ? "ml-6" : undefined}>
              {renderInline(item.content, `li-${index}-${itemIndex}`)}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];

      while (index < lines.length && lines[index].startsWith(">")) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push(
        <blockquote key={`quote-${index}`} className="my-8 border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-300">
          {quote.map((quoteLine, quoteIndex) => (
            <p key={quoteIndex} className="leading-relaxed">
              {renderInline(quoteLine, `quote-${index}-${quoteIndex}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;

    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index]) &&
      !/^```/.test(lines[index]) &&
      !/^\s*(?:[-*]\s+|\d+\.\s+)/.test(lines[index]) &&
      !lines[index].startsWith(">") &&
      !(lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]))
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="my-5 max-w-3xl text-base leading-8 text-zinc-400 md:text-lg">
        {renderInline(paragraph.join(" "), `p-${index}`)}
      </p>,
    );
  }

  return blocks;
}

export default function MarkdownDocument({ doc, source }: MarkdownDocumentProps) {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-50">
      <SiteHeader variant="docs" />

      <nav className="flex flex-wrap gap-5 border-b border-zinc-800 px-6 py-4 font-mono text-xs uppercase tracking-widest text-zinc-500 md:px-12">
        {Object.entries(repoDocs).map(([key, item]) => (
          <Link
            key={key}
            href={item.route}
            className={`transition-colors hover:text-zinc-100 ${item.route === doc.route ? "text-zinc-100" : ""}`}
          >
            {item.title}
          </Link>
        ))}
      </nav>

      <section className="border-b border-zinc-800 px-6 py-16 md:px-12 md:py-24">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-8 font-mono text-xs uppercase tracking-widest text-zinc-500">
              {doc.fileName}
            </div>
            <h1 className="text-5xl font-medium leading-[0.95] tracking-tighter md:text-7xl">
              {doc.title}
            </h1>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-zinc-400 lg:col-span-4 lg:self-end">
            {doc.description}
          </p>
        </div>
      </section>

      <article className="px-6 py-16 md:px-12 md:py-24">
        <div className="mx-auto max-w-6xl">{renderBlocks(source)}</div>
      </article>
    </main>
  );
}

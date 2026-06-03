import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { repoDocs } from "@/lib/repo-docs";

type MarkdownDocumentProps = {
  source: string;
};

const repoUrl = "https://github.com/saifeldeen911/actionfence";

function normalizeHref(href: string): string {
  if (!href || /^(https?:|mailto:|#|\/)/.test(href)) {
    return href;
  }

  const [target, hash] = href.split("#");
  const clean = target.replace(/^\.\//, "");
  const route = Object.values(repoDocs).find((docItem) => docItem.fileName === clean);

  const suffix = hash ? `#${hash}` : "";

  if (route) {
    return `${route.route}${suffix}`;
  }

  return `${repoUrl}/tree/main/${clean}${suffix}`;
}

const markdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={`mt-0 text-5xl font-medium leading-[0.95] tracking-tighter text-zinc-50 md:text-7xl ${className ?? ""}`}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={`mt-20 border-t border-zinc-800 pt-10 text-3xl font-medium leading-tight tracking-tighter text-zinc-50 md:text-5xl ${className ?? ""}`}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={`mt-12 text-2xl font-medium tracking-tight text-zinc-100 ${className ?? ""}`} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={`mt-8 font-mono text-sm uppercase tracking-widest text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={`my-5 max-w-3xl text-base leading-8 text-zinc-400 md:text-lg ${className ?? ""}`} {...props} />
  ),
  a: ({ href, className, ...props }) => {
    const normalizedHref = normalizeHref(href ?? "");
    const isExternal = /^(https?:|mailto:)/.test(normalizedHref);

    return (
      <a
        href={normalizedHref}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={`text-zinc-100 underline decoration-zinc-600 underline-offset-4 transition-colors hover:decoration-zinc-200 ${className ?? ""}`}
        {...props}
      />
    );
  },
  img: ({ src, alt, className, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? ""}
      alt={alt ?? ""}
      loading="lazy"
      className={`my-6 max-w-full border border-zinc-800 bg-zinc-950 p-1 ${className ?? ""}`}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={`my-5 list-disc space-y-3 pl-6 text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={`my-5 list-decimal space-y-3 pl-6 text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  li: ({ className, ...props }) => <li className={`marker:text-zinc-600 ${className ?? ""}`} {...props} />,
  blockquote: ({ className, ...props }) => (
    <blockquote className={`my-8 border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-300 ${className ?? ""}`} {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-8 overflow-x-auto border border-zinc-800">
      <table className={`w-full min-w-180 border-collapse text-left text-sm ${className ?? ""}`} {...props} />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={`bg-zinc-900/70 text-xs uppercase tracking-widest text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  tbody: ({ className, ...props }) => <tbody className={`text-zinc-400 ${className ?? ""}`} {...props} />,
  tr: ({ className, ...props }) => (
    <tr className={`border-b border-zinc-900 last:border-b-0 ${className ?? ""}`} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={`border-b border-r border-zinc-800 px-4 py-3 font-mono font-normal last:border-r-0 ${className ?? ""}`}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td className={`border-r border-zinc-900 px-4 py-3 align-top last:border-r-0 ${className ?? ""}`} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={`my-8 overflow-x-auto border border-zinc-800 bg-[#09090b] p-4 text-sm leading-relaxed text-zinc-300 md:p-6 ${className ?? ""}`}
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const value = String(children).replace(/\n$/, "");
    const isBlock = Boolean(className && className.startsWith("language-")) || value.includes("\n");

    if (isBlock) {
      return (
        <code className={`font-mono text-sm text-zinc-300 ${className ?? ""}`} {...props}>
          {value}
        </code>
      );
    }

    return (
      <code
        className={`border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-100 ${className ?? ""}`}
        {...props}
      >
        {value}
      </code>
    );
  },
  hr: ({ className, ...props }) => <hr className={`my-12 border-zinc-800 ${className ?? ""}`} {...props} />,
};

export default function MarkdownDocument({ source }: MarkdownDocumentProps) {
  return (
    <article className="px-6 py-16 md:px-12 md:py-24">
      <div className="mx-auto max-w-6xl">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {source}
        </ReactMarkdown>
      </div>
    </article>
  );
}

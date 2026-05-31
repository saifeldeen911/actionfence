import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import FaultyTerminal from "@/components/ui/FaultyTerminal";
import SiteHeader from "@/components/ui/SiteHeader";
import { repoDocs, type RepoDoc } from "@/lib/repo-docs";

type MarkdownDocumentProps = {
  doc: RepoDoc;
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
  h1: ({ node: _node, className, ...props }) => (
    <h1
      className={`mt-0 text-5xl font-medium leading-[0.95] tracking-tighter text-zinc-50 md:text-7xl ${className ?? ""}`}
      {...props}
    />
  ),
  h2: ({ node: _node, className, ...props }) => (
    <h2
      className={`mt-20 border-t border-zinc-800 pt-10 text-3xl font-medium leading-tight tracking-tighter text-zinc-50 md:text-5xl ${className ?? ""}`}
      {...props}
    />
  ),
  h3: ({ node: _node, className, ...props }) => (
    <h3 className={`mt-12 text-2xl font-medium tracking-tight text-zinc-100 ${className ?? ""}`} {...props} />
  ),
  h4: ({ node: _node, className, ...props }) => (
    <h4 className={`mt-8 font-mono text-sm uppercase tracking-widest text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  p: ({ node: _node, className, ...props }) => (
    <p className={`my-5 max-w-3xl text-base leading-8 text-zinc-400 md:text-lg ${className ?? ""}`} {...props} />
  ),
  a: ({ node: _node, href, className, ...props }) => {
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
  img: ({ node: _node, src, alt, className, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? ""}
      alt={alt ?? ""}
      loading="lazy"
      className={`my-6 max-w-full border border-zinc-800 bg-zinc-950 p-1 ${className ?? ""}`}
      {...props}
    />
  ),
  ul: ({ node: _node, className, ...props }) => (
    <ul className={`my-5 list-disc space-y-3 pl-6 text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol className={`my-5 list-decimal space-y-3 pl-6 text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  li: ({ node: _node, className, ...props }) => <li className={`marker:text-zinc-600 ${className ?? ""}`} {...props} />,
  blockquote: ({ node: _node, className, ...props }) => (
    <blockquote className={`my-8 border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-300 ${className ?? ""}`} {...props} />
  ),
  table: ({ node: _node, className, ...props }) => (
    <div className="my-8 overflow-x-auto border border-zinc-800">
      <table className={`w-full min-w-[720px] border-collapse text-left text-sm ${className ?? ""}`} {...props} />
    </div>
  ),
  thead: ({ node: _node, className, ...props }) => (
    <thead className={`bg-zinc-900/70 text-xs uppercase tracking-widest text-zinc-400 ${className ?? ""}`} {...props} />
  ),
  tbody: ({ node: _node, className, ...props }) => <tbody className={`text-zinc-400 ${className ?? ""}`} {...props} />,
  tr: ({ node: _node, className, ...props }) => (
    <tr className={`border-b border-zinc-900 last:border-b-0 ${className ?? ""}`} {...props} />
  ),
  th: ({ node: _node, className, ...props }) => (
    <th
      className={`border-b border-r border-zinc-800 px-4 py-3 font-mono font-normal last:border-r-0 ${className ?? ""}`}
      {...props}
    />
  ),
  td: ({ node: _node, className, ...props }) => (
    <td className={`border-r border-zinc-900 px-4 py-3 align-top last:border-r-0 ${className ?? ""}`} {...props} />
  ),
  pre: ({ node: _node, className, ...props }) => (
    <pre
      className={`my-8 overflow-x-auto border border-zinc-800 bg-[#09090b] p-4 text-sm leading-relaxed text-zinc-300 md:p-6 ${className ?? ""}`}
      {...props}
    />
  ),
  code: ({ node: _node, className, children, ...props }) => {
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
  hr: ({ node: _node, className, ...props }) => <hr className={`my-12 border-zinc-800 ${className ?? ""}`} {...props} />,
};

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

      <section className="relative overflow-hidden border-b border-zinc-800 px-6 py-16 md:px-12 md:py-24">
        <div className="pointer-events-auto absolute inset-0 opacity-[0.85]">
          <FaultyTerminal
            className="h-full w-full"
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.25}
            timeScale={0.8}
            scanlineIntensity={0.9}
            glitchAmount={1.1}
            flickerAmount={1}
            noiseAmp={0.85}
            chromaticAberration={0}
            dither={0.25}
            curvature={0.1}
            tint="#7c83ff"
            mouseReact
            mouseStrength={1.1}
            pageLoadAnimation
            brightness={0.95}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#09090b]/35 via-[#09090b]/58 to-[#09090b]/88" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="mb-8 font-mono text-xs uppercase tracking-widest text-zinc-400">{doc.fileName}</div>
            <h1 className="text-5xl font-medium leading-[0.95] tracking-tighter md:text-7xl">{doc.title}</h1>
          </div>
          <p className="max-w-md text-lg leading-relaxed text-zinc-300 lg:col-span-4 lg:self-end">{doc.description}</p>
        </div>
      </section>

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
    </main>
  );
}

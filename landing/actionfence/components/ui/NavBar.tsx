"use client";

import { useState } from "react";

export default function NavBar() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install actionfence");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-wrap md:flex-nowrap items-center justify-between px-6 md:px-12 py-6 mix-blend-difference text-white gap-y-4">
      <div className="flex w-full md:w-auto items-center justify-between">
        <div className="text-xl font-medium tracking-tight">
          ActionFence
        </div>
        <button
          onClick={handleCopy}
          className="text-sm font-mono hover:opacity-50 transition-opacity md:hidden outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
        >
          {copied ? "[ COPIED ]" : "[ npm install ]"}
        </button>
      </div>

      <nav className="flex w-full md:w-auto overflow-x-auto items-center gap-6 md:gap-12 text-sm font-medium pb-1 md:pb-0 scrollbar-none">
        <a href="#features" className="hover:opacity-50 transition-opacity whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-zinc-400">Features</a>
        <a href="https://github.com/saifeldeen911/actionfence#readme" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-zinc-400">Docs</a>
        <a href="#examples" className="hover:opacity-50 transition-opacity whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-zinc-400">Examples</a>
        <a href="https://github.com/saifeldeen911/actionfence" target="_blank" rel="noopener noreferrer" className="hover:opacity-50 transition-opacity whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-zinc-400">GitHub</a>
      </nav>

      <button
        onClick={handleCopy}
        className="hidden md:block text-sm font-mono hover:opacity-50 transition-opacity outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
      >
        {copied ? "[ COPIED ]" : "[ npm install ]"}
      </button>
    </header>
  );
}
